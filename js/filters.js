export function initializeFilters(state, ctx) {
    const filterSelect = document.getElementById('filterSelect');
    
    filterSelect.addEventListener('change', () => {
        state.filter = filterSelect.value;
    });
}

export function applyFilter(pixels, filter) {
    switch (filter) {
        case 'sepia':
            return applySepia(pixels);
        case 'grayscale':
            return applyGrayscale(pixels);
        case 'vintage':
            return applyVintage(pixels);
        case 'warm':
            return applyWarm(pixels);
        case 'cool':
            return applyCool(pixels);
        case 'dramatic':
            return applyDramatic(pixels);
        case 'cinema':
            return applyCinema(pixels);
        default:
            return pixels;
    }
}

function applySepia(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
        pixels[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
        pixels[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
    }
    return pixels;
}

function applyGrayscale(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
    }
    return pixels;
}

function applyVintage(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] *= 1.2; // Increase red
        pixels[i + 2] *= 0.8; // Decrease blue
        pixels[i] = Math.min(255, pixels[i]);
    }
    return pixels;
}

function applyWarm(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, pixels[i] * 1.1); // More red
        pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.05); // Slightly more green
    }
    return pixels;
}

function applyCool(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i + 2] = Math.min(255, pixels[i + 2] * 1.2); // More blue
        pixels[i] *= 0.9; // Less red
    }
    return pixels;
}

function applyDramatic(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.min(255, pixels[i] * 1.4); // High contrast
        pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.3);
        pixels[i + 2] = Math.min(255, pixels[i + 2] * 1.2);
    }
    return pixels;
}

function applyCinema(pixels) {
    for (let i = 0; i < pixels.length; i += 4) {
        // Cinema filter: higher contrast, warmer tones, slightly darker
        pixels[i] = Math.min(255, (pixels[i] * 1.2) - 10); // Red
        pixels[i + 1] = Math.min(255, (pixels[i + 1] * 1.1) - 10); // Green
        pixels[i + 2] = Math.min(255, (pixels[i + 2] * 0.9) - 10); // Blue
    }
    return pixels;
}
