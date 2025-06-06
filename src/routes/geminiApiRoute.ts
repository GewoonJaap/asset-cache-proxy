import { Hono } from "hono";

export const GeminiApiRoute = new Hono<{ Bindings: CloudflareBindings }>();

GeminiApiRoute.get('/veo/:videoid/:apikey', async (c) => {
  const { videoid, apikey } = c.req.param();
  const googleVideoUrl = `https://generativelanguage.googleapis.com/download/v1beta/files/${videoid}:download?alt=media&key=${apikey}`;
  try {
    // @ts-ignore
    const response = await fetch(googleVideoUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch video: ${response.statusText}`, response.status);
    }
    return c.newResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return c.text(`Error fetching video: ${errMsg}`, 500);
  }
});

GeminiApiRoute.get('/veo/:videoid/:apikey/video.mp4', async (c) => {
  const { videoid, apikey } = c.req.param();
  const googleVideoUrl = `https://generativelanguage.googleapis.com/download/v1beta/files/${videoid}:download?alt=media&key=${apikey}`;
  try {
    // @ts-ignore
    const response = await fetch(googleVideoUrl);
    if (!response.ok) {
      return c.text(`Failed to fetch video: ${response.statusText}`, response.status);
    }
    return c.newResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
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