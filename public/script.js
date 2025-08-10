// Global variables
let currentStep = 1;
let studentData = null;
let selectedCover = null;
let fullscreenOverlay = null;

// DOM elements
const steps = document.querySelectorAll('.step');
const studentIdInput = document.getElementById('student-id');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize image fullscreen functionality
function initImageFullscreen() {
    // Create fullscreen overlay if it doesn't exist
    fullscreenOverlay = document.createElement('div');
    fullscreenOverlay.className = 'fullscreen-overlay';
    fullscreenOverlay.innerHTML = `
        <div class="fullscreen-container">
            <button class="nav-btn prev">❮</button>
            <img src="" alt="Fullscreen Image" class="fullscreen-image">
            <button class="nav-btn next">❯</button>
            <button class="close-fullscreen" aria-label="Close">×</button>
            <div class="loading">กำลังโหลด...</div>
        </div>
    `;
    document.body.appendChild(fullscreenOverlay);
    
    // Get elements
    const fullscreenImg = fullscreenOverlay.querySelector('.fullscreen-image');
    const closeBtn = fullscreenOverlay.querySelector('.close-fullscreen');
    const prevBtn = fullscreenOverlay.querySelector('.prev');
    const nextBtn = fullscreenOverlay.querySelector('.next');
    const loadingIndicator = fullscreenOverlay.querySelector('.loading');
    
    let currentImageIndex = 0;
    const totalImages = document.querySelectorAll('.candidate-image').length;
    
    // Close fullscreen
    function closeFullscreen() {
        fullscreenOverlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    // Show image in fullscreen
    function showFullscreenImage(imgElement) {
        const imgSrc = imgElement.src;
        const candidateCard = imgElement.closest('.candidate-card');
        currentImageIndex = parseInt(candidateCard.getAttribute('data-cover')) - 1;
        
        loadingIndicator.style.display = 'block';
        fullscreenImg.style.opacity = '0';
        
        // Load image
        const img = new Image();
        img.onload = function() {
            fullscreenImg.src = imgSrc;
            fullscreenImg.style.opacity = '1';
            loadingIndicator.style.display = 'none';
            updateNavButtons();
        };
        img.src = imgSrc;
        
        fullscreenOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Navigate to previous/next image
    function navigate(direction) {
        const newIndex = direction === 'prev' ? currentImageIndex - 1 : currentImageIndex + 1;
        if (newIndex >= 0 && newIndex < totalImages) {
            const nextImage = document.querySelector(`.candidate-card[data-cover="${newIndex + 1}"] img`);
            if (nextImage) {
                showFullscreenImage(nextImage);
            }
        }
    }
    
    // Update navigation buttons state
    function updateNavButtons() {
        prevBtn.style.visibility = currentImageIndex > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = currentImageIndex < totalImages - 1 ? 'visible' : 'hidden';
    }
    
    // Event listeners
    fullscreenOverlay.addEventListener('click', closeFullscreen);
    closeBtn.addEventListener('click', closeFullscreen);
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate('prev');
    });
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigate('next');
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!fullscreenOverlay.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                closeFullscreen();
                break;
            case 'ArrowLeft':
                navigate('prev');
                break;
            case 'ArrowRight':
                navigate('next');
                break;
        }
    });
    
    // Add double click events to all candidate images
    document.querySelectorAll('.candidate-image').forEach(imageContainer => {
        const img = imageContainer.querySelector('img');
        if (img) {
            // Double click for fullscreen
            imageContainer.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                showFullscreenImage(img);
            });
        }
    });
}

