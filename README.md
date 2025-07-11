# Asset Cache Proxy

A Cloudflare Worker proxy that caches assets from the Google Gemini API and Replicate.com using an R2 storage bucket. This enables efficient, cost-effective, and persistent caching of large assets (such as video files) generated by AI services, reducing redundant API calls and improving response times for repeated requests.

## Features
- **Proxy and cache for Google Gemini API video assets**
- **Proxy and cache for Replicate.com video assets**
- **Cloudflare AI Text-to-Image generation with R2 caching** (Supports Stable Diffusion & Flux Schnell)
- **Cloudflare AI Text-to-Speech with R2 caching**
- **Persistent storage using Cloudflare R2**
- **Automatic cache lookup and population**
- **Fast delivery for repeated requests (cache hits)**

## How It Works
- When a request is made for a Gemini or Replicate asset, the Worker first checks the R2 bucket for a cached copy.
- If found, the asset is served directly from R2 (cache hit).
- If not found, the Worker fetches the asset from the upstream API, stores it in R2, and then serves it to the client (cache miss).
- For Cloudflare Text-to-Image, the image is generated, stored in R2, and an image ID is returned. The image can then be retrieved via its ID.
- For Cloudflare Text-to-Speech, the audio is generated from text, stored in R2, and an audio ID is returned. The audio can then be retrieved via its ID.

## Endpoints

### Gemini API
- `GET /api/gemini/veo/:videoid/:apikey`
- `GET /api/gemini/veo/:videoid/:apikey/video.mp4`

### Replicate.com
- `GET /api/replicate/:key1/:key2/:key3`

### Cloudflare Text-to-Image (Authentication Required)
- `POST /api/cf/text-to-image` - Generates an image and returns an image ID.
  - Request Body: `{ "model": "stable-diffusion" | "flux-schnell", "prompt": "your prompt", ...other_model_params }`
  - Headers: `X-Auth-Guid: YOUR_AUTH_GUID`
- `GET /api/cf/text-to-image/:imageId` - Retrieves a previously generated image by its ID.
  - Headers: `X-Auth-Guid: YOUR_AUTH_GUID`

### Cloudflare Text-to-Speech (TTS)
- `POST /api/cf/text-to-speech` - Generates audio from text and returns an audio ID.
  - Request Body: `{ "prompt": "your text", "lang": "en-US" }`
  - Headers: `X-Auth-Guid: YOUR_AUTH_GUID`
- `GET /api/cf/text-to-speech/:audioId` - Retrieves a previously generated audio file by its ID.
  - Headers: `X-Auth-Guid: YOUR_AUTH_GUID`

### Generic Base64 Upload

Allows uploading any file encoded as a base64 string. The file is stored in R2 and can be retrieved via its generated ID.

*   **Authentication**: `POST /api/upload` requires `X-Auth-Guid` header with the configured `AUTH_GUID`. The `GET /api/upload/:id` endpoint does not require authentication.

**Endpoints**:

1.  **`POST /api/upload`**: Upload Base64 Data (Authenticated)
    *   **Headers**:
        *   `Content-Type: application/json`
        *   `X-Auth-Guid: YOUR_AUTH_GUID`
    *   **Request Body** (JSON):
        ```json
        {
          "data": "<base64_encoded_string_of_the_file_content>",
          "mimeType": "image/png" // Or video/mp4, application/pdf, text/plain, etc.
        }
        ```
    *   **Success Response** (201 Created, JSON):
        ```json
        {
          "id": "<uuid_of_the_uploaded_file>",
          "mimeType": "image/png"
        }
        ```
    *   **Error Responses**:
        *   `400 Bad Request`: If `data` or `mimeType` is missing.
        *   `401 Unauthorized`: If `X-Auth-Guid` is missing or invalid.
        *   `500 Internal Server Error`: If file storage fails.

2.  **`GET /api/upload/:assetId`**: Retrieve Uploaded File (Public)
    *   **URL Parameters**:
        *   `assetId`: The UUID of the file to retrieve.
    *   **Success Response** (200 OK):
        *   Body: The file content.
        *   Headers:
            *   `Content-Type`: The MIME type of the file.
            *   `Content-Length`: The size of the file in bytes.
            *   `ETag`: The ETag of the R2 object.
            *   `Last-Modified`: The last modified date of the R2 object.
    *   **Error Responses**:
        *   `404 Not Found`: If the file with the given `assetId` does not exist in R2.
        *   `500 Internal Server Error`: If retrieval fails.

