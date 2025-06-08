import { R2Helper } from "../routes/R2Helper";
import { v4 as uuidv4 } from "uuid";

// Re-define or import supportedModels and ModelName if they are not passed directly
// For simplicity in this refactor, we assume they might be passed or defined here if needed.
// However, it's often better to have a single source of truth for these.

const supportedModels = {
  "stable-diffusion": "@cf/stabilityai/stable-diffusion-xl-base-1.0",
  "flux-schnell": "@cf/black-forest-labs/flux-1-schnell"
};
export type ModelName = keyof typeof supportedModels;

export interface GenerateImageResult {
  imageId: string;
  modelId: string;
  inputs: Record<string, any>;
  contentType: string; // For potential direct use or logging
}

export class CfTextToImageService {
  private r2: R2Helper;
  private env: CloudflareBindings;

  constructor(env: CloudflareBindings) {
    this.env = env;
    this.r2 = new R2Helper(env.MEDIA_BUCKET);
  }

  async generateAndStoreImage(modelName: ModelName, inputs: Record<string, any>): Promise<GenerateImageResult> {
    const modelId = supportedModels[modelName];
    if (!modelId) {
      throw new Error(`Unsupported model: ${modelName}`);
    }

    const imageId = uuidv4();
    const aiResponse = await this.env.AI.run(modelId, inputs);

    let imageBody: ArrayBuffer;
    let contentType: string;

    if (modelName === "flux-schnell") {
      // @ts-ignore - AI.run response for flux-schnell is { image: string }
      if (typeof aiResponse.image !== "string") {
        throw new Error("Unexpected response format from flux-schnell model");
      }
      // @ts-ignore
      const binaryString = atob(aiResponse.image);
      const byteArray = Uint8Array.from(binaryString, (m) => m.codePointAt(0) as number);
      imageBody = byteArray.buffer;
      contentType = "image/jpeg";
    } else {
      // 'stable-diffusion'
      contentType = "image/png"; // Default for Stable Diffusion
      const reader = (aiResponse as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      let totalLength = 0;
      chunks.forEach((chunk) => (totalLength += chunk.length));
      const result = new Uint8Array(totalLength);
      let offset = 0;
      chunks.forEach((chunk) => {
        result.set(chunk, offset);
        offset += chunk.length;
      });
      imageBody = result.buffer;
    }

    await this.r2.uploadObject(imageId, imageBody, contentType);

    return {
      imageId,
      modelId,
      inputs,
      contentType
    };
  }

  async retrieveImageFromR2(imageId: string): Promise<R2ObjectBody | null> {
    if (!imageId) {
      throw new Error("Image ID is required for retrieval");
    }
    return this.r2.getObject(imageId);
  }
}
