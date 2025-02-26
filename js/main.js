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
        maxPhotos: 5,
        overlay: null
    };

    const canvas = document.getElementById('webcam-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize all modules
    await initializeCamera(state, canvas, ctx);
    initializeFilters(state, ctx);
    state.overlay = await initializeOverlay(state, ctx);
    initializeCountdown(state);
    setupEventListeners(state);
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initialize();
});

// Mobile menu toggle
document.querySelector('.mobile-menu-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const sideControls = document.querySelector('.side-controls');
    sideControls.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    const sideControls = document.querySelector('.side-controls');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    if (!sideControls.contains(e.target) && !mobileToggle.contains(e.target)) {
        sideControls.classList.remove('open');
    }
});

// Sync mobile and desktop controls (non-overlay related)
document.getElementById('filterSelect-mobile').addEventListener('change', (e) => {
  document.getElementById('filterSelect').value = e.target.value;
  document.getElementById('filterSelect').dispatchEvent(new Event('change'));
});

document.getElementById('flipButton-mobile').addEventListener('click', () => {
  document.getElementById('flipButton').click();
});