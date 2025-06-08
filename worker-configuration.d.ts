declare namespace Cloudflare {
        interface Env {
        }
}
interface CloudflareBindings extends Cloudflare.Env {
    MEDIA_BUCKET: R2Bucket;
    AI: Ai;
    AUTH_GUID: string; // Added for authentication
    AI_GATEWAY_ID: string; // Added for AI Gateway configuration
}