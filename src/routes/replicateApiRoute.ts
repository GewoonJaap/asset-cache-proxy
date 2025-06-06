import { Hono } from "hono";

export const ReplicateApiRoute = new Hono<{ Bindings: CloudflareBindings }>();

ReplicateApiRoute.get('/replicate/:key1/:key2/:key3', async (c) => {
  const { key1, key2, key3 } = c.req.param();
  const replicateVideoUrl = `https://replicate.delivery/${key1}/${key2}/${key3}`;
  try {
    // @ts-ignore
    const response = await fetch(replicateVideoUrl);
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

//https://replicate.delivery/xezq/IjJpp5sfup1wFinC840xiwvRHO06E2seo3ZG1J4J5aolPE0UA/tmpcpjkrycc.mp4
