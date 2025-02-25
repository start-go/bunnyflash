import { AutoModel, AutoProcessor, RawImage } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers";

export async function initializeOverlay(state, ctx) {
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
        rotation: 0 // Add rotation property
    };

    const toggleOverlay = document.getElementById('toggleOverlay');
    const overlayControls = document.getElementById('overlayControls');
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    
    let model, processor;
    
    // Initialize background removal model
    async function initModel() {
        try {
            if (navigator.gpu) {
                model = await AutoModel.from_pretrained("Xenova/modnet", {
                    device: "webgpu",
                    config: { model_type: 'modnet', architectures: ['MODNet'] }
                });
                processor = await AutoProcessor.from_pretrained("Xenova/modnet");
            } else {
                model = await AutoModel.from_pretrained("briaai/RMBG-1.4", {
                    config: { model_type: "custom" }
                });
                processor = await AutoProcessor.from_pretrained("briaai/RMBG-1.4");
            }
        } catch (error) {
            console.error('Model initialization failed:', error);
        }
    }

    async function removeBackground(img) {
        try {
            if (!model || !processor) await initModel();
            
            const image = await RawImage.fromURL(img.src);
            const { pixel_values } = await processor(image);
            const { output } = await model({ input: pixel_values });
            const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
                .resize(image.width, image.height);
            
            image.putAlpha(mask);
            return image.toCanvas();
        } catch (error) {
            console.error('Background removal failed:', error);
            return img;
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

        return {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    // Initialize overlay controls and event listeners
    function initializeOverlayControls() {
        const canvas = document.getElementById('webcam-canvas');
        
        function handleDragStart(e) {
            if (!state.overlayImage) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x >= state.overlay.x && 
                x <= state.overlay.x + (state.overlay.width * state.overlay.scale) &&
                y >= state.overlay.y &&
                y <= state.overlay.y + (state.overlay.height * state.overlay.scale)) {
                
                state.overlay.isDragging = true;
                state.overlay.dragStartX = x;
                state.overlay.dragStartY = y;
                state.overlay.originalX = state.overlay.x;
                state.overlay.originalY = state.overlay.y;
                canvas.classList.add('dragging');
            }
        }

        function handleDrag(e) {
            if (!state.overlayImage || !state.overlay.isDragging) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const dx = x - state.overlay.dragStartX;
            const dy = y - state.overlay.dragStartY;

            state.overlay.x = Math.max(0, Math.min(
                canvas.width - state.overlay.width * state.overlay.scale,
                state.overlay.originalX + dx
            ));
            state.overlay.y = Math.max(0, Math.min(
                canvas.height - state.overlay.height * state.overlay.scale,
                state.overlay.originalY + dy
            ));
        }

        function handleDragEnd() {
            state.overlay.isDragging = false;
            canvas.classList.remove('dragging');
        }

        canvas.addEventListener('mousedown', handleDragStart);
        canvas.addEventListener('mousemove', handleDrag);
        canvas.addEventListener('mouseup', handleDragEnd);
        canvas.addEventListener('mouseleave', handleDragEnd);

        // Touch events
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handleDragStart({ clientX: touch.clientX, clientY: touch.clientY });
        });

        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handleDrag({ clientX: touch.clientX, clientY: touch.clientY });
        });

        canvas.addEventListener('touchend', handleDragEnd);
    }

    function fitImageToFrame() {
        if (!state.overlayImage) return;

        const canvas = document.getElementById('webcam-canvas');
        const maxWidth = canvas.width * 0.9;
        const maxHeight = canvas.height * 0.9;
        
        const widthRatio = maxWidth / state.overlay.width;
        const heightRatio = maxHeight / state.overlay.height;
        const newScale = Math.min(widthRatio, heightRatio);
        
        state.overlay.scale = newScale;
        scaleSlider.value = Math.round(newScale * 100);
        scaleValue.textContent = `${Math.round(newScale * 100)}%`;
        
        state.overlay.x = (canvas.width - (state.overlay.width * state.overlay.scale)) / 2;
        state.overlay.y = (canvas.height - (state.overlay.height * state.overlay.scale)) / 2;
    }

    async function handleOverlayUpload(file) {
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = async () => {
            try {
                let processedImage;
                if (file.type === 'image/png') {
                    // Check if PNG has transparency
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const hasTransparency = Array.from(imageData.data)
                        .some((value, index) => index % 4 === 3 && value < 255);
                    
                    processedImage = hasTransparency ? img : await removeBackground(img);
                } else {
                    processedImage = await removeBackground(img);
                }

                // Process and set the overlay image
                state.overlayImage = autoCropImage(processedImage);
                state.overlay.width = state.overlayImage.width;
                state.overlay.height = state.overlayImage.height;
                
                // Update UI
                fitImageToFrame();
                updateOverlayButtonText();
                overlayControls.style.display = 'block';
                initializeOverlayControls();
            } catch (error) {
                console.error('Error processing overlay image:', error);
                alert('Error processing image. Please try another one.');
            }
        };

        img.onerror = () => {
            alert('Error loading image. Please try another one.');
        };
    }

    function updateOverlayButtonText() {
        const toggleOverlayBtn = document.getElementById('toggleOverlay');
        if (state.overlayImage) {
            toggleOverlayBtn.innerHTML = '<i class="fas fa-trash-alt"></i><span>Remove Overlay</span>';
        } else {
            toggleOverlayBtn.innerHTML = '<i class="fas fa-image"></i><span>Add Overlay</span>';
        }
    }

    function handleRotation(value) {
        state.overlay.rotation = value;
        const mobileRotateValue = document.getElementById('rotateValue-mobile');
        const desktopRotateValue = document.getElementById('rotateValue');
        if (mobileRotateValue) mobileRotateValue.textContent = `${value}°`;
        if (desktopRotateValue) desktopRotateValue.textContent = `${value}°`;
    }

    // Add rotation event listeners
    const rotateSlider = document.getElementById('rotateSlider');
    const rotateSliderMobile = document.getElementById('rotateSlider-mobile');

    if (rotateSlider) {
        rotateSlider.addEventListener('input', (e) => {
            handleRotation(parseInt(e.target.value));
            if (rotateSliderMobile) rotateSliderMobile.value = e.target.value;
        });
    }

    if (rotateSliderMobile) {
        rotateSliderMobile.addEventListener('input', (e) => {
            handleRotation(parseInt(e.target.value));
            if (rotateSlider) rotateSlider.value = e.target.value;
        });
    }

    // Update drawing logic to include rotation
    function drawOverlay(ctx) {
        if (!state.overlayImage) return;
        
        ctx.save();
        
        // Calculate center position
        const centerX = state.overlay.x + (state.overlay.width * state.overlay.scale) / 2;
        const centerY = state.overlay.y + (state.overlay.height * state.overlay.scale) / 2;
        
        // Move to center, rotate, and move back
        ctx.translate(centerX, centerY);
        ctx.rotate((state.overlay.rotation * Math.PI) / 180);
        
        // Draw image centered at rotation point
        ctx.drawImage(
            state.overlayImage,
            -(state.overlay.width * state.overlay.scale) / 2,
            -(state.overlay.height * state.overlay.scale) / 2,
            state.overlay.width * state.overlay.scale,
            state.overlay.height * state.overlay.scale
        );
        
        ctx.restore();
    }

    // Export the draw function
    state.drawOverlay = drawOverlay;

    // Event listeners
    toggleOverlay.addEventListener('click', () => {
        if (state.overlayImage) {
            state.overlayImage = null;
            overlayControls.style.display = 'none';
            updateOverlayButtonText();
            return;
        }
    
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                handleOverlayUpload(e.target.files[0]);
            }
        };
        input.click();
    });

    document.getElementById('fitButton').addEventListener('click', fitImageToFrame);
    document.getElementById('autoCropButton').addEventListener('click', () => {
        if (!state.overlayImage) return;
        state.overlayImage = autoCropImage(state.overlayImage);
        state.overlay.width = state.overlayImage.width;
        state.overlay.height = state.overlayImage.height;
        fitImageToFrame();
    });

    scaleSlider.addEventListener('input', () => {
        if (!state.overlayImage) return;
        state.overlay.scale = scaleSlider.value / 100;
        scaleValue.textContent = `${scaleSlider.value}%`;
    });

    // Initialize the model
    await initModel();
    
    return state.overlay;
}
