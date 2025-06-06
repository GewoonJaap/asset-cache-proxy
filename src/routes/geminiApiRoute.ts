import { Hono } from "hono";
import { R2Helper } from "./R2Helper";

export const GeminiApiRoute = new Hono<{ Bindings: CloudflareBindings }>();

GeminiApiRoute.get('/veo/:videoid/:apikey', async (c) => {
  const { videoid, apikey } = c.req.param();
  // @ts-ignore
  const r2 = new R2Helper(c.env.MEDIA_BUCKET);
  const r2Key = `${videoid}/${apikey}`;

  // Try to fetch from R2 first
  const cached = await r2.getObject(r2Key);
  if (cached && cached.body) {
    return c.newResponse(cached.body, {
      status: 200,
      headers: {
        'Content-Type': cached.httpMetadata?.contentType || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
        'X-R2-Cache': 'HIT',
      },
    });
  }

  // Not in R2, fetch from Gemini
  const googleVideoUrl = `https://generativelanguage.googleapis.com/download/v1beta/files/${videoid}:download?alt=media&key=${apikey}`;
  try {
    // @ts-ignore
    const response = await fetch(googleVideoUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch video: ${response.statusText}`, response.status);
    }
    // Store in R2
    const contentType = response.headers.get('Content-Type') || 'video/mp4';
    const arrayBuffer = await response.arrayBuffer();
    await r2.uploadObject(r2Key, arrayBuffer, contentType);
    return c.newResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-R2-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return c.text(`Error fetching video: ${errMsg}`, 500);
  }
});

GeminiApiRoute.get('/veo/:videoid/:apikey/video.mp4', async (c) => {
  const { videoid, apikey } = c.req.param();
  // @ts-ignore
  const r2 = new R2Helper(c.env.MEDIA_BUCKET);
  const r2Key = `${videoid}/${apikey}/video.mp4`;

  // Try to fetch from R2 first
  const cached = await r2.getObject(r2Key);
  if (cached && cached.body) {
    return c.newResponse(cached.body, {
      status: 200,
      headers: {
        'Content-Type': cached.httpMetadata?.contentType || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
        'X-R2-Cache': 'HIT',
      },
    });
  }

  // Not in R2, fetch from Gemini
  const googleVideoUrl = `https://generativelanguage.googleapis.com/download/v1beta/files/${videoid}:download?alt=media&key=${apikey}`;
  try {
    // @ts-ignore
    const response = await fetch(googleVideoUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch video: ${response.statusText}`, response.status);
    }
    // Store in R2
    const contentType = response.headers.get('Content-Type') || 'video/mp4';
    await r2.uploadObject(r2Key, response.body, contentType);
    return c.newResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-R2-Cache': 'MISS',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return c.text(`Error fetching video: ${errMsg}`, 500);
  }
});

// Fallback for invalid routes
GeminiApiRoute.all('/veo/*', (c) =>
  c.text('Invalid route. Use /veo/:videoid/:apikey or /veo/:videoid/:apikey/video.mp4', 400)
);