// Initialize cover selection
function initCoverSelection() {
    document.querySelectorAll('.candidate-card').forEach(card => {
        const selectBtn = card.querySelector('.select-btn');
        const coverId = card.getAttribute('data-cover');
        
        // Handle card click
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on the select button or zoom hint
            if (e.target !== selectBtn && !e.target.closest('.select-btn') && 
                !e.target.classList.contains('zoom-hint')) {
                selectCover(coverId);
            }
        });
        
        // Handle select button click
        if (selectBtn) {
            selectBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                selectCover(coverId);
            });
        }
    });
    
    // Initialize fullscreen functionality for images
    initImageFullscreen();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize image fullscreen functionality
    initImageFullscreen();
    
    // Initialize cover selection
    initCoverSelection();
    
    // Focus on student ID input
    studentIdInput.focus();
    
    // Add enter key listener for student ID input
    studentIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkStudentId();
        }
    });
    
    // Add enter key listener for student name input
    const studentNameInput = document.getElementById('student-name-input');
    if (studentNameInput) {
        studentNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                goToStep(3);
            }
        });
        
        // Add real-time validation
        studentNameInput.addEventListener('input', function() {
            const inputName = this.value.trim();
            const csvName = studentData ? studentData.name.replace(/^เด็ก(ชาย|หญิง)\s+/, '') : '';
            
            if (inputName.length > 0) {
                if (inputName.toLowerCase() === csvName.toLowerCase()) {
                    // ชื่อถูกต้อง
                    const nameErrorElement = document.getElementById('name-error');
                    nameErrorElement.textContent = '✓ ชื่อ-นามสกุลถูกต้อง';
                    nameErrorElement.style.display = 'block';
                    nameErrorElement.style.color = '#28a745';
                    nameErrorElement.style.background = '#d4edda';
                    nameErrorElement.style.border = '1px solid #c3e6cb';
                } else {
                    // ชื่อไม่ถูกต้อง
                    hideError('name-error');
                }
            } else {
                hideError('name-error');
            }
        });
    }
    
    // Add click listeners for book cover selection
    const coverOptions = document.querySelectorAll('.cover-option');
    coverOptions.forEach(option => {
        option.addEventListener('click', function() {
            selectCover(this.dataset.cover);
        });
    });
});

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Hide error message
function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

