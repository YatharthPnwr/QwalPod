import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json(
      {
        msg: "Invalid method invoked",
      },
      { status: 405 }
    );
  }
  const body = await req.json();
  if (!body.fileName || !body.uploadId || !body.parts || !body.meetingId) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  const fileName = body.fileName;
  const uploadId = body.uploadId;
  const parts = body.parts;
  const meetingId = body.meetingId;

  const params = {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME as string,
    Key: `${meetingId}/${fileName}`,
    UploadId: uploadId,

    MultipartUpload: {
      Parts: parts.map((part: { etag: string }, index: number) => ({
        ETag: part.etag,
        PartNumber: index + 1,
      })),
    },
  };
  try {
    const data = await s3.completeMultipartUpload(params).promise();
    return NextResponse.json({ fileData: data }, { status: 200 });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return NextResponse.json(
      {
        error: "Error completing multipart upload",
        msg: error,
      },
      { status: 500 }
    );
  }
}
