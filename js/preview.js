// Load captured images
const capturedImages = JSON.parse(localStorage.getItem("photobooth_photos")) || [];
if (!capturedImages || capturedImages.length === 0) {
    alert("No photos found. Redirecting to capture page.");
    window.location.href = "index.html";
}

// Initialize canvas and UI elements
const canvas = document.getElementById("stripCanvas");
const ctx = canvas.getContext("2d");

// Background controls
const backgroundType = document.getElementById("backgroundType");
const solidControls = document.getElementById("solidControls");
const solidColor = document.getElementById("solidColor");
const gradientControls = document.getElementById("gradientControls");
const gradientColor1 = document.getElementById("gradientColor1");
const gradientColor2 = document.getElementById("gradientColor2");
const gradientAngle = document.getElementById("gradientAngle");
const angleValue = document.getElementById("angleValue");

// Pattern controls
const patternType = document.getElementById("patternType");
const patternControls = document.getElementById("patternControls");
const patternSize = document.getElementById("patternSize");
const sizeValue = document.getElementById("sizeValue");
const patternSpacing = document.getElementById("patternSpacing");
const spacingValue = document.getElementById("spacingValue");
const emojiInput = document.getElementById("emojiInput");
const customEmoji = document.getElementById("customEmoji");
const imageInput = document.getElementById("imageInput");
const customImage = document.getElementById("customImage");

// Other controls
const stickerSelect = document.getElementById("stickerSelect");
const downloadButton = document.getElementById("downloadButton");
const backButton = document.getElementById("backButton");

// Add mobile customize panel toggle
const customizeToggle = document.getElementById("customizeToggle");
const customizePanel = document.querySelector(".customize-panel");

customizeToggle.addEventListener("click", () => {
    customizePanel.classList.toggle("open");
    customizeToggle.classList.toggle("active");
});

// Close panel when clicking outside
document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
        const isClickInsidePanel = customizePanel.contains(e.target);
        const isClickOnToggle = customizeToggle.contains(e.target);
        
        if (!isClickInsidePanel && !isClickOnToggle && customizePanel.classList.contains("open")) {
            customizePanel.classList.remove("open");
            customizeToggle.classList.remove("active");
        }
    }
});

// State variables
let selectedFrame = "none";
let patternScale = 50;
let customImageData = null;

// Predefined emoji patterns
const emojiPatterns = {
    hearts: { emoji: '💗', spacing: 1.2 },
    stars: { emoji: '⭐', spacing: 1.5 },
    flowers: { emoji: '🌸', spacing: 1.3 }
};

// Sticker configuration
const stickerImages = {
    fish1: "assets/images/frame/fish/1.png",
    fish2: "assets/images/frame/fish/2.png",
    fish3: "assets/images/frame/fish/3.png"
};

function drawSticker(ctx, x, y, type, stickerWidth = 50, stickerHeight = 40) {
    if (type === "fish") {
        const img = new Image();
        img.src = stickerImages.fish1;
        img.onload = () => ctx.drawImage(img, x, y, stickerWidth, stickerHeight);
    } else if (type === "cute") {
        ctx.font = "40px sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText("🐱", x, y);
    }
}

const frames = {
    none: {
        draw: () => {} // No overlay
    },
    fish: {
        draw: (ctx, x, y, width, height) => {
            const positions = [
                [11, 5], [-18, 95], [width - 160, 10], [width - 1, 50],
                [120, height - 20], [20, height - 20], [width - 125, height - 5],
                [width - 10, height - 45]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, x + px, y + py, 'fish'));
        }
    },
    cute: {
        draw: (ctx, x, y, width, height) => {
            const emojis = [
                ["🐱", 20, 10], ["🐶", width - 50, 20],
                ["🐰", 20, height - 40], ["🐻", width - 50, height - 40]
            ];
            ctx.font = "30px sans-serif";
            ctx.textBaseline = "top";
            emojis.forEach(([emoji, px, py]) => ctx.fillText(emoji, x + px, y + py));
        }
    }
};