## Usage

1. **Install dependencies:**
   ```sh
   yarn install
   ```
2. **Start local development:**
   ```sh
   yarn dev
   ```
3. **Deploy to Cloudflare:**
   ```sh
   yarn deploy
   ```
4. **Generate/synchronize types:**
   ```sh
   yarn cf-typegen
   ```

## Configuration

- The R2 bucket binding is defined in `wrangler.toml` as `MEDIA_BUCKET`.
- The AI binding for Cloudflare Text-to-Image is defined in `wrangler.toml` as `AI`.
- You must have a Cloudflare account and an R2 bucket set up. Update the `bucket_name` in `wrangler.toml` as needed.
- API keys for Gemini and Replicate are passed as part of the request path.

### Text-to-Image Authentication
- The `/api/cf/text-to-image/*` routes require authentication.
- You must set a secret named `AUTH_GUID` in your Cloudflare Worker environment variables (Settings > Variables > Add variable, then encrypt it).
- For local development, create a `.dev.vars` file in the project root and add `AUTH_GUID="YOUR_CHOSEN_GUID"`.
- Include the header `X-Auth-Guid` with your configured GUID in requests to these endpoints.

### Text-to-Speech Authentication
- The `/api/cf/text-to-speech/*` routes require authentication.
- You must set a secret named `AUTH_GUID` in your Cloudflare Worker environment variables (Settings > Variables > Add variable, then encrypt it).
- For local development, create a `.dev.vars` file in the project root and add `AUTH_GUID="YOUR_CHOSEN_GUID"`.
- Include the header `X-Auth-Guid` with your configured GUID in requests to these endpoints.

### Base64 Upload Authentication
- The `POST /api/upload` route requires authentication. The `GET /api/upload/:assetId` route is public.
- You must set a secret named `AUTH_GUID` in your Cloudflare Worker environment variables (Settings > Variables > Add variable, then encrypt it).
- For local development, create a `.dev.vars` file in the project root and add `AUTH_GUID="YOUR_CHOSEN_GUID"`.
- Include the header `X-Auth-Guid` with your configured GUID in requests to the `POST /api/upload` endpoint.

## Example Request

**Gemini/Replicate:**
```
GET /api/gemini/veo/VIDEO_ID/API_KEY
GET /api/replicate/xezq/IjJpp5sfup1wFinC840xiwvRHO06E2seo3ZG1J4J5aolPE0UA/tmpcpjkrycc.mp4
```

**Cloudflare Text-to-Image (Authenticated):**
```http
POST /api/cf/text-to-image
Content-Type: application/json
X-Auth-Guid: YOUR_AUTH_GUID

{
  "model": "stable-diffusion",
  "prompt": "A beautiful sunset over mountains"
}
```

```http
GET /api/cf/text-to-image/your-generated-image-id
X-Auth-Guid: YOUR_AUTH_GUID
```

**Cloudflare Text-to-Speech (Authenticated):**
```http
POST /api/cf/text-to-speech
Content-Type: application/json
X-Auth-Guid: YOUR_AUTH_GUID

{
  "prompt": "Hello, this is a test of the text-to-speech service.",
  "lang": "en-US"
}
```

```http
GET /api/cf/text-to-speech/your-generated-audio-id
X-Auth-Guid: YOUR_AUTH_GUID
```

**Base64 Upload (Authenticated POST, Public GET):**
```http
# @name genericUploadPost
POST {{hostname}}/api/upload
Content-Type: application/json
X-Auth-Guid: {{authGuid}}

{
  "data": "SGVsbG8gV29ybGQh", // "Hello World!"
  "mimeType": "text/plain"
}

###
# @name getUploadedAsset
# @prompt assetId Please enter the assetId from the genericUploadPost response
GET {{hostname}}/api/upload/{{assetId}}
```

## Development

- Use `yarn dev` to start the Worker in development mode.
- Use `yarn deploy` to deploy the Worker to Cloudflare.
- Use `yarn cf-typegen` to generate or synchronize TypeScript types for Cloudflare APIs.