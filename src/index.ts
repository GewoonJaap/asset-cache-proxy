import { Hono } from "hono";
import { cors } from "hono/cors";
import { GeminiApiRoute } from "./routes/geminiApiRoute";
import { ReplicateApiRoute } from "./routes/replicateApiRoute";
import { CfTextToImageRoute } from "./routes/cfTextToImageRoute";
import { authMiddleware } from "./middleware/authMiddleware";
import { CfTextToSpeechRoute } from "./routes/cfTextToSpeechRoute";
import genericUploadRoute from "./routes/genericUploadRoute"; // Added import
import { listMediaRoute } from "./routes/listMediaRoute"; // Import the new media list route

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS middleware
app.use("/api/*", cors());

// Auth middleware for specific Cloudflare AI proxy routes
app.use("/api/cf/text-to-image/*", authMiddleware);
app.use("/api/cf/text-to-speech/*", authMiddleware);

// Register routes
app.route("/api/gemini", GeminiApiRoute);
app.route("/api/replicate", ReplicateApiRoute);
app.route("/api/cf/text-to-image", CfTextToImageRoute);
app.route("/api/cf/text-to-speech", CfTextToSpeechRoute);
app.route("/api/upload", genericUploadRoute); // Added route for generic upload
app.route("/api/media", listMediaRoute); // Add the new media list route
app.get("/", (c) => {
  return c.text("Hello from Asset Cache Proxy! Visit /api for API routes.");
});

export default app;
