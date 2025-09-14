import AWS from "aws-sdk";

const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.DO_ENDPOINT,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
};
AWS.config.update(config);

export const s3 = new AWS.S3();
