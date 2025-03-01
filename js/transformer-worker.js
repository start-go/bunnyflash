import { AutoModel, AutoProcessor, RawImage } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

let model = null;
let processor = null;

async function initModel() {
  try {
    const useWebGPU = false;
    
    if (useWebGPU) {
      model = await AutoModel.from_pretrained("Xenova/modnet", {
        device: "webgpu",
      });
      processor = await AutoProcessor.from_pretrained("Xenova/modnet");
      self.postMessage({ type: 'log', message: 'Initialized WebGPU model' });
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
      self.postMessage({ type: 'log', message: 'Initialized briaai model' });
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error.toString() });
  }
}

async function processImage(imageBlob) {
  try {
    if (!model || !processor) {
      self.postMessage({ type: 'status', message: 'Initializing model...' });
      await initModel();
    }
    
    self.postMessage({ type: 'status', message: 'Removing background...' });
    
    const image = await RawImage.fromBlob(imageBlob);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8"))
      .resize(image.width, image.height);
    
    // Create a canvas and combine the image with the mask
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the original image
    ctx.drawImage(await image.toCanvas(), 0, 0);
    
    // Apply the mask to the alpha channel
    const pixelData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < mask.data.length; ++i) {
      pixelData.data[4 * i + 3] = mask.data[i];
    }
    ctx.putImageData(pixelData, 0, 0);
    
    // Convert the canvas to a blob and send it back
    const processedBlob = await canvas.convertToBlob({ type: 'image/png' });
    
    // // Return the processed image
    // self.postMessage({ 
    //   type: 'result', 
    //   imageBlob: processedBlob,
    //   width: image.width,
    //   height: image.height
    // }, [processedBlob]);

    // // Notify that the processing is complete
    const reader = new FileReader();
    reader.readAsDataURL(processedBlob);
    reader.onloadend = () => {
    const base64data = reader.result;
        self.postMessage({
            type: 'result',
            imageData: base64data, // Send base64-encoded data
            width: image.width,
            height: image.height
        });
    };
    
  } catch (error) {
    self.postMessage({ type: 'error', message: error.toString() });
  }
}

// Set up message handler for the worker
self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  if (type === 'process') {
    // Process the blob directly 
    await processImage(data);
  } else if (type === 'init') {
    await initModel();
    self.postMessage({ type: 'initialized' });
  }
};

// Notify that the worker is ready
self.postMessage({ type: 'ready' });
