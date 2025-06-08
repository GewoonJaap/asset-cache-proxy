import { Hono } from "hono";
import { GeminiApiRoute } from "./routes/geminiApiRoute";
import { ReplicateApiRoute } from "./routes/replicateApiRoute";
import { CfTextToImageRoute } from "./routes/cfTextToImageRoute"; // Added import

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/api/gemini", GeminiApiRoute);
app.route("/api/replicate", ReplicateApiRoute);
app.route("/api/cf/text-to-image", CfTextToImageRoute); // Added route

app.notFound((c) => c.text("Not found", 404));

export default app;
