import { initializeCamera, setupCameraControls } from './camera.js';
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
    await initializeCamera(state);
    initializeFilters(state, ctx);
    state.overlay = await initializeOverlay(state, ctx);
    initializeCountdown(state);
    setupEventListeners(state);
    setupCameraControls(state);
}

// Start the application
document.addEventListener('DOMContentLoaded', initialize);

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

// Sync mobile and desktop controls
document.getElementById('filterSelect-mobile').addEventListener('change', (e) => {
  document.getElementById('filterSelect').value = e.target.value;
  document.getElementById('filterSelect').dispatchEvent(new Event('change'));
});

document.getElementById('flipButton-mobile').addEventListener('click', () => {
  document.getElementById('flipButton').click();
});

document.getElementById('toggleOverlay-mobile').addEventListener('click', () => {
  document.getElementById('overlayControls-mobile').classList.toggle('hidden');
  document.getElementById('toggleOverlay').click();
});

document.getElementById('scaleSlider-mobile').addEventListener('input', (e) => {
  document.getElementById('scaleSlider').value = e.target.value;
  document.getElementById('scaleSlider').dispatchEvent(new Event('input'));
  document.getElementById('scaleValue-mobile').textContent = e.target.value + '%';
});

document.getElementById('fitButton-mobile').addEventListener('click', () => {
  document.getElementById('fitButton').click();
});

document.getElementById('autoCropButton-mobile').addEventListener('click', () => {
  document.getElementById('autoCropButton').click();
});

document.getElementById('removeOverlay-mobile')?.addEventListener('click', () => {
  const overlay = document.querySelector('.overlay-image');
  if (overlay) {
    overlay.remove();
  }
  document.getElementById('overlayControls-mobile').classList.add('hidden');
  document.getElementById('toggleOverlay').click();
});

document.getElementById('rotateSlider-mobile').addEventListener('input', (e) => {
  document.getElementById('rotateSlider').value = e.target.value;
  document.getElementById('rotateSlider').dispatchEvent(new Event('input'));
  document.getElementById('rotateValue-mobile').textContent = `${e.target.value}°`;
});
