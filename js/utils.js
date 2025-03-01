export function setupEventListeners(state) {
    // Remove the retakeButton event listener from here since it's handled in countdown.js
    const nextButton = document.getElementById('nextButton');
    const photoCountElement = document.getElementById('photoCount');

    nextButton.addEventListener('click', () => {
        if (state.photos.length > 0) {
            localStorage.setItem('photobooth_photos', JSON.stringify(state.photos));
            window.location.href = 'preview.html';
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
