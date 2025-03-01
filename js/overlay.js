import { AutoModel, AutoProcessor, RawImage } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

// Initialize the transformer worker
let transformerWorker;
let isWorkerLoaded = false;
let modelLoadingPromise = null;

// Shared functions
function initWorker() {
    if (transformerWorker) return;
    
    try {
        transformerWorker = new Worker(new URL("transformer-worker.js", import.meta.url), {
            type: 'module'
        });
        
        transformerWorker.onmessage = (event) => {
            const { type, message, imageBlob } = event.data;
            
            if (type === 'ready') {
                isWorkerLoaded = true;
                document.getElementById('loadingOverlay').classList.add('hidden');
                console.log('Transformer worker is ready');
            } else if (type === 'log') {
                console.log('Worker:', message);
            } else if (type === 'error') {
                console.error('Worker error:', message);
                
                // If we get an import error, fall back to main thread
                if (message.includes('Failed to import')) {
                    console.warn('Worker failed to import transformers library. Falling back to main thread processing.');
                    isWorkerLoaded = false;
                }
            }
        };
        
        // Add error handler for worker initialization
        transformerWorker.onerror = (error) => {
            console.error('Worker initialization error:', error);
            isWorkerLoaded = false;
        };
    } catch (error) {
        console.error('Failed to initialize worker:', error);
        // Fall back to main thread processing if worker fails
        isWorkerLoaded = false;
    }
}

// Fallback direct processing when worker fails
let model, processor;

async function initModel() {
    try {
        if (navigator.gpu) {
            model = await AutoModel.from_pretrained("Xenova/modnet", {
                device: "webgpu",
                config: { model_type: 'modnet', architectures: ['MODNet'] }
            });
            processor = await AutoProcessor.from_pretrained("Xenova/modnet");
            console.log('Initialized WebGPU model');
        } else {
            model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
                config: { model_type: "custom" }
            });
            processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4", {
                config: {
                    do_normalize: true,
                    do_pad: false,
                    do_rescale: true,
                    do_resize: true,
                    image_mean: [0.5, 0.5, 0.5],
                    feature_extractor_type: "ImageFeatureExtractor",
                    image_std: [1, 1, 1],
                    resample: 2,
                    rescale_factor: 0.00392156862745098,
                    size: { width: 1024, height: 1024 },
                },
            });
            console.log('Initialized briaai model');
        }
    } catch (error) {
        console.error('Model initialization failed:', error);
    }
}

async function removeBackgroundWithWorker(img) {
    return new Promise((resolve, reject) => {
        try {
            // Show loading indicator with initial status
            document.getElementById('loadingStatus').textContent = 'Processing image...';
            document.getElementById('loadingOverlay').classList.remove('hidden');
            
            // Convert image to blob first
            fetch(img.src)
                .then(response => response.blob())
                .then(blob => {
                    // Create a unique message handler for this specific request
                    const messageHandler = (event) => {
                        const { type, imageBlob, width, height, message } = event.data;
                        
                        if (type === 'result') {
                            const base64data = event.data.imageData;
                            fetch(base64data)
                                .then(res => res.blob())
                                .then(blob => {
                                    const url = URL.createObjectURL(blob);
                                    const resultImg = new Image();

                                    resultImg.onload = () => {
                                        const canvas = document.createElement('canvas');
                                        canvas.width = event.data.width;
                                        canvas.height = event.data.height;
                                        const ctx = canvas.getContext('2d');
                                        ctx.drawImage(resultImg, 0, 0);

                                        URL.revokeObjectURL(url);
                                        transformerWorker.removeEventListener('message', messageHandler);

                                        document.getElementById('loadingOverlay').classList.add('hidden');
                                        resolve(canvas);
                                    };

                                    resultImg.onerror = (err) => {
                                        console.error('Error loading processed image', err);
                                        document.getElementById('loadingOverlay').classList.add('hidden');
                                        transformerWorker.removeEventListener('message', messageHandler);
                                        reject(err);
                                    };

                                    resultImg.src = url;
                                });
                        } else if (type === 'error') {
                            console.error('Worker processing error:', message);
                            document.getElementById('loadingOverlay').classList.add('hidden');
                            transformerWorker.removeEventListener('message', messageHandler);
                            reject(new Error(message));
                        } else if (type === 'status') {
                            document.getElementById('loadingStatus').textContent = message;
                        }
                    };
                    
                    // Add temporary listener for this specific processing job
                    transformerWorker.addEventListener('message', messageHandler);
                    
                    // Send the blob to the worker - Fix for transfer issue
                    transformerWorker.postMessage({
                        type: 'process',
                        data: blob
                    });
                    
                })
                .catch(error => {
                    console.error('Error preparing image for worker:', error);
                    document.getElementById('loadingOverlay').classList.add('hidden');
                    reject(error);
                });
        } catch (error) {
            console.error('Unexpected error in worker processing:', error);
            document.getElementById('loadingOverlay').classList.add('hidden');
            reject(error);
        }
    });
}

