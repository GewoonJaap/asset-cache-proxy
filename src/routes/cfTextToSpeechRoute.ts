import { Hono } from "hono";
import { CfTextToSpeechService, TextToSpeechInputs } from "../services/cfTextToSpeechService";

export const CfTextToSpeechRoute = new Hono<{ Bindings: CloudflareBindings }>();

CfTextToSpeechRoute.post("/", async (c) => {
  try {
    const service = new CfTextToSpeechService(c.env);
    const inputs = await c.req.json<TextToSpeechInputs>();

    if (!inputs.prompt) {
      return c.json({ error: "Prompt is required" }, 400);
    }

    const result = await service.generateAndStoreAudio(inputs);
    return c.json(result, 201);
  } catch (error: any) {
    console.error("Error in POST /api/cf/text-to-speech:", error.message, error.stack);
    return c.json({ error: "Failed to generate audio", details: error.message }, 500);
  }
});

CfTextToSpeechRoute.get("/:audioId", async (c) => {
  try {
    const service = new CfTextToSpeechService(c.env);
    const audioId = c.req.param("audioId");

    if (!audioId) {
      return c.json({ error: "Audio ID is required" }, 400);
    }

    const r2Object = await service.retrieveAudioFromR2(audioId);

    if (!r2Object) {
      return c.json({ error: "Audio not found" }, 404);
    }

    // Set appropriate headers
    c.header("Content-Type", r2Object.httpMetadata?.contentType || "audio/mpeg");
    c.header("Content-Length", r2Object.size.toString());
    c.header("ETag", r2Object.httpEtag);
    if (r2Object.uploaded) {
      c.header("Last-Modified", r2Object.uploaded.toUTCString());
    }

    // Return the audio stream
    return c.body(r2Object.body);
  } catch (error: any) {
    console.error(`Error in GET /api/cf/text-to-speech/${c.req.param("audioId")}:`, error.message, error.stack);
    return c.json({ error: "Failed to retrieve audio", details: error.message }, 500);
  }
});
