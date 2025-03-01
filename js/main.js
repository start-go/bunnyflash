import { initializeCamera } from './camera.js';
import { initializeFilters } from './filters.js';
import { initializeOverlay } from './overlay.js';
import { initializeCountdown } from './countdown.js';
import { setupEventListeners } from './utils.js';

async function initialize() {
    const state = {
        photos: [],
        stream: null,
        videoElement: null,
        overlayImage: null,
        filter: 'none',
        isFlipped: false,
        maxPhotos: 4, // Update max photos to 4
        overlay: null,
        mobileMenuOpen: false // Add state to track menu open status
    };

    const canvas = document.getElementById('webcam-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize all modules
    await initializeCamera(state, canvas, ctx);
    initializeFilters(state, ctx);
    state.overlay = await initializeOverlay(state, ctx);
    initializeCountdown(state);
    setupEventListeners(state);
    
    // Setup mobile menu management
    setupMobileMenu(state);
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initialize();
});

// Separate function for mobile menu management
function setupMobileMenu(state) {
    const sideControls = document.querySelector('.side-controls');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    // Toggle menu open/closed
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        state.mobileMenuOpen = !state.mobileMenuOpen;
        sideControls.classList.toggle('open', state.mobileMenuOpen);
    });
    
    // Only close menu when clicking outside menu area and not on a button or interactive element
    document.addEventListener('click', (e) => {
        // Don't close if the menu is not open
        if (!state.mobileMenuOpen) return;
        
        // Don't close if clicking inside the menu
        if (sideControls.contains(e.target)) return;
        
        // Don't close if clicking on the toggle button (handled separately)
        if (mobileToggle.contains(e.target)) return;
        
        // Don't close if overlay processing is happening
        if (state.overlay && state.overlay.isProcessingOverlay) return;
        
        // Don't close if clicking on a button, input, select, or label
        const isInteractiveElement = 
            e.target.tagName === 'BUTTON' || 
            e.target.tagName === 'INPUT' || 
            e.target.tagName === 'SELECT' || 
            e.target.tagName === 'LABEL' ||
            // Also check if the click is on an element inside a button (like an icon)
            e.target.closest('button') !== null;
            
        if (isInteractiveElement) return;
        
        // Otherwise, close the menu
        state.mobileMenuOpen = false;
        sideControls.classList.remove('open');
    });
    
    // Also add a close button to the mobile menu if desired
    const closeButton = document.createElement('button');
    closeButton.className = 'absolute top-2 right-2 text-gray-500 hover:text-pink';
    closeButton.innerHTML = '<i class="fas fa-times text-xl"></i>';
    closeButton.addEventListener('click', () => {
        state.mobileMenuOpen = false;
        sideControls.classList.remove('open');
    });
    
    // Add the close button to the mobile menu
    sideControls.prepend(closeButton);
}

// Sync mobile and desktop controls (non-overlay related)
document.getElementById('filterSelect-mobile').addEventListener('change', (e) => {
  document.getElementById('filterSelect').value = e.target.value;
  document.getElementById('filterSelect').dispatchEvent(new Event('change'));
});

document.getElementById('flipButton-mobile').addEventListener('click', () => {
  document.getElementById('flipButton').click();
});