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
  if (
    !body.fileName ||
    !body.uploadId ||
    !body.partNumbers ||
    !body.fileType ||
    !body.meetingId
  ) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  const { fileName, uploadId, partNumbers, meetingId } = body;

  //converts the [undefined, undefined.. ] array into [1, 2, 3]
  const totalParts = Array.from({ length: partNumbers }, (_, i) => i + 1);
  try {
    //By using promise.all we execute all the async processes in parellel.
    //This does not block the thread in each for loop.
    const presignedUrls = await Promise.all(
      totalParts.map(async (partNumber) => {
        const params = {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: `${meetingId}/${fileName}`,
          PartNumber: partNumber,
          UploadId: uploadId,
          Expires: 3600 * 3,
        };
        //spread operator
        return s3.getSignedUrl("uploadPart", {
          ...params,
        });
      })
    );
    return NextResponse.json({ presignedUrls });
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    return NextResponse.json(
      { error: "Error generating presigned urls", msg: error },
      { status: 500 }
    );
  }
}
