import { Hono } from "hono";
import { CfTextToImageService, ModelName } from "../services/cfTextToImageService"; // Import the service

export const CfTextToImageRoute = new Hono<{ Bindings: CloudflareBindings }>();

// supportedModels and ModelName are now primarily managed by the service, but TextToImageRequest still needs ModelName
// Consider if TextToImageRequest should also be part of the service or a shared types file
const supportedModels = {
  "stable-diffusion": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "flux-schnell": "@cf/black-forest-labs/flux-1-schnell"
};

interface TextToImageRequest {
  model: ModelName; // Still using ModelName from the service
  prompt: string;
  negative_prompt?: string;
  height?: number;
  width?: number;
  num_steps?: number;
  strength?: number;
  guidance?: number;
  seed?: number;
  steps?: number;
}

CfTextToImageRoute.post("/", async (c) => {
  let requestBody: TextToImageRequest;
  try {
    requestBody = await c.req.json();
  } catch (e) {
    return c.json({ error: "Invalid JSON in request body" }, 400);
  }

  const { model, ...rest } = requestBody;

  // Basic validation, though the service will also validate the model name
  if (!model || !supportedModels[model]) {
    return c.json({ error: `Invalid model. Supported models are: ${Object.keys(supportedModels).join(", ")}` }, 400);
  }

  const service = new CfTextToImageService(c.env);

  try {
    const result = await service.generateAndStoreImage(model, rest);
    return c.json({ imageId: result.imageId, model: result.modelId, inputs: result.inputs });
  } catch (error: any) {
    console.error(`Error in POST /api/cf/text-to-image for model ${model}:`, error);
    return c.json({ error: `Failed to process image request: ${error.message || String(error)}` }, 500);
  }
});

CfTextToImageRoute.get("/:imageId", async (c) => {
  const { imageId } = c.req.param();
  const service = new CfTextToImageService(c.env);

  if (!imageId) {
    return c.json({ error: "Image ID is required" }, 400);
  }

  try {
    const cachedObject = await service.retrieveImageFromR2(imageId);

    if (cachedObject === null || !cachedObject.body) {
      return c.json({ error: "Image not found" }, 404);
    }

    const headers = new Headers();
    if (cachedObject.httpMetadata?.contentType) {
      headers.set("Content-Type", cachedObject.httpMetadata.contentType);
    }
    headers.set("Cache-Control", "public, max-age=31536000");

    return c.newResponse(cachedObject.body, {
      headers: headers
    });
  } catch (error: any) {
    console.error(`Error retrieving image ${imageId} from R2:`, error);
    return c.json({ error: `Failed to retrieve image: ${error.message || String(error)}` }, 500);
  }
});
