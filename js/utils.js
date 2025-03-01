export function setupEventListeners(state) {
    const nextButton = document.getElementById('nextButton');
    const photoCountElement = document.getElementById('photoCount');

    nextButton.addEventListener('click', async () => {
        if (state.photos.length > 0) {
            try {
                // Compress photos before storing
                const compressedPhotos = await Promise.all(state.photos.map(photo => {
                    return compressImage(photo, 0.7); // 70% quality
                }));
                
                localStorage.setItem('photobooth_photos', JSON.stringify(compressedPhotos));
                window.location.href = 'preview.html';
            } catch (error) {
                if (error.name === 'QuotaExceededError') {
                    alert('Storage limit exceeded. Please try with fewer photos or lower quality.');
                } else {
                    console.error('Storage error:', error);
                    alert('Unable to save photos. Please try again.');
                }
            }
        }
    });

    // Preview popup functionality
    const previewPopup = document.getElementById('previewPopup');
    const previewImage = document.getElementById('previewImage');
    let currentPhotoIndex = -1;

    window.showPreview = (index) => {
        currentPhotoIndex = index;
        previewImage.src = state.photos[index];
        previewPopup.classList.remove('hidden');
        previewPopup.classList.add('flex');
    };

    function hidePreview() {
        previewPopup.classList.remove('flex');
        previewPopup.classList.add('hidden');
        currentPhotoIndex = -1;
    }

    // Close button
    previewPopup.querySelector('button').addEventListener('click', hidePreview);

    // Click outside to close
    previewPopup.addEventListener('click', (e) => {
        if (e.target === previewPopup) hidePreview();
    });

    // Delete button
    document.getElementById('deletePhoto').addEventListener('click', () => {
        if (currentPhotoIndex > -1) {
            state.photos.splice(currentPhotoIndex, 1);
            updateThumbnails(state.photos);
            updateButtons(state);
            
            // Update photo counter
            photoCountElement.textContent = state.photos.length;
            
            hidePreview();
        }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hidePreview();
    });
}

export function updateThumbnails(photos) {
    const thumbnailsDiv = document.getElementById('thumbnails');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    
    // Hide the container if no photos
    if (photos.length <= 0) {
        thumbnailContainer.classList.add('hidden');
    } else {
        thumbnailContainer.classList.remove('hidden');
    }
    
    // Update thumbnails
    thumbnailsDiv.innerHTML = '';
    photos.forEach((src, index) => {
        const img = createThumbnail(src, index);
        thumbnailsDiv.appendChild(img);
    });
}

export function updateButtons(state) {
    const retakeButton = document.getElementById('retakeButton');
    const nextButton = document.getElementById('nextButton');
    const disabled = state.photos.length === 0;
    retakeButton.disabled = disabled;
    nextButton.disabled = disabled;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function createThumbnail(photoData, index) {
    const img = new Image();
    img.src = photoData;
    img.classList.add(
        'border-2', 
        'border-sage', 
        'hover:border-pink', 
        'transition-colors',
        'cursor-pointer'
    );
    img.addEventListener('click', () => window.showPreview(index));
    return img;
}

// Add this new function to compress images
function compressImage(base64String, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Convert to more efficient format and compress
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = base64String;
    });
}

export function capturePhoto(state) {
    const canvas = document.getElementById('webcam-canvas');
    // Reduce quality to 70% to save space
    return canvas.toDataURL('image/jpeg', 0.7);
}