// Check student ID
async function checkStudentId() {
    const studentId = studentIdInput.value.trim();
    
    console.log('🔍 Checking student ID:', studentId);
    
    // Validate input
    if (!studentId) {
        showError('student-id-error', 'กรุณากรอกรหัสนักเรียน');
        return;
    }
    
    if (studentId.length !== 5) {
        showError('student-id-error', 'รหัสนักเรียนต้องมี 5 หลัก');
        return;
    }
    
    hideError('student-id-error');
    showLoading();
    
    try {
        console.log('📡 Making API call to:', `/api/student/${studentId}`);
        const response = await fetch(`/api/student/${studentId}`);
        console.log('📥 API response status:', response.status);
        
        const data = await response.json();
        console.log('📋 API response data:', data);
        
        if (response.ok) {
            studentData = data;
            console.log('✅ Student data set:', studentData);
            displayStudentInfo();
            goToStep(2);
        } else {
            if (response.status === 404) {
                showError('student-id-error', 'ไม่พบรหัสนักเรียนในระบบ');
            } else if (response.status === 400) {
                showError('student-id-error', 'รหัสนักเรียนนี้ได้ทำการโหวตแล้ว');
            } else {
                showError('student-id-error', 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            }
        }
    } catch (error) {
        console.error('❌ Error checking student ID:', error);
        showError('student-id-error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
        hideLoading();
    }
}

// Display student information
function displayStudentInfo() {
    if (!studentData) {
        console.log('❌ No student data available');
        return;
    }
    
    console.log('📝 Displaying student info:', studentData);
    
    document.getElementById('display-student-id').textContent = studentData.id;
    document.getElementById('display-grade').textContent = studentData.grade;
    document.getElementById('display-room').textContent = studentData.room;
    
    // แสดงชื่อจากข้อมูล CSV โดยไม่มีคำนำหน้า
    const fullName = studentData.name;
    console.log('🔍 Full name from CSV:', fullName);
    
    if (fullName) {
        // ลบคำนำหน้า "เด็กชาย", "เด็กหญิง", "นาย", "นางสาว" ออก
        const nameWithoutPrefix = fullName.replace(/^(เด็ก(ชาย|หญิง)|นาย|นางสาว)\s+/, '');
        console.log('✨ Name without prefix:', nameWithoutPrefix);
        
        const displayElement = document.getElementById('display-student-name');
        console.log('🎯 Display element:', displayElement);
        
        if (displayElement) {
            displayElement.textContent = nameWithoutPrefix;
            console.log('✅ Name displayed successfully');
        } else {
            console.log('❌ Display element not found');
        }
    } else {
        console.log('❌ No name data available');
    }
}

// Validate student name input
function validateStudentName() {
    const inputName = document.getElementById('student-name-input').value.trim();
    const csvName = studentData ? studentData.name : '';
    
    hideError('name-error');
    
    if (!inputName) {
        showError('name-error', 'กรุณากรอกชื่อ-นามสกุล');
        return false;
    }
    
    if (inputName.length < 4) {
        showError('name-error', 'ชื่อ-นามสกุลต้องมีอย่างน้อย 4 ตัวอักษร');
        return false;
    }
    
    // ลบคำนำหน้า "เด็กชาย", "เด็กหญิง", "นาย", "นางสาว" ออกจากชื่อใน CSV ก่อนเปรียบเทียบ
    const cleanCsvName = csvName.replace(/^(เด็ก(ชาย|หญิง)|นาย|นางสาว)\s+/, '');
    
    // ตรวจสอบว่าชื่อที่กรอกตรงกับข้อมูลใน CSV หรือไม่ (ไม่สนใจตัวพิมพ์เล็ก-ใหญ่)
    if (inputName.toLowerCase() !== cleanCsvName.toLowerCase()) {
        showError('name-error', 'ชื่อ-นามสกุลไม่ตรงกับข้อมูลในระบบ กรุณาตรวจสอบอีกครั้ง');
        return false;
    }
    
    // แสดงข้อความว่าชื่อถูกต้อง
    const nameErrorElement = document.getElementById('name-error');
    nameErrorElement.textContent = '✓ ชื่อ-นามสกุลถูกต้อง';
    nameErrorElement.style.display = 'block';
    nameErrorElement.style.color = '#28a745';
    nameErrorElement.style.background = '#d4edda';
    nameErrorElement.style.border = '1px solid #c3e6cb';
    
    return true;
}

// Navigate to home (first step)
function goToHome() {
    // Reset form and go to step 1
    resetForm();
}

// Navigate to specific step
function goToStep(stepNumber) {
    // Validate student name before going to step 3
    if (stepNumber === 3) {
        if (!validateStudentName()) {
            return;
        }
    }
    
    // Hide all steps
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Show target step
    const targetStep = document.getElementById(`step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = stepNumber;
    }
}

// Select book cover
function selectCover(coverId) {
    selectedCover = coverId;
    
    // Remove selected class from all cards
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
        const btn = card.querySelector('.select-btn');
        if (btn) {
            btn.textContent = 'เลือกปกนี้';
            btn.classList.remove('selected');
        }
    });
    
    // Add selected class to clicked card
    const selectedCard = document.querySelector(`.candidate-card[data-cover="${coverId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        const selectBtn = selectedCard.querySelector('.select-btn');
        if (selectBtn) {
            selectBtn.textContent = '✓ เลือกแล้ว';
            selectBtn.classList.add('selected');
        }
        
        document.getElementById('vote-btn').disabled = false;
        
        // Update preview
        updateSelectionPreview(coverId);
        
        // Scroll to show the selected card if it's not fully visible
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Update the selection preview
function updateSelectionPreview(coverId) {
    const previewContent = document.getElementById('preview-content');
    const selectedCard = document.querySelector(`.candidate-card[data-cover="${coverId}"]`);
    
    if (selectedCard) {
        const imgSrc = selectedCard.querySelector('img').src;
        const title = selectedCard.querySelector('h3').textContent;
        
        previewContent.innerHTML = `
            <div class="preview-selection">
                <img src="${imgSrc}" alt="${title}">
                <h4>${title}</h4>
                <p>หมายเลข ${coverId}</p>
                <div class="change-selection" onclick="document.querySelector('.candidate-card.selected')?.scrollIntoView({behavior: 'smooth', block: 'center'});">
                    เปลี่ยนการเลือก
                </div>
            </div>
        `;
        
        // Add click handler for the change selection button
        const changeBtn = previewContent.querySelector('.change-selection');
        if (changeBtn) {
            changeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const selected = document.querySelector('.candidate-card.selected');
                if (selected) {
                    selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
    }
}

// Reset selection preview
function resetSelectionPreview() {
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = '<p class="no-selection">ยังไม่ได้เลือกปกสมุด</p>';
}

// Submit vote
async function submitVote() {
    if (!selectedCover) {
        showError('vote-error', 'กรุณาเลือกปกสมุดที่คุณชื่นชอบ');
        // Scroll to the voting section
        document.getElementById('step-3').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    
    if (!studentData) {
        showError('vote-error', 'ข้อมูลนักเรียนไม่ถูกต้อง กรุณาเริ่มใหม่');
        return;
    }
    
    // ตรวจสอบชื่ออีกครั้งก่อนส่งโหวต
    if (!validateStudentName()) {
        return;
    }
    
    showLoading();
    hideError('vote-error');
    
    const studentName = document.getElementById('student-name-input').value.trim();
    
    const voteData = {
        studentId: studentData.id,
        studentName: studentName,
        grade: studentData.grade,
        room: studentData.room,
        bookCover: selectedCover,
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(voteData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            displayVoteSummary();
            goToSuccessStep();
        } else {
            showError('vote-error', result.error || 'เกิดข้อผิดพลาดในการบันทึกโหวต');
        }
    } catch (error) {
        console.error('Error submitting vote:', error);
        showError('vote-error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
    } finally {
        hideLoading();
    }
}

// Display vote summary
function displayVoteSummary() {
    const summaryContent = document.getElementById('vote-summary-content');
    const selectedOption = document.querySelector(`[data-cover="${selectedCover}"]`);
    const coverName = selectedOption ? selectedOption.querySelector('h3').textContent : `ปกสมุดที่ ${selectedCover}`;
    const studentName = document.getElementById('student-name-input').value.trim();
    
    summaryContent.innerHTML = `
        <div class="summary-item">
            <strong>นักเรียน:</strong> ${studentName}
        </div>
        <div class="summary-item">
            <strong>ชั้น:</strong> ${studentData.grade}/${studentData.room}
        </div>
        <div class="summary-item">
            <strong>ปกที่เลือก:</strong> ${coverName}
        </div>
        <div class="summary-item">
            <strong>เวลา:</strong> ${new Date().toLocaleString('th-TH')}
        </div>
    `;
}

// Navigate to success step
function goToSuccessStep() {
    steps.forEach(step => {
        step.classList.remove('active');
    });
    
    document.getElementById('success-step').classList.add('active');
}

// Reset form for new vote
function resetForm() {
    // Reset variables
    currentStep = 1;
    studentData = null;
    selectedCover = null;
    
    // Clear form inputs
    studentIdInput.value = '';
    document.getElementById('student-name-input').value = '';
    
    // Remove cover selections
    document.querySelectorAll('.cover-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Disable vote button
    document.getElementById('vote-btn').disabled = true;
    
    // Hide all error messages
    hideError('student-id-error');
    hideError('vote-error');
    hideError('name-error');
    
    // Clear displayed student info
    const displayStudentId = document.getElementById('display-student-id');
    const displayGrade = document.getElementById('display-grade');
    const displayRoom = document.getElementById('display-room');
    
    if (displayStudentId) displayStudentId.textContent = '';
    if (displayGrade) displayGrade.textContent = '';
    if (displayRoom) displayRoom.textContent = '';
    
    // Reset selection preview
    resetSelectionPreview();
    
    // Go back to step 1
    goToStep(1);
    
    // Reset the selected cover
    const selectedCard = document.querySelector('.candidate-card.selected');
    if (selectedCard) {
        selectedCard.classList.remove('selected');
    }
    
    // Enable vote button
    document.getElementById('vote-btn').disabled = true;
    
    // Focus on student ID input
    setTimeout(() => {
        studentIdInput.focus();
    }, 100);
}