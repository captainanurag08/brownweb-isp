import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

export interface ObjectStorage {
  put(key: string, data: Buffer | NodeJS.ReadableStream, contentType?: string): Promise<void>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  delete(key: string): Promise<void>;
}

class LocalDiskStorage implements ObjectStorage {
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Defence in depth against path traversal: strip any path separators from
    // the caller-controlled key entirely rather than trying to sanitize them.
    const safeKey = key.replace(/[/\\]/g, '_').replace(/^\.+/, '');
    const resolved = path.join(this.root, safeKey);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  async put(key: string, data: Buffer | NodeJS.ReadableStream): Promise<void> {
    const dest = this.resolve(key);
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    if (Buffer.isBuffer(data)) {
      await fsp.writeFile(dest, data);
    } else {
      await new Promise<void>((resolve, reject) => {
        const out = fs.createWriteStream(dest);
        data.pipe(out);
        out.on('finish', () => resolve());
        out.on('error', reject);
        data.on('error', reject);
      });
    }
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    return fs.createReadStream(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fsp.rm(this.resolve(key), { force: true });
  }
}

class S3ObjectStorage implements ObjectStorage {
  private client: S3Client;

  constructor(private readonly bucket: string) {
    this.client = new S3Client({
      endpoint: env.storageEndpoint,
      forcePathStyle: true, // required for MinIO-style S3-compatible endpoints
      region: 'us-east-1',
      credentials:
        env.storageAccessKey && env.storageSecretKey
          ? { accessKeyId: env.storageAccessKey, secretAccessKey: env.storageSecretKey }
          : undefined,
    });
  }

  async put(key: string, data: Buffer | NodeJS.ReadableStream, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data as never, ContentType: contentType })
    );
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return result.Body as unknown as NodeJS.ReadableStream;
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export const objectStorage: ObjectStorage =
  env.storageDriver === 's3' ? new S3ObjectStorage(env.storageBucket) : new LocalDiskStorage(env.storageLocalPath);
