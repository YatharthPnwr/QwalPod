import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (
    !body.fileName ||
    !body.fileType ||
    !body.meetingId ||
    !body.userId ||
    !body.fileCategory ||
    !body.segmentNumber
  ) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  try {
    const fileName = body.fileName;
    const fileType = body.fileType;
    const meetingId = body.meetingId;
    const userId = body.userId;
    const fileCategory = body.fileCategory;
    const segmentNumber = body.segmentNumber;

    const params = {
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
      ContentType: fileType,
      Key: `${meetingId}/${userId}/${fileCategory}/${segmentNumber}/${fileName}`,
      Expires: 120, // Expires in 60 seconds
      ACL: "public-read",
    };

    const url = await s3.getSignedUrlPromise("putObject", params);
    return NextResponse.json({ url });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Error generating presigned url", msg: err },
      { status: 500 }
    );
  }
}
