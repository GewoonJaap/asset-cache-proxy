import { Hono } from 'hono';

export const listMediaRoute = new Hono<{ Bindings: CloudflareBindings }>();

listMediaRoute.get('/', async (c) => {

    const env = c.env;

    try {
        const listOptions: R2ListOptions = {
            // You might want to filter by prefix if your objects are organized by content type
            // prefix: `media/${contentType}/`,
            include: ['httpMetadata'], // To get ContentType from metadata
        };

        const listed = await env.AI_CACHE_BUCKET.list(listOptions);
        let objects = listed.objects;

        // Note: R2 .list() is eventually consistent and may not return all objects
        // if writes were very recent. It also paginates at 1000 objects.
        // For production, you might need a more robust listing/pagination strategy.
        let truncated = listed.truncated;
        let cursor = listed.cursor;

        while (truncated) {
            const nextListed = await env.AI_CACHE_BUCKET.list({
                ...listOptions,
                cursor: cursor,
            });
            objects = objects.concat(nextListed.objects);
            truncated = nextListed.truncated;
            cursor = nextListed.cursor;
            if (!cursor) break; // Break if cursor is null/undefined to prevent infinite loop on empty buckets or last page
        }

        const filteredMedia = objects
            .map(obj => ({
                key: obj.key,
                url: `https://${env.R2_MEDIA_BASE_URL}/${obj.key}`,
                size: obj.size,
                uploaded: obj.uploaded,
                contentType: obj.httpMetadata?.contentType,
            }));

        return c.json(filteredMedia);
    } catch (e: any) {
        console.error('Error listing media:', e);
        return c.text(`Error listing media: ${e.message}`, 500);
    }
});
