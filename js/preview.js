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

// Add new variables after other control declarations
const imageControls = document.getElementById("imageControls");
const backgroundImage = document.getElementById("backgroundImage");
let backgroundImageData = null;

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

// Add resolution select handler after other DOM elements
const resolutionSelect = document.getElementById("resolutionSelect");

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
let patternScale = 50;
let customImageData = null;

// Predefined emoji patterns
const emojiPatterns = {
    hearts: { emoji: '💗', spacing: 1.2 },
    stars: { emoji: '⭐', spacing: 1.5 },
    flowers: { emoji: '🌸', spacing: 1.3 }
};

// Add available stickers
const stickerImages = {
    fish: {
        1: "assets/images/frame/fish/1.png",
        2: "assets/images/frame/fish/2.png",
        3: "assets/images/frame/fish/3.png"
    },
    combined: {
        // 18 images starting from 1
        1: "assets/images/frame/combined/1.png",
        2: "assets/images/frame/combined/2.png",
        3: "assets/images/frame/combined/3.png",
        4: "assets/images/frame/combined/4.png",
        5: "assets/images/frame/combined/5.png",
        6: "assets/images/frame/combined/6.png",
        7: "assets/images/frame/combined/7.png",
        8: "assets/images/frame/combined/8.png",
        9: "assets/images/frame/combined/9.png",
        10: "assets/images/frame/combined/10.png",
        11: "assets/images/frame/combined/11.png",
        12: "assets/images/frame/combined/12.png",
        13: "assets/images/frame/combined/13.png",
        14: "assets/images/frame/combined/14.png",
        15: "assets/images/frame/combined/15.png",
        16: "assets/images/frame/combined/16.png",
        17: "assets/images/frame/combined/17.png",
        18: "assets/images/frame/combined/18.png"
    },
    pink: {
        // 10 images starting from 0
        0: "assets/images/frame/pink/0.png",
        1: "assets/images/frame/pink/1.png",
        2: "assets/images/frame/pink/2.png",
        3: "assets/images/frame/pink/3.png",
        4: "assets/images/frame/pink/4.png",
        5: "assets/images/frame/pink/5.png",
        6: "assets/images/frame/pink/6.png",
        7: "assets/images/frame/pink/7.png",
        8: "assets/images/frame/pink/8.png",
        9: "assets/images/frame/pink/9.png"
    },
    redicon: {
        // 8 images starting from 0
        0: "assets/images/frame/redicon/0.png",
        1: "assets/images/frame/redicon/1.png",
        2: "assets/images/frame/redicon/2.png",
        3: "assets/images/frame/redicon/3.png",
        4: "assets/images/frame/redicon/4.png",
        5: "assets/images/frame/redicon/5.png",
        6: "assets/images/frame/redicon/6.png",
        7: "assets/images/frame/redicon/7.png"
    },
    sea: {
        // 8 images starting from 0
        0: "assets/images/frame/sea/0.png",
        1: "assets/images/frame/sea/1.png",
        2: "assets/images/frame/sea/2.png",
        3: "assets/images/frame/sea/3.png",
        4: "assets/images/frame/sea/4.png",
        5: "assets/images/frame/sea/5.png",
        6: "assets/images/frame/sea/6.png",
        7: "assets/images/frame/sea/7.png"
    },
    sonny: {
        // 4 images starting from 1
        1: "assets/images/frame/sony/1.png",
        2: "assets/images/frame/sony/2.png",
        3: "assets/images/frame/sony/3.png",
        4: "assets/images/frame/sony/4.png"
    },
};

const availableStickers = Object.keys(stickerImages);

// Add state variable for storing selected frame images
const selectedFrameImages = new Map(); // Store frame image selection for each photo

