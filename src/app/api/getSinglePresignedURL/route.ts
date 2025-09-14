import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.fileName || !body.fileType) {
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

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      ContentType: fileType,
      Key: fileName,
      Expires: 60, // Expires in 60 seconds
      ACL: "public-read",
    };

    let url = await s3.getSignedUrlPromise("putObject", params);
    return NextResponse.json({ url });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Error generating presigned url", msg: err },
      { status: 500 }
    );
  }
}
