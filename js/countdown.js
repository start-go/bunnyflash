export function initializeCountdown(state) {
    const countdownElement = document.getElementById('countdown');
    const countdownText = countdownElement.querySelector('span');
    const flashElement = document.getElementById('flash');
    const photoCountElement = document.getElementById('photoCount');
    const maxPhotosElement = document.getElementById('maxPhotos');
    const maxPhotosPopup = document.getElementById('maxPhotosPopup');
    
    // Initialize countdown state
    state.isCountingDown = false;
    
    // Set max photos in the UI
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
    }

    // Add click handler
    captureButton.addEventListener('click', async () => {
        if (state.isCountingDown) return;
        const countdownComplete = await state.startCountdown();
        if (countdownComplete) {
            capturePhoto();
        }
    });
}