function addSticker(x, y, stickerType, stickerSize, photoIndex) {
    if (stickerType === "cute") {
        ctx.font = `${stickerSize}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText("🐱", x, y);
        return;
    }

    const stickerSet = stickerImages[stickerType];
    if (stickerSet) {
        // Generate a unique key for this sticker position
        const positionKey = `${photoIndex}_${Math.round(x)}_${Math.round(y)}`;
        
        // Check if we already have a selected image for this position
        if (!selectedFrameImages.has(positionKey)) {
            const keys = Object.keys(stickerSet);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            selectedFrameImages.set(positionKey, stickerSet[randomKey]);
        }

        const imgSrc = selectedFrameImages.get(positionKey);
        const img = new Image();
        img.src = imgSrc;
        img.onload = () => {
            let stickerWidth = stickerSize;
            let stickerHeight = stickerSize;
            
            // Maintain aspect ratio
            const aspectRatio = img.width / img.height;
            if (img.width > img.height) {
                stickerHeight = stickerWidth / aspectRatio;
            } else {
                stickerWidth = stickerHeight * aspectRatio;
            }
            
            ctx.drawImage(img, x - stickerWidth / 2, y - stickerHeight / 2, stickerWidth, stickerHeight);
        };
    }
}

// Add tap event listener to the canvas
let selectedSticker = null;

// Remove tap event listener
// canvas.addEventListener("click", handleStickerPlacement);
// canvas.addEventListener("touchstart", handleStickerPlacement);

// Populate the sticker panel
// const stickerPanel = document.getElementById("stickerPanel");
// availableStickers.forEach(stickerType => {
//     const btn = document.createElement("button");
//     btn.textContent = stickerType;
//     btn.addEventListener("click", () => {
//         selectedSticker = stickerType;
//     });
//     stickerPanel.appendChild(btn);
// });

// Add sticker selection dropdown
availableStickers.forEach(stickerType => {
    const option = document.createElement("option");
    option.value = stickerType;
    option.textContent = stickerType.charAt(0).toUpperCase() + stickerType.slice(1);
    stickerSelect.appendChild(option);
});

stickerSelect.addEventListener("change", (e) => {
    selectedSticker = e.target.value;
    selectedFrameImages.clear(); // Clear stored frames when changing sticker type
    generatePhotoStrip(true);
});

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
    // Get resolution multiplier from the selector
    const resolutionMultiplier = parseInt(resolutionSelect.value) || 2;
    
    // Base dimensions (at 1x resolution)
    const baseImgWidth = 400;
    const baseImgHeight = 300;
    const baseBorderSize = 40;
    const basePhotoSpacing = 20;
    const baseTextHeight = 50;
    
    // Apply resolution multiplier to dimensions
    const imgWidth = baseImgWidth * resolutionMultiplier;
    const imgHeight = baseImgHeight * resolutionMultiplier;
    const borderSize = baseBorderSize * resolutionMultiplier;
    const photoSpacing = basePhotoSpacing * resolutionMultiplier;
    const textHeight = baseTextHeight * resolutionMultiplier;
    const numPhotos = capturedImages.length;
    const totalHeight = (imgHeight * numPhotos) + (photoSpacing * (numPhotos - 1)) + (borderSize * 2) + textHeight;
    
    // Set canvas display size (visual size) vs actual resolution
    const canvasWidth = imgWidth + borderSize * 2;
    const canvasHeight = totalHeight;
    
    // Only resize canvas when necessary
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        // Set the actual resolution (higher)
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        
        // Calculate display dimensions to maintain proper aspect ratio
        const container = document.querySelector('.preview-section');
        const containerWidth = container.clientWidth;
        
        // Calculate display width based on container constraints
        const displayWidth = Math.min(containerWidth, baseImgWidth + (baseBorderSize * 2));
        
        // Calculate display height to maintain aspect ratio
        const aspectRatio = canvasHeight / canvasWidth;
        const displayHeight = displayWidth * aspectRatio;
        
        // Set the display size while maintaining aspect ratio
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        
        // Force full redraw when canvas size changes
        redrawBackground = true;
    }

    // Store the current resolution multiplier as a data attribute for other functions to access
    canvas.dataset.resolutionMultiplier = resolutionMultiplier;

    // Step 1: Draw or update background
    if (redrawBackground) {
        if (backgroundType.value === "image" && backgroundImageData) {
            await drawBackgroundImage();
        } else if (backgroundType.value === "gradient") {
            ctx.fillStyle = createGradient();
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = solidColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Apply pattern overlay if needed
        await drawPatternIfNeeded();
    }

    // Step 2: Draw photos on top of background
    // Ensure preloadedImages are available before drawing
    if (preloadedImages.length !== capturedImages.length) {
        await preloadImages();
    }

    // Always clear the previous photos and redraw them
    // This ensures no artifacts from previous stickers remain
    preloadedImages.forEach((img, index) => {
        const yOffset = borderSize + (imgHeight + photoSpacing) * index;
        
        // Clear the area where the photo will be placed to remove any previous stickers
        ctx.save();
        if (!redrawBackground) {
            // Only need to clear the photo area if not redrawing the entire background
            ctx.clearRect(borderSize, yOffset, imgWidth, imgHeight);
            
            // Redraw the background for this photo area
            if (backgroundType.value === "gradient") {
                const gradient = createGradient();
                ctx.fillStyle = gradient;
                ctx.fillRect(borderSize, yOffset, imgWidth, imgHeight);
            } else {
                ctx.fillStyle = solidColor.value;
                ctx.fillRect(borderSize, yOffset, imgWidth, imgHeight);
            }
            
            // Reapply pattern only to this area if needed
            if (patternType.value !== "none") {
                // This is a simplified version - ideally we'd reapply the exact pattern section
                ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // Approximation
                ctx.fillRect(borderSize, yOffset, imgWidth, imgHeight);
            }
        }
        
        // Draw the photo
        drawPhoto(img, borderSize, yOffset, imgWidth, imgHeight);
        
        ctx.restore();
    });

    // Step 3: Draw copyright and timestamp
    drawTimestampAndCopyright();
    
    // Draw border stickers for each photo
    preloadedImages.forEach((img, index) => {
        const yOffset = borderSize + (imgHeight + photoSpacing) * index;
        drawBorderStickers(borderSize, imgWidth, imgHeight, yOffset, resolutionMultiplier, index);
    });

    return true;
}

// Add new function to draw background image
async function drawBackgroundImage() {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvasAspect = canvas.width / canvas.height;
            const imgAspect = img.width / img.height;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let offsetX = 0;
            let offsetY = 0;

            // Calculate dimensions to cover canvas while maintaining aspect ratio
            if (canvasAspect > imgAspect) {
                drawHeight = drawWidth / imgAspect;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = drawHeight * imgAspect;
                offsetX = (canvas.width - drawWidth) / 2;
            }

            // Draw background color first in case image has transparency
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw image
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            resolve();
        };
        img.src = backgroundImageData;
    });
}

function drawBorderStickers(borderSize, imgWidth, imgHeight, yOffset, resolutionMultiplier, photoIndex) {
    if (!selectedSticker) {
        selectedFrameImages.clear();
        return;
    }

    // Increase base sticker size by 25%
    const stickerSize = (borderSize / 2) * 2; // Changed from borderSize / 2
    const margin = 2 * resolutionMultiplier; // Reduced margin (was 5)
    const spacing = stickerSize * 1.1; // Reduced spacing (was 1.2)
    
    // Calculate exact coordinates for photo borders
    const photoLeft = borderSize;
    const photoRight = borderSize + imgWidth;
    const photoTop = yOffset;
    const photoBottom = yOffset + imgHeight;

    // Adjust offset for more precise border placement
    const offsetX = spacing / 2; // Add offset to center first and last stickers
    
    // Top border
    for (let x = photoLeft + offsetX; x <= photoRight - offsetX; x += spacing) {
        addSticker(x, photoTop - margin, selectedSticker, stickerSize, photoIndex);
    }

    // Bottom border
    for (let x = photoLeft + offsetX; x <= photoRight - offsetX; x += spacing) {
        addSticker(x, photoBottom + margin, selectedSticker, stickerSize, photoIndex);
    }

    // Left border
    for (let y = photoTop + offsetX; y <= photoBottom - offsetX; y += spacing) {
        addSticker(photoLeft - margin, y, selectedSticker, stickerSize, photoIndex);
    }

    // Right border
    for (let y = photoTop + offsetX; y <= photoBottom - offsetX; y += spacing) {
        addSticker(photoRight + margin, y, selectedSticker, stickerSize, photoIndex);
    }
    
    // Increase corner stickers by 30% instead of 20%
    const cornerSize = stickerSize * 1.8; // Changed from 1.2
    // Top-left corner
    addSticker(photoLeft, photoTop, selectedSticker, cornerSize, photoIndex);
    // Top-right corner
    addSticker(photoRight, photoTop, selectedSticker, cornerSize, photoIndex);
    // Bottom-left corner
    addSticker(photoLeft, photoBottom, selectedSticker, cornerSize, photoIndex);
    // Bottom-right corner
    addSticker(photoRight, photoBottom, selectedSticker, cornerSize, photoIndex);
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

    const radius = 20; // Increase corner radius for more noticeable rounding
    
    // First draw the background/pattern with rounded corners
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + targetWidth - radius, y);
    ctx.quadraticCurveTo(x + targetWidth, y, x + targetWidth, y + radius);
    ctx.lineTo(x + targetWidth, y + targetHeight - radius);
    ctx.quadraticCurveTo(x + targetWidth, y + targetHeight, x + targetWidth - radius, y + targetHeight);
    ctx.lineTo(x + radius, y + targetHeight);
    ctx.quadraticCurveTo(x, y + targetHeight, x, y + targetHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    // Fill with current background
    if (backgroundType.value === "gradient") {
        ctx.fillStyle = createGradient();
    } else {
        ctx.fillStyle = solidColor.value;
    }
    ctx.fill();
    
    // Apply pattern if needed
    if (patternType.value !== "none") {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fill();
    }
    
    // Create clipping path for the photo
    ctx.clip();
    
    // Draw the photo within the clipping path
    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight);
    
    // Add a subtle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Draw a subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
}

// Update createEmojiPattern function to handle transparency correctly
function createEmojiPattern(emoji, size, spacing = 1.2) {
    const resolutionMultiplier = parseInt(resolutionSelect.value) || 2;
    const scaledSize = size * resolutionMultiplier;
    
    const canvas = document.createElement('canvas');
    const patternSize = scaledSize * spacing;
    canvas.width = patternSize;
    canvas.height = patternSize;
    const patternCtx = canvas.getContext('2d');

    // Clear background (make it transparent)
    patternCtx.clearRect(0, 0, patternSize, patternSize);

    // Draw emoji
    patternCtx.font = `${scaledSize}px Arial`;
    patternCtx.textAlign = 'center';
    patternCtx.textBaseline = 'middle';
    patternCtx.fillText(emoji, patternSize/2, patternSize/2);

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

// Update drawTimestampAndCopyright to include GitHub attribution
function drawTimestampAndCopyright() {
    const resolutionMultiplier = parseInt(resolutionSelect.value) || 2;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = `${30 * resolutionMultiplier}pt VT323`;
    ctx.textAlign = "center";
    ctx.fillText("BunnyPix", canvas.width / 2, canvas.height - 30 * resolutionMultiplier);
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.font = `${12 * resolutionMultiplier}pt VT323`;
    ctx.textAlign = "right";
    ctx.fillText("© 2025", canvas.width - 40 * resolutionMultiplier, canvas.height - 20 * resolutionMultiplier);
}

// Update updateCanvasSize function to be more stable
function updateCanvasSize() {
    const container = document.querySelector('.preview-section');
    const containerWidth = container.getBoundingClientRect().width;
    
    // Store the current canvas dimensions to avoid unnecessary updates
    const currentWidth = parseFloat(canvas.style.width) || 0;
    const aspectRatio = canvas.height / canvas.width;
    
    // Calculate new width (95% of container, max 800px)
    const displayWidth = Math.min(containerWidth * 0.95, 800);
    const displayHeight = displayWidth * aspectRatio;
    
    // Only update if dimensions changed by more than 1px
    if (Math.abs(currentWidth - displayWidth) > 1) {
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
    }
}

// Replace window resize and scroll handlers
const debouncedUpdateCanvas = debounce(() => {
    updateCanvasSize();
}, 100);

window.removeEventListener('resize', updateCanvasSize);
window.addEventListener('resize', debouncedUpdateCanvas, { passive: true });

// Prevent canvas updates during scroll
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateCanvasSize();
            ticking = false;
        });
        ticking = true;
    }
}, { passive: true });

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
    imageControls.style.display = e.target.value === "image" ? "block" : "none";
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

// Add background image handler
backgroundImage.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            backgroundImageData = e.target.result;
            generatePhotoStrip(true);
        };
        reader.readAsDataURL(file);
    }
});

// Remove stickerSelect event listener
// stickerSelect.addEventListener("change", (e) => {
//     selectedFrame = e.target.value;
//     // Force a complete redraw to clean up previous stickers
//     generatePhotoStrip(true);
// });

// Add event listener for resolution changes
resolutionSelect.addEventListener("change", () => {
    // Update canvas with new resolution
    generatePhotoStrip(true);
});

// Update download button to handle potential large image sizes
downloadButton.addEventListener("click", () => {
    const resolutionMultiplier = parseInt(resolutionSelect.value) || 2;
    
    // Calculate maximum safe resolution based on browser/device capabilities
    const maxSafeResolution = 8000; // Conservative estimate for most browsers
    
    // Check if current canvas exceeds safe limits
    if (canvas.width > maxSafeResolution || canvas.height > maxSafeResolution) {
        console.warn("Canvas dimensions exceed safe limits, output may be truncated on some devices");
    }
    
    // Show a loading indicator if the resolution is high
    if (resolutionMultiplier > 2) {
        downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span class="ml-2">Preparing...</span>';
        downloadButton.disabled = true;
    }
    
    // Use setTimeout to allow UI to update before the intensive toDataURL operation
    setTimeout(() => {
        try {
            const link = document.createElement("a");
            link.download = "photostrip_" + new Date().toISOString().slice(0, 10) + ".png";
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Unable to generate high-resolution image. Try a lower quality setting.");
        } finally {
            // Reset button state
            downloadButton.innerHTML = '<i class="fas fa-download"></i><span class="ml-2">Download Photo Strip</span>';
            downloadButton.disabled = false;
        }
    }, 100);
});

backButton.addEventListener("click", () => {
    localStorage.removeItem("photobooth_photos");
    window.location.href = "index.html";
});

// Initialize the photo strip
generatePhotoStrip();
