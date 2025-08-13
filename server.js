const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
// Configure static file serving with proper MIME types
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        }
    }
}));

app.use('/asset', express.static('asset', {
    setHeaders: (res, path) => {
        if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        }
    }
}));

app.use('/votepic', express.static('votepic', { 
    maxAge: '1d',
    setHeaders: (res, path) => {
        if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
            res.set('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// In-memory storage for votes and students
let votes = [];
let students = [];
let votedStudentIds = new Set();

// Load student data from CSV
function loadStudentData() {
  students = [];
  fs.createReadStream('idstudent.csv')
    .pipe(csv())
    .on('data', (row) => {
      const student = {
        id: row.UserID,
        name: row['ชื่อ - สกุล'],
        grade: row['ชั้นมัธยม'],
        room: row['ห้องเรียน']
      };
      students.push(student);
    })
    .on('end', () => {
      console.log(`✅ Loaded ${students.length} students`);
      // Show first few students for debugging
      console.log('📝 Sample student data:');
      students.slice(0, 3).forEach(s => {
        console.log(`   ID: ${s.id}, Name: ${s.name}, Grade: ${s.grade}, Room: ${s.room}`);
      });
      
      // Check if specific ID exists
      const testId = '20552';
      const foundStudent = students.find(s => s.id === testId);
      if (foundStudent) {
        console.log(`🔍 Found student ${testId}:`, foundStudent);
      } else {
        console.log(`❌ Student ID ${testId} NOT found in database`);
      }
    });
}

// Google Sheets setup (optional - can be configured later)
let sheets = null;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE)) {
  try {
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets configured successfully!');
  } catch (error) {
    console.log('❌ Google Sheets configuration error:', error.message);
    console.log('📝 Using local storage only');
  }
} else {
  console.log('📝 Google Sheets not configured, using local storage only');
}

// API Routes
app.get('/api/student/:id', (req, res) => {
  const studentId = req.params.id;
  const student = students.find(s => s.id === studentId);
  
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  if (votedStudentIds.has(studentId)) {
    return res.status(400).json({ error: 'Student has already voted' });
  }
  
  res.json(student);
});

app.post('/api/vote', async (req, res) => {
  const { studentId, studentName, grade, room, bookCover, timestamp } = req.body;
  
  // Check if student already voted
  if (votedStudentIds.has(studentId)) {
    return res.status(400).json({ error: 'Student has already voted' });
  }
  
  // Verify student exists
  const student = students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  
  const vote = {
    studentId,
    studentName,
    grade,
    room,
    bookCover,
    timestamp: timestamp || new Date().toISOString()
  };
  
  votes.push(vote);
  votedStudentIds.add(studentId);
  
  // Save to Google Sheets if configured
  if (sheets && SPREADSHEET_ID) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Votes!A:F',
        valueInputOption: 'RAW',
        resource: {
          values: [[vote.studentId, vote.studentName, vote.grade, vote.room, vote.bookCover, vote.timestamp]]
        }
      });
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
    }
  }
  
  // Emit real-time update to admin dashboard
  io.emit('voteUpdate', {
    totalVotes: votes.length,
    latestVote: vote,
    results: getVoteResults()
  });
  
  res.json({ success: true, message: 'Vote recorded successfully' });
});

app.get('/api/results', (req, res) => {
  res.json({
    totalVotes: votes.length,
    results: getVoteResults(),
    voters: votes
  });
});

function getVoteResults() {
  const results = {};
  votes.forEach(vote => {
    if (!results[vote.bookCover]) {
      results[vote.bookCover] = 0;
    }
    results[vote.bookCover]++;
  });
  return results;
}

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log('Admin connected');
  
  // Send current results to newly connected admin
  socket.emit('initialData', {
    totalVotes: votes.length,
    results: getVoteResults(),
    voters: votes
  });
  
  socket.on('disconnect', () => {
    console.log('Admin disconnected');
  });
});

// Load existing votes from Google Sheets
async function loadExistingVotes() {
  if (!sheets || !SPREADSHEET_ID) {
    console.log('📝 No Google Sheets configured, starting with empty votes');
    return;
  }
  
  try {
    console.log('🔄 Loading existing votes from Google Sheets...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Votes!A2:F', // Skip header row
    });
    
    const rows = response.data.values || [];
    
    // Clear existing data
    votes = [];
    votedStudentIds.clear();
    
    // Load votes from sheet
    rows.forEach(row => {
      if (row.length >= 6) {
        const vote = {
          studentId: row[0],
          studentName: row[1],
          grade: row[2],
          room: row[3],
          bookCover: row[4],
          timestamp: row[5]
        };
        votes.push(vote);
        votedStudentIds.add(vote.studentId);
      }
    });
    
    console.log(`✅ Loaded ${votes.length} existing votes from Google Sheets`);
    console.log(`🔒 ${votedStudentIds.size} students have already voted`);
    
  } catch (error) {
    console.log('⚠️ Could not load existing votes from Google Sheets:', error.message);
    console.log('📝 Starting with empty votes');
  }
}

// Load student data on startup
loadStudentData();

// Load existing votes on startup
loadExistingVotes();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Voting system: http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);
});