async function removeBackgroundFallback(img) {
    try {
        document.getElementById('loadingStatus').textContent = 'Removing background...';
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        if (!model || !processor) await initModel();
        const image = await RawImage.fromURL(img.src);
        const { pixel_values } = await processor(image);
        const { output } = await model({ input: pixel_values });
        const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
            .resize(image.width, image.height);
    
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image.toCanvas(), 0, 0);
        const pixelData = ctx.getImageData(0, 0, image.width, image.height);
        for (let i = 0; i < mask.data.length; ++i) {
            pixelData.data[4 * i + 3] = mask.data[i];
        }
        ctx.putImageData(pixelData, 0, 0);

        document.getElementById('loadingOverlay').classList.add('hidden');
        return canvas;
    } catch (error) {
        console.error('Background removal failed:', error);
        document.getElementById('loadingOverlay').classList.add('hidden');
        return img;
    }
}

async function removeBackground(img) {
    if (isWorkerLoaded) {
        try {
            return await removeBackgroundWithWorker(img);
        } catch (error) {
            console.error('Worker processing failed, falling back to main thread:', error);
            return removeBackgroundFallback(img);
        }
    } else {
        return removeBackgroundFallback(img);
    }
}

function autoCropImage(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bounds = getImageBounds(imageData);
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = bounds.width + 2;
    croppedCanvas.height = bounds.height + 2;
    const croppedCtx = croppedCanvas.getContext('2d');
    
    croppedCtx.drawImage(
        canvas,
        bounds.left, bounds.top, bounds.width, bounds.height,
        1, 1, bounds.width, bounds.height
    );

    return croppedCanvas;
}

