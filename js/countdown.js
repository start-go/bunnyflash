export function initializeCountdown(state) {
    const countdownElement = document.getElementById('countdown');
    const countdownText = countdownElement.querySelector('span');
    const flashElement = document.getElementById('flash');
    
    // Initialize countdown state
    state.isCountingDown = false;

    function triggerFlash() {
        flashElement.classList.remove('hidden');
        flashElement.classList.add('active');
        flashElement.addEventListener('animationend', () => {
            flashElement.classList.remove('active');
            flashElement.classList.add('hidden');
        }, { once: true });
    }

    state.startCountdown = async () => {
        if (state.isCountingDown) return false;
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
        if (state.photos.length >= state.maxPhotos) return;
        
        const canvas = document.getElementById('webcam-canvas');
        const dataURL = canvas.toDataURL('image/png');
        state.photos.push(dataURL);
        
        // Update UI
        const thumbnailsDiv = document.getElementById('thumbnails');
        thumbnailsDiv.innerHTML = '';
        state.photos.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
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
        if (state.photos.length >= state.maxPhotos || state.isCountingDown) return;
        const countdownComplete = await state.startCountdown();
        if (countdownComplete) {
            capturePhoto();
        }
    });
}
