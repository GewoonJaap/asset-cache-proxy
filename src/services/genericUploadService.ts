import { R2Helper } from "./R2Helper"; // R2Helper is in the same services/ directory
import { v4 as uuidv4 } from "uuid";

export interface GenericUploadInputs {
  data: string; // base64 encoded
  mimeType: string;
}

export interface GenericUploadResult {
  id: string;
  mimeType: string;
}

export class GenericUploadService {
  private r2: R2Helper;

  constructor(env: CloudflareBindings) {
    this.r2 = new R2Helper(env.MEDIA_BUCKET);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Cloudflare Workers provide atob()
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async storeBase64Data(inputs: GenericUploadInputs): Promise<GenericUploadResult> {
    if (!inputs.data || !inputs.mimeType) {
      throw new Error("Base64 data (field: data) and mimeType are required.");
    }

    const assetId = uuidv4();
    // Ensure the data is just the base64 string, without data URI prefix
    const base64Data = inputs.data.includes(",") ? inputs.data.split(",")[1] : inputs.data;
    const assetBuffer = this.base64ToArrayBuffer(base64Data);

    await this.r2.uploadObject(assetId, assetBuffer, inputs.mimeType);

    return {
      id: assetId,
      mimeType: inputs.mimeType
    };
  }

  async retrieveAsset(assetId: string): Promise<R2ObjectBody | null> {
    if (!assetId) {
      throw new Error("Asset ID is required for retrieval.");
    }
    return this.r2.getObject(assetId);
  }
}
