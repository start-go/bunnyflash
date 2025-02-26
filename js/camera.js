import { applyFilter } from './filters.js';

export async function initializeCamera(state) {
    const canvas = document.getElementById('webcam-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('webcam-container');
    
    function renderWebcam() {
        if (!state.videoElement) return;

        // Get video dimensions
        const videoWidth = state.videoElement.videoWidth;
        const videoHeight = state.videoElement.videoHeight;
        
        // Set canvas to a fixed 4:3 aspect ratio
        const containerWidth = container.clientWidth;
        canvas.width = containerWidth;
        canvas.height = containerWidth * (3/4); // 4:3 aspect ratio
        
        // Calculate scaling and positioning to maintain aspect ratio with cropping if needed
        let drawWidth, drawHeight, drawX = 0, drawY = 0;
        const videoRatio = videoWidth / videoHeight;
        const canvasRatio = canvas.width / canvas.height; // Will be 4:3
        
        if (videoRatio >= canvasRatio) {
            // Video is wider than 4:3 - crop sides
            drawHeight = videoHeight;
            drawWidth = videoHeight * canvasRatio;
            drawX = (videoWidth - drawWidth) / 2;
        } else {
            // Video is taller than 4:3 - crop top/bottom
            drawWidth = videoWidth;
            drawHeight = videoWidth / canvasRatio;
            drawY = (videoHeight - drawHeight) / 2;
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save the current context state
        ctx.save();
        
        // Flip the context horizontally if isFlipped is true
        if (state.isFlipped) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
        }
        
        // Draw the video feed with proper cropping to maintain 4:3 aspect ratio
        ctx.drawImage(
            state.videoElement, 
            drawX, drawY, drawWidth, drawHeight, // Source crop
            0, 0, canvas.width, canvas.height    // Destination (full canvas)
        );
        
        // Restore the context state
        ctx.restore();
        
        // Apply current filter
        if (state.filter !== 'none') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilter(imageData.data, state.filter);
            ctx.putImageData(imageData, 0, 0);
        }
        
        // Draw the overlay if it exists
        if (state.overlayImage && state.overlay) {
            try {
                state.drawOverlay(ctx);
            } catch (error) {
                console.error('Error drawing overlay:', error);
            }
        }
        
        // Request the next frame
        requestAnimationFrame(() => renderWebcam());
    }

    // Update window resize handler to maintain 4:3 aspect ratio
    window.addEventListener('resize', () => {
        const containerWidth = container.clientWidth;
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
                width: { ideal: 1280 },  // Request higher resolution
                height: { ideal: 720 },  // for better quality
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
            
            // Wait for video to be ready
            await new Promise(resolve => {
                state.videoElement.onloadedmetadata = () => {
                    state.videoElement.play();
                    resolve();
                };
            });
            
            // Set initial canvas size based on video dimensions
            const videoWidth = state.videoElement.videoWidth;
            const videoHeight = state.videoElement.videoHeight;
            const aspectRatio = videoWidth / videoHeight;
            const containerWidth = container.clientWidth;
            
            canvas.width = containerWidth;
            canvas.height = containerWidth / aspectRatio;
            
            // Start the render loop
            renderWebcam();
        } catch (err) {
            alert('Error accessing camera: ' + err.message);
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