// Add a debounce utility function
function debounce(func, wait) {
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

// Store preloaded images
const preloadedImages = [];

// Create a function to preload all images at once
function preloadImages() {
    return new Promise(resolve => {
        let imagesLoaded = 0;
        capturedImages.forEach((imageSrc, index) => {
            const img = new Image();
            img.onload = () => {
                preloadedImages[index] = img;
                imagesLoaded++;
                if (imagesLoaded === capturedImages.length) {
                    resolve();
                }
            };
            img.src = imageSrc;
        });
    });
}

// Split the photo strip generation into layers for smoother updates
async function generatePhotoStrip(redrawBackground = true) {
    const imgWidth = 400;
    const imgHeight = 300;
    const borderSize = 40;
    const photoSpacing = 20;
    const textHeight = 50;
    const numPhotos = capturedImages.length;
    const totalHeight = (imgHeight * numPhotos) + (photoSpacing * (numPhotos - 1)) + (borderSize * 2) + textHeight;

    // Only resize canvas when necessary
    if (canvas.width !== imgWidth + borderSize * 2 || canvas.height !== totalHeight) {
        canvas.width = imgWidth + borderSize * 2;
        canvas.height = totalHeight;
        // Force full redraw when canvas size changes
        redrawBackground = true;
    }

    // Step 1: Draw or update background
    if (redrawBackground) {
        if (backgroundType.value === "gradient") {
            ctx.fillStyle = createGradient();
        } else {
            ctx.fillStyle = solidColor.value;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply pattern overlay if needed
        await drawPatternIfNeeded();
    }

    // Step 2: Draw photos on top of background
    // Ensure preloadedImages are available before drawing
    if (preloadedImages.length !== capturedImages.length) {
        await preloadImages();
    }

    preloadedImages.forEach((img, index) => {
        const yOffset = borderSize + (imgHeight + photoSpacing) * index;
        drawPhoto(img, borderSize, yOffset, imgWidth, imgHeight);
        
        if (frames[selectedFrame]) {
            frames[selectedFrame].draw(ctx, borderSize, yOffset, imgWidth, imgHeight);
        }
    });

    // Step 3: Draw copyright and timestamp
    drawTimestampAndCopyright();

    return true;
}

// Extract pattern drawing to a separate async function
async function drawPatternIfNeeded() {
    if (patternType.value === "none") return;
    
    const spacing = parseInt(patternSpacing.value) / 100;
    
    if (patternType.value === "custom-emoji" && customEmoji.value) {
        const pattern = createEmojiPattern(
            customEmoji.value,
            patternScale,
            spacing
        );
        drawPatternOverlay(pattern);
    } 
    else if (patternType.value === "custom-image" && customImageData) {
        await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const patternCanvas = document.createElement('canvas');
                patternCanvas.width = patternScale;
                patternCanvas.height = patternScale;
                const patternCtx = patternCanvas.getContext('2d');
                patternCtx.drawImage(img, 0, 0, patternScale, patternScale);
                
                const pattern = ctx.createPattern(patternCanvas, "repeat");
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1.0;
                resolve();
            };
            img.src = customImageData;
        });
    } 
    else if (emojiPatterns[patternType.value]) {
        const pattern = createEmojiPattern(
            emojiPatterns[patternType.value].emoji,
            patternScale,
            spacing
        );
        drawPatternOverlay(pattern);
    }
}

// Modify how pattern overlay is drawn
function drawPatternOverlay(patternCanvas) {
    const pattern = ctx.createPattern(patternCanvas, "repeat");
    ctx.globalAlpha = 0.5; // Add some transparency to the pattern
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
}

// Replace original fillBackground function with the new separated approach 
// (keeping it for compatibility but making it use the new approach)
function fillBackground(callback) {
    generatePhotoStrip().then(callback);
}

function drawPhoto(img, x, y, targetWidth, targetHeight) {
    const imageRatio = img.width / img.height;
    const targetRatio = targetWidth / targetHeight;
    let sourceWidth = img.width;
    let sourceHeight = img.height;
    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > targetRatio) {
        sourceWidth = img.height * targetRatio;
        sourceX = (img.width - sourceWidth) / 2;
    } else {
        sourceHeight = img.width / targetRatio;
        sourceY = (img.height - sourceHeight) / 2;
    }

    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight);
}

