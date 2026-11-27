import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validateUploadRequest } from '@/app/lib/upload-validation';
import { inferUploadMimeType } from '@/app/lib/audition-workflow-helpers';

const rawEndpoint = process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com';
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, '');

const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || 'us-east-1',
  endpoint: `https://${cleanEndpoint}`,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
});

function sanitizePrefixSegment(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 48);
}

export async function POST(request: Request) {
  try {
    if (!process.env.DO_SPACES_BUCKET || !process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET) {
      return NextResponse.json(
        { error: 'Cloud storage is not configured on this server.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const filename = typeof body?.filename === 'string' ? body.filename : '';
    const resolvedType = inferUploadMimeType(filename, typeof body?.fileType === 'string' ? body.fileType : '');

    const validation = validateUploadRequest(filename, resolvedType);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Tenant-scoped object key prefix when provided
    const tenantPrefix = sanitizePrefixSegment(body?.tenant);
    const folderPrefix = sanitizePrefixSegment(body?.folder);
    const keyParts = [tenantPrefix, folderPrefix, `${Date.now()}-${validation.safeFilename}`].filter(Boolean);
    const objectKey = keyParts.join('/');

    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: objectKey,
      ContentType: validation.contentType,
      ACL: 'public-read',
    });

    // Presigned URL valid for 10 minutes (large mobile/desktop audition videos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
    const publicUrl = `https://${process.env.DO_SPACES_BUCKET}.${cleanEndpoint}/${objectKey}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      contentType: validation.contentType,
    });
  } catch (error) {
    console.error('Presign Error:', error);
    return NextResponse.json({ error: 'Failed to sign URL' }, { status: 500 });
  }
}
