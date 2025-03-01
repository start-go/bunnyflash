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
    sony: {
        // 4 images starting from 1
        1: "assets/images/frame/sony/1.png",
        2: "assets/images/frame/sony/2.png",
        3: "assets/images/frame/sony/3.png",
        4: "assets/images/frame/sony/4.png"
    }
};

// Improved sticker drawing function to handle different types
function drawSticker(ctx, x, y, type, stickerWidth = 50, stickerHeight = 40) {
    // Get current resolution multiplier
    const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
    
    // Scale position and dimensions for higher resolution
    const scaledWidth = stickerWidth * resolutionMultiplier;
    const scaledHeight = stickerHeight * resolutionMultiplier;
    
    if (type === "cute") {
        ctx.font = `${40 * resolutionMultiplier}px sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText("🐱", x, y);
        return;
    }
    
    // Handle image-based stickers
    if (stickerImages[type]) {
        const stickerSet = stickerImages[type];
        // Randomly select an image from the sticker set
        const keys = Object.keys(stickerSet);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        const imgSrc = stickerSet[randomKey];
        
        const img = new Image();
        img.src = imgSrc;
        img.onload = () => {
            // Maintain aspect ratio if height is provided
            if (scaledHeight) {
                const aspectRatio = img.width / img.height;
                const calculatedWidth = scaledHeight * aspectRatio;
                ctx.drawImage(img, x, y, calculatedWidth, scaledHeight);
            } else {
                ctx.drawImage(img, x, y, scaledWidth, scaledWidth);
            }
        };
    }
}

const frames = {
    none: {
        draw: () => {} // No overlay
    },
    fish: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            // Define positions as fractions or percentages of the image dimensions
            // This ensures consistent placement regardless of resolution
            const positions = [
                [x + 11 * resolutionMultiplier, y + 5 * resolutionMultiplier], 
                [x - 18 * resolutionMultiplier, y + 95 * resolutionMultiplier], 
                [x + width - 160 * resolutionMultiplier, y + 10 * resolutionMultiplier], 
                [x + width - 1 * resolutionMultiplier, y + 50 * resolutionMultiplier],
                [x + 120 * resolutionMultiplier, y + height - 20 * resolutionMultiplier], 
                [x + 20 * resolutionMultiplier, y + height - 20 * resolutionMultiplier], 
                [x + width - 125 * resolutionMultiplier, y + height - 5 * resolutionMultiplier],
                [x + width - 10 * resolutionMultiplier, y + height - 45 * resolutionMultiplier]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'fish'));
        }
    },
    combined: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            const positions = [
                [x + 15 * resolutionMultiplier, y - 10 * resolutionMultiplier], 
                [x + width - 70 * resolutionMultiplier, y - 5 * resolutionMultiplier], 
                [x + width/2 - 30 * resolutionMultiplier, y - 20 * resolutionMultiplier],
                [x + 10 * resolutionMultiplier, y + height - 40 * resolutionMultiplier], 
                [x + width - 60 * resolutionMultiplier, y + height - 45 * resolutionMultiplier], 
                [x + width/2 - 15 * resolutionMultiplier, y + height - 25 * resolutionMultiplier],
                [x - 15 * resolutionMultiplier, y + height/2], 
                [x + width - 15 * resolutionMultiplier, y + height/2 - 30 * resolutionMultiplier]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'combined', 65, 65));
        }
    },
    pink: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            const positions = [
                [5 * resolutionMultiplier, 5 * resolutionMultiplier], 
                [width - 45 * resolutionMultiplier, 8 * resolutionMultiplier], 
                [width/3 * resolutionMultiplier, -10 * resolutionMultiplier], 
                [2*width/3 * resolutionMultiplier, -5 * resolutionMultiplier],
                [8 * resolutionMultiplier, height - 35 * resolutionMultiplier], 
                [width - 40 * resolutionMultiplier, height - 30 * resolutionMultiplier], 
                [width/2 * resolutionMultiplier, height - 20 * resolutionMultiplier]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'pink', 40, 40));
        }
    },
    redicon: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            const positions = [
                [10 * resolutionMultiplier, 10 * resolutionMultiplier], 
                [width - 50 * resolutionMultiplier, 5 * resolutionMultiplier], 
                [width/2 - 20 * resolutionMultiplier, -5 * resolutionMultiplier],
                [20 * resolutionMultiplier, height - 30 * resolutionMultiplier], 
                [width - 55 * resolutionMultiplier, height - 25 * resolutionMultiplier], 
                [width/2 + 10 * resolutionMultiplier, height - 15 * resolutionMultiplier],
                [-10 * resolutionMultiplier, height/3 * resolutionMultiplier], 
                [width + 5 * resolutionMultiplier, 2*height/3 * resolutionMultiplier]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'redicon', 45, 45));
        }
    },
    sea: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            const positions = [];
            // Create a wavy pattern along the edges
            for (let i = 0; i < 4; i++) {
                positions.push([i * width/3 * resolutionMultiplier, -5 * resolutionMultiplier - Math.sin(i) * 10 * resolutionMultiplier]);
                positions.push([i * width/3 * resolutionMultiplier, height - 25 * resolutionMultiplier + Math.sin(i) * 10 * resolutionMultiplier]);
            }
            // Add some on the sides
            positions.push([-15 * resolutionMultiplier, height/3 * resolutionMultiplier]);
            positions.push([-10 * resolutionMultiplier, 2*height/3 * resolutionMultiplier]);
            positions.push([width - 15 * resolutionMultiplier, height/4 * resolutionMultiplier]);
            positions.push([width - 10 * resolutionMultiplier, 3*height/4 * resolutionMultiplier]);
            
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'sea', 50, 40));
        }
    },
    sony: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            const positions = [
                [width/2 - 100 * resolutionMultiplier, -15 * resolutionMultiplier], 
                [width/2 + 40 * resolutionMultiplier, -12 * resolutionMultiplier],
                [10 * resolutionMultiplier, height/2 * resolutionMultiplier], 
                [width - 50 * resolutionMultiplier, height/2 * resolutionMultiplier],
                [width/2 - 70 * resolutionMultiplier, height - 25 * resolutionMultiplier], 
                [width/2 + 30 * resolutionMultiplier, height - 30 * resolutionMultiplier]
            ];
            positions.forEach(([px, py]) => drawSticker(ctx, px, py, 'sony', 60, 50));
        }
    },
    cute: {
        draw: (ctx, x, y, width, height) => {
            const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
            ctx.font = `${30 * resolutionMultiplier}px sans-serif`;
            ctx.textBaseline = "top";
            
            const emojis = [
                ["🐱", x + 20 * resolutionMultiplier, y + 10 * resolutionMultiplier], 
                ["🐶", x + width - 50 * resolutionMultiplier, y + 20 * resolutionMultiplier],
                ["🐰", x + 20 * resolutionMultiplier, y + height - 40 * resolutionMultiplier], 
                ["🐻", x + width - 50 * resolutionMultiplier, y + height - 40 * resolutionMultiplier]
            ];
            
            emojis.forEach(([emoji, px, py]) => ctx.fillText(emoji, px, py));
        }
    },
    random: {
        draw: (ctx, x, y, width, height) => {
            // Choose a random sticker type excluding 'none', 'cute', and 'random'
            const stickerTypes = Object.keys(stickerImages);
            const randomType = stickerTypes[Math.floor(Math.random() * stickerTypes.length)];
            
            // Generate random positions
            const positions = [];
            for (let i = 0; i < 8; i++) {
                const px = Math.random() * width;
                const py = (i < 4) 
                    ? -10 - Math.random() * 20 // Top area
                    : height + Math.random() * 10; // Bottom area
                positions.push([px, py]);
            }
            
            // Add some on the sides
            for (let i = 0; i < 4; i++) {
                positions.push([-20, Math.random() * height]); // Left
                positions.push([width + 5, Math.random() * height]); // Right
            }
            
            positions.forEach(([px, py]) => drawSticker(ctx, x + px, y + py, randomType, 50, 40));
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
        
        // Apply the selected sticker frame
        if (frames[selectedFrame]) {
            // For positioning the stickers correctly, we need to use the original coordinates
            // but the drawSticker function will handle the scaling based on resolution
            frames[selectedFrame].draw(ctx, borderSize, yOffset, imgWidth, imgHeight);
        }
        ctx.restore();
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

    // Add rounded corners
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + targetWidth - 10, y);
    ctx.quadraticCurveTo(x + targetWidth, y, x + targetWidth, y + 10);
    ctx.lineTo(x + targetWidth, y + targetHeight - 10);
    ctx.quadraticCurveTo(x + targetWidth, y + targetHeight, x + targetWidth - 10, y + targetHeight);
    ctx.lineTo(x + 10, y + targetHeight);
    ctx.quadraticCurveTo(x, y + targetHeight, x, y + targetHeight - 10);
    ctx.lineTo(x, y + 10);
    ctx.quadraticCurveTo(x, y, x + 10, y);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, x, y, targetWidth, targetHeight);
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

// Update canvas size handling
function updateCanvasSize() {
    const container = document.querySelector('.preview-section');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Calculate appropriate canvas size while maintaining aspect ratio
    const resolutionMultiplier = parseInt(canvas.dataset.resolutionMultiplier || "2");
    
    // Get the actual canvas dimensions (resolution)
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate the aspect ratio
    const aspectRatio = canvasHeight / canvasWidth;
    
    // Determine the maximum width that fits in the container
    // Leave some padding on the sides
    const maxWidth = containerWidth * 0.95;
    
    // Calculate the display width and height
    let displayWidth = Math.min(maxWidth, canvasWidth / resolutionMultiplier);
    let displayHeight = displayWidth * aspectRatio;
    
    // If the height is too tall for the container, adjust accordingly
    if (displayHeight > containerHeight * 0.9) {
        displayHeight = containerHeight * 0.9;
        displayWidth = displayHeight / aspectRatio;
    }
    
    // Apply the display size
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
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
    // Force a complete redraw to clean up previous stickers
    generatePhotoStrip(true);
});

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
