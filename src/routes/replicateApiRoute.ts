import { Hono } from "hono";
import { R2Helper } from "./R2Helper";

export const ReplicateApiRoute = new Hono<{ Bindings: CloudflareBindings }>();

ReplicateApiRoute.get("/:key1/:key2/:key3", async (c) => {
  const { key1, key2, key3 } = c.req.param();
  // @ts-ignore
  const r2 = new R2Helper(c.env.MEDIA_BUCKET);
  const r2Key = `${key1}/${key2}/${key3}`;

  // Try to fetch from R2 first
  const cached = await r2.getObject(r2Key);
  if (cached && cached.body) {
    return c.newResponse(cached.body, {
      status: 200,
      headers: {
        "Content-Type": cached.httpMetadata?.contentType || "video/mp4",
        "Cache-Control": "public, max-age=31536000",
        "X-R2-Cache": "HIT"
      }
    });
  }

  // Not in R2, fetch from Replicate
  const replicateVideoUrl = `https://replicate.delivery/${key1}/${key2}/${key3}`;
  try {
    // @ts-ignore
    const response = await fetch(replicateVideoUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch video: ${response.statusText}`, response.status);
    }
    // Store in R2
    const contentType = response.headers.get("Content-Type") || "video/mp4";
    const arrayBuffer = await response.arrayBuffer();
    await r2.uploadObject(r2Key, arrayBuffer, contentType);
    return c.newResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
        "X-R2-Cache": "MISS"
      }
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return c.text(`Error fetching video: ${errMsg}`, 500);
  }
});

//https://replicate.delivery/xezq/IjJpp5sfup1wFinC840xiwvRHO06E2seo3ZG1J4J5aolPE0UA/tmpcpjkrycc.mp4
