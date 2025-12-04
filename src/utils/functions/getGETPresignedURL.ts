import { s3 } from "@/lib/aws/awsS3Client";

export function getGETPresignedURL(fileKey: string, fileName: string) {
  return s3.getSignedUrl("getObject", {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename=${fileName}_${fileKey
      .split("_")
      .pop()}.webm`,
    Expires: 60 * 60 * 10, //10 hours
  });
}
