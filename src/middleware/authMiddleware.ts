import { Context, Next } from "hono";

export const authMiddleware = async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
  const apiKey = c.req.header("X-Auth-Guid");
  if (!apiKey || apiKey !== c.env.AUTH_GUID) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
