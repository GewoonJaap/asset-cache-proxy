import { Hono } from "hono";
import { R2Helper } from "./R2Helper"; // Import R2Helper
import { v4 as uuidv4 } from "uuid"; // Import uuid
import { Buffer } from "node:buffer"; // Added for Buffer operations

export const CfTextToImageRoute = new Hono<{ Bindings: CloudflareBindings }>();

const supportedModels = {
  "stable-diffusion": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "flux-schnell": "@cf/black-forest-labs/flux-1-schnell"
};

type ModelName = keyof typeof supportedModels;

interface TextToImageRequest {
  model: ModelName;
  prompt: string;
  negative_prompt?: string;
  height?: number;
  width?: number;
  num_steps?: number;
  strength?: number;
  guidance?: number;
  seed?: number;
  // flux-schnell specific
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

  if (!model || !supportedModels[model]) {
    return c.json({ error: `Invalid model. Supported models are: ${Object.keys(supportedModels).join(", ")}` }, 400);
  }

  const modelId = supportedModels[model];
  const inputs: Record<string, any> = { ...rest };
  // @ts-ignore
  const r2 = new R2Helper(c.env.MEDIA_BUCKET);
  const imageId = uuidv4(); // Generate a unique ID for the image

  try {
    const aiResponse = await c.env.AI.run(modelId, inputs);
    let imageBody: ArrayBuffer;
    let contentType: string;

    if (model === "flux-schnell") {
      // flux-schnell returns base64 image
      // @ts-ignore
      if (typeof aiResponse.image !== "string") {
        return c.json({ error: "Unexpected response format from flux-schnell model" }, 500);
      }
      // @ts-ignore
      const binaryString = atob(aiResponse.image);
      const byteArray = Uint8Array.from(binaryString, (m) => m.codePointAt(0) as number);
      imageBody = byteArray.buffer;
      contentType = "image/jpeg";
    } else {
      // stable-diffusion
      // stable-diffusion returns a ReadableStream. We need to consume it.
      contentType = "image/png"; // Default for Stable Diffusion
      const reader = (aiResponse as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      // Concatenate chunks into a single Uint8Array, then get its buffer
      let totalLength = 0;
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      imageBody = result.buffer;
    }

    // Upload to R2
    await r2.uploadObject(imageId, imageBody, contentType);

    // Return the image ID
    return c.json({ imageId: imageId, model: modelId, inputs: inputs });
  } catch (error: any) {
    console.error(`Error in text-to-image route for model ${modelId}:`, error);
    return c.json({ error: `Failed to process image request: ${error.message || error}` }, 500);
  }
});

CfTextToImageRoute.get("/:imageId", async (c) => {
  const { imageId } = c.req.param();
  // @ts-ignore
  const r2 = new R2Helper(c.env.MEDIA_BUCKET);

  if (!imageId) {
    return c.json({ error: "Image ID is required" }, 400);
  }

  try {
    const cachedObject = await r2.getObject(imageId);

    if (cachedObject === null || !cachedObject.body) {
      return c.json({ error: "Image not found" }, 404);
    }

    const headers = new Headers();
    if (cachedObject.httpMetadata?.contentType) {
      headers.set("Content-Type", cachedObject.httpMetadata.contentType);
    }
    // Optionally, set other headers like Cache-Control
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return c.newResponse(cachedObject.body, {
      headers: headers
    });
  } catch (error: any) {
    console.error(`Error retrieving image ${imageId} from R2:`, error);
    return c.json({ error: `Failed to retrieve image: ${error.message || error}` }, 500);
  }
});
