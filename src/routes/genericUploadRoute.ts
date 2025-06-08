import { Hono } from "hono";
import { GenericUploadService, GenericUploadInputs } from "../services/genericUploadService";

const genericUploadRoute = new Hono<{ Bindings: CloudflareBindings }>();

genericUploadRoute.post("/", async (c) => {
  try {
    const service = new GenericUploadService(c.env);
    const inputs = await c.req.json<GenericUploadInputs>();

    if (!inputs.data || !inputs.mimeType) {
      return c.json({ error: "Fields 'data' (base64 string) and 'mimeType' are required" }, 400);
    }

    const result = await service.storeBase64Data(inputs);
    return c.json(result, 201);
  } catch (error: any) {
    console.error("Error in POST /api/upload:", error.message, error.stack);
    return c.json({ error: "Failed to upload asset", details: error.message }, 500);
  }
});

genericUploadRoute.get("/:assetId", async (c) => {
  try {
    const service = new GenericUploadService(c.env);
    const assetId = c.req.param("assetId");

    if (!assetId) {
      return c.json({ error: "Asset ID is required" }, 400);
    }

    const r2Object = await service.retrieveAsset(assetId);

    if (!r2Object) {
      return c.json({ error: "Asset not found" }, 404);
    }

    c.header("Content-Type", r2Object.httpMetadata?.contentType || "application/octet-stream");
    c.header("Content-Length", r2Object.size.toString());
    c.header("ETag", r2Object.httpEtag);
    if (r2Object.uploaded) {
      c.header("Last-Modified", r2Object.uploaded.toUTCString());
    }

    return c.body(r2Object.body);
  } catch (error: any) {
    console.error(`Error in GET /api/upload/${c.req.param("assetId")}:`, error.message, error.stack);
    return c.json({ error: "Failed to retrieve asset", details: error.message }, 500);
  }
});

export default genericUploadRoute;
