export class R2Helper {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  async uploadObject(
    key: string,
    body: ReadableStream | ArrayBuffer | string,
    contentType = "application/octet-stream"
  ) {
    await this.bucket.put(key, body, {
      httpMetadata: { contentType }
    });
  }

  async getObject(key: string): Promise<R2ObjectBody | null> {
    const object = await this.bucket.get(key);
    return object;
  }
}

// Usage example (in your route):
// const r2 = new R2Helper(c.env.YOUR_BUCKET_BINDING);
// await r2.uploadObject('some-key', videoStream, 'video/mp4');
// const obj = await r2.getObject('some-key');
