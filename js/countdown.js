import { updateThumbnails, updateButtons } from './utils.js';

export function initializeCountdown(state) {
    const countdownElement = document.getElementById('countdown');
    const countdownText = countdownElement.querySelector('span');
    const flashElement = document.getElementById('flash');
    const photoCountElement = document.getElementById('photoCount');
    const maxPhotosElement = document.getElementById('maxPhotos');
    const maxPhotosPopup = document.getElementById('maxPhotosPopup');
    
    // Initialize countdown state
    state.isCountingDown = false;
    
    // Update max photos to 4
    state.maxPhotos = 4;
    maxPhotosElement.textContent = state.maxPhotos;

    function triggerFlash() {
        flashElement.classList.remove('hidden');
        flashElement.classList.add('active');
        flashElement.addEventListener('animationend', () => {
            flashElement.classList.remove('active');
            flashElement.classList.add('hidden');
        }, { once: true });
    }

    function showMaxPhotosPopup() {
        maxPhotosPopup.classList.remove('hidden');
        maxPhotosPopup.classList.add('flex');
        
        // Add shake animation to the popup
        const popupContent = maxPhotosPopup.querySelector('div');
        popupContent.classList.add('shake');
        
        // Remove animation class after it completes
        setTimeout(() => {
            popupContent.classList.remove('shake');
        }, 500);
        
        // Setup close handlers
        const closeBtn = maxPhotosPopup.querySelector('button');
        const okBtn = document.getElementById('maxPhotosOkBtn');
        
        function hidePopup() {
            maxPhotosPopup.classList.remove('flex');
            maxPhotosPopup.classList.add('hidden');
        }
        
        closeBtn.addEventListener('click', hidePopup);
        okBtn.addEventListener('click', hidePopup);
        
        // Close on click outside
        maxPhotosPopup.addEventListener('click', (e) => {
            if (e.target === maxPhotosPopup) hidePopup();
        });
        
        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                hidePopup();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    state.startCountdown = async () => {
        if (state.isCountingDown) return false;
        
        // Check if max photos reached before starting countdown
        if (state.photos.length >= state.maxPhotos) {
            showMaxPhotosPopup();
            return false;
        }
        
        state.isCountingDown = true;
        countdownElement.classList.remove('hidden');
        
        for (let i = 3; i > 0; i--) {
            countdownText.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        countdownElement.classList.add('hidden');
        triggerFlash();
        state.isCountingDown = false;
        return true;
    };

    // Setup capture functionality
    const captureButton = document.getElementById('captureButton');
    
    let currentPhotoIndex = -1; // Add this variable to track current photo

    function capturePhoto() {
        if (state.photos.length >= state.maxPhotos) {
            showMaxPhotosPopup();
            return;
        }
        
        const canvas = document.getElementById('webcam-canvas');
        const dataURL = canvas.toDataURL('image/png');
        state.photos.push(dataURL);
        
        // Update photo counter
        photoCountElement.textContent = state.photos.length;
        
        // Update UI
        const thumbnailsDiv = document.getElementById('thumbnails');
        const thumbnailContainer = document.getElementById('thumbnailContainer');

        if (state.photos.length <= 0) {
            thumbnailContainer.classList.add('hidden');
        } else {
            thumbnailContainer.classList.remove('hidden');
        }

        thumbnailsDiv.innerHTML = '';
        state.photos.forEach((src, index) => {
            const img = document.createElement('img');
            img.src = src;
            img.classList.add(
                'border-2', 
                'border-sage', 
                'hover:border-pink', 
                'transition-colors',
                'cursor-pointer'
            );
            img.addEventListener('click', () => window.showPreview(index));
            thumbnailsDiv.appendChild(img);
        });

        // Update buttons state
        const retakeButton = document.getElementById('retakeButton');
        const nextButton = document.getElementById('nextButton');
        retakeButton.disabled = false;
        nextButton.disabled = false;

        // Update capture button text
        updateCaptureButtonText();
    }

    function updateCaptureButtonText() {
        const remainingPhotos = state.maxPhotos - state.photos.length;
        const captureButton = document.getElementById('captureButton');
        
        if (remainingPhotos === state.maxPhotos) {
            captureButton.innerHTML = '<i class="fas fa-camera"></i>';
        } else if (remainingPhotos > 0) {
            captureButton.innerHTML = `<i class="fas fa-camera"></i><span class="ml-2">${remainingPhotos} More Photo${remainingPhotos > 1 ? 's' : ''}</span>`;
        } else {
            captureButton.innerHTML = '<i class="fas fa-camera"></i>';
        }
    }

    // Add hidePreview function locally since it's specific to this module
    function hidePreview() {
        const previewPopup = document.getElementById('previewPopup');
        previewPopup.classList.remove('flex');
        previewPopup.classList.add('hidden');
        currentPhotoIndex = -1;
    }

    // Update delete functionality to also update capture button text
    document.getElementById('deletePhoto').addEventListener('click', () => {
        if (currentPhotoIndex > -1) {
            state.photos.splice(currentPhotoIndex, 1);
            updateThumbnails(state.photos);
            updateButtons(state);
            photoCountElement.textContent = state.photos.length;
            hidePreview();
            updateCaptureButtonText();
        }
    });

    // Update retake button to also update capture button text
    document.getElementById('retakeButton').addEventListener('click', () => {
        if (state.photos.length > 0) {
            // Remove only last photo
            state.photos.pop();
            updateThumbnails(state.photos);
            updateButtons(state);
            photoCountElement.textContent = state.photos.length;
            updateCaptureButtonText();
        }
    });

    // Initialize capture button text
    updateCaptureButtonText();

    // Add auto-capture sequence functionality
    state.startAutoSequence = async () => {
        if (state.isCountingDown) return;
        
        // Calculate remaining photos needed
        const remainingPhotos = state.maxPhotos - state.photos.length;
        
        if (remainingPhotos <= 0) {
            showMaxPhotosPopup();
            return;
        }
        
        // Take remaining number of photos in sequence
        for (let i = 0; i < remainingPhotos; i++) {
            const countdownComplete = await state.startCountdown();
            if (countdownComplete) {
                capturePhoto();
                if (i < remainingPhotos - 1) {
                    // Wait 2 seconds between photos
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
    };

    // Modify capture button handler for auto sequence
    captureButton.addEventListener('click', () => {
        if (state.isCountingDown) return;
        if (state.photos.length >= state.maxPhotos) {
            showMaxPhotosPopup();
            return;
        }
        state.startAutoSequence();
    });
    
    // Update the button text to reflect new behavior
    captureButton.innerHTML = '<i class="fas fa-camera"></i>';
}
