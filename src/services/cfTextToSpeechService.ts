import { R2Helper } from "./R2Helper";
import { v4 as uuidv4 } from "uuid";

const TTS_MODEL_ID = "@cf/myshell-ai/melotts";

export interface TextToSpeechInputs {
  prompt: string;
  lang?: string;
}

export interface GenerateAudioResult {
  audioId: string;
  modelId: string;
  inputs: TextToSpeechInputs;
  contentType: string;
}

export class CfTextToSpeechService {
  private r2: R2Helper;
  private env: CloudflareBindings;
  private aiGatewayConfig?: { gateway: { id: string; skipCache: boolean; cacheTtl: number } };

  constructor(env: CloudflareBindings) {
    this.env = env;
    this.r2 = new R2Helper(env.MEDIA_BUCKET);
    if (env.AI_GATEWAY_ID) {
      this.aiGatewayConfig = {
        gateway: {
          id: env.AI_GATEWAY_ID,
          skipCache: false,
          cacheTtl: 3600 // Cache for 1 hour, adjust as needed
        }
      };
    }
  }

  async generateAndStoreAudio(inputs: TextToSpeechInputs): Promise<GenerateAudioResult> {
    if (!inputs.prompt) {
      throw new Error("Prompt is required for text-to-speech generation.");
    }

    const modelInputs = {
      text: inputs.prompt,
      voice: inputs.lang || "en-US"
    };
    const aiRunInputs = {
      prompt: inputs.prompt,
      lang: inputs.lang || "en" // Default to 'en' if not specified
    };

    console.log("Running AI model with inputs:", aiRunInputs);

    const audioId = uuidv4();
    const aiResponse = await this.env.AI.run(TTS_MODEL_ID, aiRunInputs, this.aiGatewayConfig);

    if (typeof aiResponse.audio !== "string") {
      throw new Error("Unexpected response format from melotts model. Expected { audio: string } with base64 content.");
    }

    console.log("AI response received, processing audio...");

    const binaryString = atob(aiResponse.audio);
    const byteArray = Uint8Array.from(binaryString, (m) => m.codePointAt(0) as number);
    const audioBuffer = byteArray.buffer;
    const contentType = "audio/mpeg";

    await this.r2.uploadObject(audioId, audioBuffer, contentType);

    return {
      audioId,
      modelId: TTS_MODEL_ID,
      inputs,
      contentType
    };
  }

  async retrieveAudioFromR2(audioId: string): Promise<R2ObjectBody | null> {
    if (!audioId) {
      throw new Error("Audio ID is required for retrieval");
    }
    return this.r2.getObject(audioId);
  }
}
