import { applyFilter } from './filters.js';

export async function initializeCamera(state) {
    const canvas = document.getElementById('webcam-canvas');
    const hiddenCanvas = document.getElementById('hiddenCanvas');
    const ctx = canvas.getContext('2d');
    const hiddenCtx = hiddenCanvas.getContext('2d');
    const container = document.getElementById('webcam-container');
    
    // Set hidden canvas to high resolution
    hiddenCanvas.width = 1920;  // Full HD width
    hiddenCanvas.height = 1440; // 4:3 aspect ratio at full HD
    
    function renderWebcam() {
        if (!state.videoElement) return;

        // Get video dimensions
        const videoWidth = state.videoElement.videoWidth;
        const videoHeight = state.videoElement.videoHeight;
        
        // Set display canvas to a fixed 4:3 aspect ratio, but 30% smaller
        const containerWidth = container.clientWidth * 0.7;
        canvas.width = containerWidth;
        canvas.height = containerWidth * (3/4);
        
        // Calculate scaling and positioning for both canvases
        let drawWidth, drawHeight, drawX = 0, drawY = 0;
        const videoRatio = videoWidth / videoHeight;
        const canvasRatio = canvas.width / canvas.height;
        
        if (videoRatio >= canvasRatio) {
            drawHeight = videoHeight;
            drawWidth = videoHeight * canvasRatio;
            drawX = (videoWidth - drawWidth) / 2;
        } else {
            drawWidth = videoWidth;
            drawHeight = videoWidth / canvasRatio;
            drawY = (videoHeight - drawHeight) / 2;
        }
        
        // Clear both canvases
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
        
        // Draw to display canvas
        ctx.save();
        if (state.isFlipped) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
        }
        ctx.drawImage(
            state.videoElement,
            drawX, drawY, drawWidth, drawHeight,
            0, 0, canvas.width, canvas.height
        );
        ctx.restore();
        
        // Draw to hidden canvas (high resolution)
        hiddenCtx.save();
        if (state.isFlipped) {
            hiddenCtx.scale(-1, 1);
            hiddenCtx.translate(-hiddenCanvas.width, 0);
        }
        hiddenCtx.drawImage(
            state.videoElement,
            drawX, drawY, drawWidth, drawHeight,
            0, 0, hiddenCanvas.width, hiddenCanvas.height
        );
        hiddenCtx.restore();
        
        // Apply current filter to display canvas
        if (state.filter !== 'none') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilter(imageData.data, state.filter);
            ctx.putImageData(imageData, 0, 0);
            
            // Also apply to hidden canvas
            const hiddenImageData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);
            applyFilter(hiddenImageData.data, state.filter);
            hiddenCtx.putImageData(hiddenImageData, 0, 0);
        }
        
        // Draw overlay if exists (on both canvases)
        if (state.overlayImage && state.overlay) {
            try {
                state.drawOverlay(ctx);
                state.drawOverlay(hiddenCtx, true); // Pass true to indicate high-res canvas
            } catch (error) {
                console.error('Error drawing overlay:', error);
            }
        }
        
        requestAnimationFrame(() => renderWebcam());
    }

    // Update window resize handler to maintain 4:3 aspect ratio at 70% size
    window.addEventListener('resize', () => {
        const containerWidth = container.clientWidth * 0.7; // 70% of original size
        canvas.width = containerWidth;
        canvas.height = containerWidth * (3/4); // 4:3 aspect ratio
    });

    const webcamSelect = document.getElementById('webcamSelect');
    
    async function getWebcams() {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        webcamSelect.innerHTML = '';
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${webcamSelect.length + 1}`;
            webcamSelect.appendChild(option);
        });
    }

    async function initCamera(deviceId = null) {
        if (state.stream) {
            state.stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                width: { ideal: 3840 },    // 4K
                height: { ideal: 2160 },   // 4K
                deviceId: deviceId ? { exact: deviceId } : undefined
            },
            audio: false
        };

        try {
            state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            state.videoElement = document.createElement('video');
            state.videoElement.srcObject = state.stream;
            state.videoElement.autoplay = true;
            state.videoElement.playsInline = true;
            
            await new Promise(resolve => {
                state.videoElement.onloadedmetadata = () => {
                    state.videoElement.play();
                    resolve();
                };
            });
            
            // Start the render loop
            renderWebcam();
        } catch (err) {
            console.error('Failed to get 4K stream, falling back to HD:', err);
            // Fallback to HD if 4K fails
            try {
                constraints.video.width = { ideal: 1920 };
                constraints.video.height = { ideal: 1080 };
                state.stream = await navigator.mediaDevices.getUserMedia(constraints);
                state.videoElement = document.createElement('video');
                state.videoElement.srcObject = state.stream;
                state.videoElement.autoplay = true;
                state.videoElement.playsInline = true;
                
                await new Promise(resolve => {
                    state.videoElement.onloadedmetadata = () => {
                        state.videoElement.play();
                        resolve();
                    };
                });
                
                renderWebcam();
            } catch (fallbackErr) {
                alert('Error accessing camera: ' + fallbackErr.message);
            }
        }
    }

    // Initialize
    await getWebcams();
    if (webcamSelect.options.length > 0) {
        await initCamera(webcamSelect.value);
    }

    webcamSelect.addEventListener('change', async () => {
        await initCamera(webcamSelect.value);
    });

    const flipButton = document.getElementById('flipButton');
    flipButton.addEventListener('click', () => {
        state.isFlipped = !state.isFlipped;
    });
}

export function setupCameraControls(state) {
    
}

// Remove or comment out the resizeCanvas function and its event listener
// function resizeCanvas() { ... }
// window.addEventListener('resize', resizeCanvas);
