import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || "us-east-1",
  endpoint: process.env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

export async function POST(request: Request) {
  try {
    const { filename, fileType } = await request.json();

    // 1. Create a unique file name (e.g., 17156223-video.mp4)
    const uniqueFilename = `${Date.now()}-${filename.replace(/\s/g, '-')}`;

    // 2. Prepare the command
    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: uniqueFilename,
      ContentType: fileType,
      ACL: 'public-read', // Makes the video viewable by your staff
    });

    // 3. Generate the Pre-Signed URL (Valid for 60 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    // 4. Construct the final public URL for Baserow
    const publicUrl = `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${uniqueFilename}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Presign Error:", error);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }
}