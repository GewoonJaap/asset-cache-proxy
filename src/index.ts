import { Hono } from "hono";
import { GeminiApiRoute } from "./routes/geminiApiRoute";
import { ReplicateApiRoute } from "./routes/replicateApiRoute";
import { CfTextToImageRoute } from "./routes/cfTextToImageRoute";
import { authMiddleware } from "./middleware/authMiddleware"; // Import the auth middleware

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Authentication Middleware for Text-to-Image Route
app.use("/api/cf/text-to-image/*", authMiddleware);

app.get("/", (c) => {
  return c.text("Asset Cache Proxy is running!");
});

app.route("/api/gemini", GeminiApiRoute);
app.route("/api/replicate", ReplicateApiRoute);
app.route("/api/cf/text-to-image", CfTextToImageRoute);

app.notFound((c) => c.text("Not found", 404));

export default app;
