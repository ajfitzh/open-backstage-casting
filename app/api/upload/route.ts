import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 🟢 Clean the endpoint to ensure we don't accidentally double up on "https://"
const rawEndpoint = process.env.DO_SPACES_ENDPOINT || "nyc3.digitaloceanspaces.com";
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, '');

const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || "us-east-1", // Keeps the AWS SDK happy under the hood
  endpoint: `https://${cleanEndpoint}`, 
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || "",
    secretAccessKey: process.env.DO_SPACES_SECRET || "",
  },
});

export async function POST(request: Request) {
  try {
    const { filename, fileType } = await request.json();

    // 1. Create a unique file name
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

    // 4. 🟢 Construct the final public URL for Baserow using the clean DO endpoint
    const publicUrl = `https://${process.env.DO_SPACES_BUCKET}.${cleanEndpoint}/${uniqueFilename}`;
    
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error("Presign Error:", error);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }
}