// Update createEmojiPattern function to handle transparency correctly
function createEmojiPattern(emoji, size, spacing = 1.2) {
    const canvas = document.createElement('canvas');
    const patternSize = size * spacing;
    canvas.width = patternSize;
    canvas.height = patternSize;
    const ctx = canvas.getContext('2d');

    // Clear background (make it transparent)
    ctx.clearRect(0, 0, patternSize, patternSize);

    // Draw emoji
    ctx.font = `${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, patternSize/2, patternSize/2);

    return canvas;
}

// Update drawCustomImagePattern function to use callback
function drawCustomImagePattern(imageUrl, size, callback) {
    const img = new Image();
    img.onload = () => {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = size;
        patternCanvas.height = size;
        const patternCtx = patternCanvas.getContext('2d');
        patternCtx.drawImage(img, 0, 0, size, size);
        
        const pattern = ctx.createPattern(patternCanvas, "repeat");
        ctx.globalAlpha = 0.5; // Add some transparency to the pattern
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
        if (callback) callback();
    };
    img.src = imageUrl;
}

function createGradient() {
    const w = canvas.width;
    const h = canvas.height;
    const angle = parseInt(gradientAngle.value) * Math.PI / 180;
    
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.max(w, h);
    const startX = centerX - Math.cos(angle) * radius;
    const startY = centerY - Math.sin(angle) * radius;
    const endX = centerX + Math.cos(angle) * radius;
    const endY = centerY + Math.sin(angle) * radius;
    
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, gradientColor1.value);
    gradient.addColorStop(1, gradientColor2.value);
    return gradient;
}

function drawTimestampAndCopyright() {
    const now = new Date();
    // const timestamp = now.toLocaleDateString('en-US', {
    //     month: '2-digit',
    //     day: '2-digit',
    //     year: 'numeric'
    // }) + '  ' + now.toLocaleTimeString('en-US', {
    //     hour: '2-digit',
    //     minute: '2-digit',
    //     hour12: true
    // });
    
    ctx.fillStyle = "#000000";
    ctx.font = "30pt Nunito";
    ctx.textAlign = "center";
    ctx.fillText("🐰⚡", canvas.width / 2, canvas.height - 30);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = "12pt Nunito";
    ctx.fillText("© 2025", canvas.width - 40, canvas.height - 20);
}

// Update canvas size handling
function updateCanvasSize() {
    const container = document.querySelector('.preview-section');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate appropriate canvas size while maintaining aspect ratio
    // ...add your canvas resize logic here if needed
}

// Add resize handler
window.addEventListener('resize', () => {
    updateCanvasSize();
    generatePhotoStrip();
});

// Use a debounced version for color inputs to prevent too frequent redraws
const debouncedGeneratePhotoStrip = debounce(() => {
    requestAnimationFrame(() => generatePhotoStrip(true));
}, 50);

// Initialize the photo strip once the page loads
window.addEventListener('DOMContentLoaded', async () => {
    await preloadImages();
    generatePhotoStrip();
});

// Update the event listeners to use the debounced version for color changes
[solidColor, gradientColor1, gradientColor2].forEach(el => {
    if (el) el.addEventListener("input", debouncedGeneratePhotoStrip);
});

// Other event listeners may not need debouncing
backgroundType.addEventListener("change", (e) => {
    solidControls.style.display = e.target.value === "solid" ? "block" : "none";
    gradientControls.style.display = e.target.value === "gradient" ? "block" : "none";
    generatePhotoStrip(true);
});

patternType.addEventListener("change", (e) => {
    patternControls.style.display = e.target.value !== "none" ? "block" : "none";
    emojiInput.style.display = e.target.value === "custom-emoji" ? "block" : "none";
    imageInput.style.display = e.target.value === "custom-image" ? "block" : "none";
    generatePhotoStrip(true);
});

customEmoji.addEventListener("input", () => generatePhotoStrip(true));

gradientAngle.addEventListener("input", (e) => {
    angleValue.textContent = `${e.target.value}°`;
    debouncedGeneratePhotoStrip();
});

patternSize.addEventListener("input", (e) => {
    patternScale = parseInt(e.target.value);
    sizeValue.textContent = `${patternScale}px`;
    debouncedGeneratePhotoStrip();
});

patternSpacing.addEventListener("input", (e) => {
    spacingValue.textContent = `${e.target.value}%`;
    debouncedGeneratePhotoStrip();
});

customImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            customImageData = e.target.result;
            generatePhotoStrip(true);
        };
        reader.readAsDataURL(file);
    }
});

stickerSelect.addEventListener("change", (e) => {
    selectedFrame = e.target.value;
    generatePhotoStrip(false);  // No need to redraw background
});

downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "photostrip_" + new Date().toISOString().slice(0, 10) + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
});

backButton.addEventListener("click", () => {
    localStorage.removeItem("photobooth_photos");
    window.location.href = "index.html";
});

// Initialize the photo strip
generatePhotoStrip();
