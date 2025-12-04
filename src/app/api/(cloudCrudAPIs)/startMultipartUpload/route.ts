import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
import { CreateMultipartUploadRequest } from "aws-sdk/clients/s3";
export async function POST(req: NextRequest) {
  // initialization
  const body = await req.json();

  if (!body.fileName || !body.contentType || !body.meetingId) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  const fileName = body.fileName;
  const contentType = body.contentType;
  const meetingId = body.meetingId;
  const params: CreateMultipartUploadRequest = {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME as string,
    Key: `${meetingId}/${fileName}`,
  };

  // add extra params if content type is video
  if (contentType == "VIDEO" || contentType == "SCREEN") {
    params.ContentDisposition = "inline";
    params.ContentType = "video/webm";
  }

  //or if the content type is audio
  if (contentType == "AUDIO") {
    params.ContentDisposition = "inline";
    params.ContentType = "audio/webm";
  }

  try {
    const multipart = await s3.createMultipartUpload(params).promise();
    return NextResponse.json({ uploadId: multipart.UploadId });
  } catch (error) {
    console.error("Error starting multipart upload:", error);
    return NextResponse.json(
      { error: "Error starting multipart upload", msg: error },
      { status: 500 }
    );
  }
}
