import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
import { CreateMultipartUploadRequest } from "aws-sdk/clients/s3";
export async function POST(req: NextRequest) {
  // initialization
  const body = await req.json();

  if (
    !body.fileName ||
    !body.contentType ||
    !body.meetingId ||
    !body.userId ||
    !body.fileType ||
    !body.segmentNumber
  ) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  const fileName = body.fileName;
  const fileType = body.fileType;
  const contentType = body.contentType;
  const meetingId = body.meetingId;
  const userId = body.userId;
  const segmentNumber = body.segmentNumber;

  const params: CreateMultipartUploadRequest = {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME as string,
    Key: `${meetingId}/${userId}/${fileType}/${segmentNumber}/${fileName}`,
  };

  // add extra params if content type is video
  if (contentType == "video/webm") {
    params.ContentDisposition = "inline";
    params.ContentType = "video/webm";
  }

  //or if the content type is audio
  if (contentType == "audio/webm") {
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