function getImageBounds(imageData) {
    const data = imageData.data;
    let minX = imageData.width;
    let minY = imageData.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const alpha = data[((y * imageData.width + x) * 4) + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

function drawOverlay(ctx, state) {
    if (!state.overlayImage) return;
    
    ctx.save();
    const centerX = state.overlay.x + (state.overlay.width * state.overlay.scale) / 2;
    const centerY = state.overlay.y + (state.overlay.height * state.overlay.scale) / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate((state.overlay.rotation * Math.PI) / 180);
    
    ctx.drawImage(
        state.overlayImage,
        -(state.overlay.width * state.overlay.scale) / 2,
        -(state.overlay.height * state.overlay.scale) / 2,
        state.overlay.width * state.overlay.scale,
        state.overlay.height * state.overlay.scale
    );
    
    ctx.restore();
}

function fitImageToFrame(state, elements) {
    if (!state.overlayImage) return;

    const canvas = document.getElementById('webcam-canvas');
    const maxWidth = canvas.width * 0.9;
    const maxHeight = canvas.height * 0.9;
    
    const widthRatio = maxWidth / state.overlay.width;
    const heightRatio = maxHeight / state.overlay.height;
    const newScale = Math.min(widthRatio, heightRatio);
    
    state.overlay.scale = newScale;
    state.overlay.controls.scale = Math.round(newScale * 100);
    
    state.overlay.x = (canvas.width - (state.overlay.width * state.overlay.scale)) / 2;
    state.overlay.y = (canvas.height - (state.overlay.height * state.overlay.scale)) / 2;
    
    updateUI(state, elements);
}

function updateUI(state, elements) {
    if (state.overlayImage) {
        elements.overlayControls.style.display = state.overlay.controls.isOpen ? 'block' : 'none';
        elements.overlayControlsMobile.classList.toggle('hidden', !state.overlay.controls.isOpen);
    } else {
        elements.overlayControls.style.display = 'none';
        elements.overlayControlsMobile.classList.add('hidden');
    }

    const buttonHtml = state.overlayImage ? 
        '<i class="fas fa-trash-alt"></i><span>Remove Overlay</span>' : 
        '<i class="fas fa-image"></i><span>Add Overlay</span>';
    elements.toggleOverlay.innerHTML = buttonHtml;
    elements.toggleOverlayMobile.innerHTML = buttonHtml;

    // Ensure both desktop and mobile sliders are in sync
    const scaleValue = state.overlay.controls.scale;
    elements.scaleSlider.value = scaleValue;
    elements.scaleSliderMobile.value = scaleValue;
    elements.scaleValue.textContent = `${scaleValue}%`;
    elements.scaleValueMobile.textContent = `${scaleValue}%`;

    // Ensure both desktop and mobile rotation sliders are in sync
    const rotationValue = state.overlay.controls.rotation;
    elements.rotateSlider.value = rotationValue;
    elements.rotateSliderMobile.value = rotationValue;
    elements.rotateValue.textContent = `${rotationValue}°`;
    elements.rotateValueMobile.textContent = `${rotationValue}°`;
}

export async function initializeOverlay(state) {
    // Initialize worker in the background
    initWorker();
    
    // Initialize state
    state.overlay = {
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        scale: 0.3,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        originalX: 0,
        originalY: 0,
        rotation: 0,
        isVisible: false,
        controls: {
            isOpen: false,
            scale: 30,
            rotation: 0
        },
        isProcessingOverlay: false // Add flag to track overlay processing state
    };

    // Get all DOM elements
    const elements = {
        canvas: document.getElementById('webcam-canvas'),
        toggleOverlay: document.getElementById('toggleOverlay'),
        overlayControls: document.getElementById('overlayControls'),
        scaleSlider: document.getElementById('scaleSlider'),
        scaleValue: document.getElementById('scaleValue'),
        rotateSlider: document.getElementById('rotateSlider'),
        rotateValue: document.getElementById('rotateValue'),
        fitButton: document.getElementById('fitButton'),
        autoCropButton: document.getElementById('autoCropButton'),
        toggleOverlayMobile: document.getElementById('toggleOverlay-mobile'),
        overlayControlsMobile: document.getElementById('overlayControls-mobile'),
        scaleSliderMobile: document.getElementById('scaleSlider-mobile'),
        scaleValueMobile: document.getElementById('scaleValue-mobile'),
        rotateSliderMobile: document.getElementById('rotateSlider-mobile'),
        rotateValueMobile: document.getElementById('rotateValue-mobile'),
        fitButtonMobile: document.getElementById('fitButton-mobile'),
        autoCropButtonMobile: document.getElementById('autoCropButton-mobile'),
        removeOverlayMobile: document.getElementById('removeOverlay-mobile')
    };

    // Setup drag handlers
    function setupDragHandlers() {
        function getCanvasCoordinates(e, canvas) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            // Handle both mouse and touch events
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        function handleDragStart(e) {
            if (!state.overlayImage) return;
            
            const coords = getCanvasCoordinates(e, elements.canvas);
            const scaledWidth = state.overlay.width * state.overlay.scale;
            const scaledHeight = state.overlay.height * state.overlay.scale;
            
            // Check if the click/touch is within the overlay bounds
            if (coords.x >= state.overlay.x && 
                coords.x <= state.overlay.x + scaledWidth &&
                coords.y >= state.overlay.y &&
                coords.y <= state.overlay.y + scaledHeight) {
                
                state.overlay.isDragging = true;
                state.overlay.dragStartX = coords.x;
                state.overlay.dragStartY = coords.y;
                state.overlay.originalX = state.overlay.x;
                state.overlay.originalY = state.overlay.y;
                elements.canvas.style.cursor = 'grabbing';
            }
        }

        function handleDrag(e) {
            if (!state.overlayImage || !state.overlay.isDragging) return;
            
            const coords = getCanvasCoordinates(e, elements.canvas);
            const dx = coords.x - state.overlay.dragStartX;
            const dy = coords.y - state.overlay.dragStartY;
            const scaledWidth = state.overlay.width * state.overlay.scale;
            const scaledHeight = state.overlay.height * state.overlay.scale;

            // Update position with bounds checking
            state.overlay.x = Math.max(0, Math.min(
                elements.canvas.width - scaledWidth,
                state.overlay.originalX + dx
            ));
            state.overlay.y = Math.max(0, Math.min(
                elements.canvas.height - scaledHeight,
                state.overlay.originalY + dy
            ));
            
            // Prevent default to avoid scrolling while dragging on mobile
            e.preventDefault();
        }

        function handleDragEnd() {
            if (state.overlay.isDragging) {
                state.overlay.isDragging = false;
                elements.canvas.style.cursor = 'grab';
            }
        }

        // Mouse events
        elements.canvas.addEventListener('mousedown', handleDragStart);
        elements.canvas.addEventListener('mousemove', handleDrag);
        elements.canvas.addEventListener('mouseup', handleDragEnd);
        elements.canvas.addEventListener('mouseleave', handleDragEnd);

        // Touch events
        elements.canvas.addEventListener('touchstart', handleDragStart, { passive: false });
        elements.canvas.addEventListener('touchmove', handleDrag, { passive: false });
        elements.canvas.addEventListener('touchend', handleDragEnd);
        elements.canvas.addEventListener('touchcancel', handleDragEnd);

        // Add cursor styles
        elements.canvas.addEventListener('mouseover', () => {
            if (state.overlayImage) {
                elements.canvas.style.cursor = 'grab';
            }
        });
        
        elements.canvas.addEventListener('mouseout', () => {
            elements.canvas.style.cursor = 'default';
        });
    }

    // Setup event handlers
    async function hasUsableTransparency(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Count pixels with transparency
        let transparentPixels = 0;
        let totalPixels = data.length / 4;
        
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 250) { // Allow some tolerance for compression artifacts
                transparentPixels++;
            }
        }
        
        // Consider the transparency useful if at least 5% of pixels are transparent
        return transparentPixels / totalPixels > 0.05;
    }

    function handleOverlayToggle(event) {
        // Determine if this click came from the mobile menu
        const isFromMobileMenu = event && event.currentTarget && 
                                event.currentTarget.id === "toggleOverlay-mobile";
        
        if (state.overlayImage) {
            state.overlayImage = null;
            state.overlay.controls.isOpen = false;
        } else {
            // Set processing flag to prevent menu closure
            state.overlay.isProcessingOverlay = true;
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    
                    img.onload = async () => {
                        try {
                            // Check if it's a PNG with usable transparency
                            let processedImage;
                            if (file.type === 'image/png') {
                                const hasTransparency = await hasUsableTransparency(img);
                                processedImage = hasTransparency ? img : await removeBackground(img);
                            } else {
                                processedImage = await removeBackground(img);
                            }
                            
                            state.overlayImage = autoCropImage(processedImage);
                            state.overlay.width = state.overlayImage.width;
                            state.overlay.height = state.overlayImage.height;
                            state.overlay.controls.isOpen = true;
                            
                            fitImageToFrame(state, elements);
                            setupDragHandlers();
                            
                            // Reset processing flag
                            state.overlay.isProcessingOverlay = false;
                            
                            // If this was initiated from the mobile menu, make sure it stays open
                            if (isFromMobileMenu && state.mobileMenuOpen !== undefined) {
                                // Keep the mobile menu open
                                state.mobileMenuOpen = true;
                                const sideControls = document.querySelector('.side-controls');
                                if (sideControls) sideControls.classList.add('open');
                            }
                        } catch (error) {
                            console.error('Error processing image:', error);
                            alert('Error processing image. Please try another one.');
                            state.overlay.isProcessingOverlay = false;
                        }
                    };
                } else {
                    // Reset processing flag if no file was selected
                    state.overlay.isProcessingOverlay = false;
                }
            };
            
            // Handle the case where the file dialog is canceled
            const checkFileDialogClosed = setTimeout(() => {
                state.overlay.isProcessingOverlay = false;
            }, 1000);
            
            input.addEventListener('cancel', () => {
                clearTimeout(checkFileDialogClosed);
                state.overlay.isProcessingOverlay = false;
            });
            
            input.click();
        }
        updateUI(state, elements);
    }

    // Initialize event listeners
    elements.toggleOverlay.addEventListener('click', handleOverlayToggle);
    elements.toggleOverlayMobile.addEventListener('click', handleOverlayToggle);

    // Update scale slider event listeners
    function handleScaleChange(e) {
        const newScale = parseInt(e.target.value);
        state.overlay.controls.scale = newScale;
        state.overlay.scale = newScale / 100;
        updateUI(state, elements);
    }

    elements.scaleSlider.addEventListener('input', handleScaleChange);
    elements.scaleSliderMobile.addEventListener('input', handleScaleChange);

    // Update rotation slider event listeners
    function handleRotationChange(e) {
        const newRotation = parseInt(e.target.value);
        state.overlay.controls.rotation = newRotation;
        state.overlay.rotation = newRotation;
        updateUI(state, elements);
    }

    elements.rotateSlider.addEventListener('input', handleRotationChange);
    elements.rotateSliderMobile.addEventListener('input', handleRotationChange);

    elements.fitButton.addEventListener('click', () => fitImageToFrame(state, elements));
    elements.fitButtonMobile.addEventListener('click', () => fitImageToFrame(state, elements));

    elements.autoCropButton.addEventListener('click', () => {
        if (!state.overlayImage) return;
        state.overlayImage = autoCropImage(state.overlayImage);
        state.overlay.width = state.overlayImage.width;
        state.overlay.height = state.overlayImage.height;
        fitImageToFrame(state, elements);
    });
    elements.autoCropButtonMobile.addEventListener('click', () => elements.autoCropButton.click());

    elements.removeOverlayMobile?.addEventListener('click', handleOverlayToggle);

    // Initialize model and export draw function
    state.drawOverlay = (ctx) => drawOverlay(ctx, state);

    return state.overlay;
}

async function checkTransparency(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return Array.from(imageData.data)
        .some((value, index) => index % 4 === 3 && value < 255);
}


