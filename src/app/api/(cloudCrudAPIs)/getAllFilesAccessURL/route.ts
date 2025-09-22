import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
interface meeting {
  meetingId: string;
  usersKeyPaths: userKeyPath[];
}

interface userKeyPath {
  userId: string;
  videoKey: string;
  audioKey: string;
  thumbnailKey: string;
}

interface meetingUrl {
  meetingId: string;
  Urls: userMeetingUrls[];
}
interface userMeetingUrls {
  userId: string;
  videoURL?: string;
  audioURL?: string;
  thumbnailURL?: string;
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const meetings: meeting[] = body.meetings;
  if (!body.meetings) {
    return NextResponse.json(
      { msg: "Invalid body arguments" },
      { status: 400 }
    );
  }
  const allMeetingGetURLs: meetingUrl[] = [];
  meetings.forEach((meeting) => {
    const meetingGetUrls: userMeetingUrls[] = [];
    const meetingId = meeting.meetingId;
    meeting.usersKeyPaths.forEach((usr) => {
      let videoURL = "";
      let audioURL = "";
      let thumbnailURL = "";
      if (usr.videoKey.length > 0) {
        videoURL = getGETPresignedURL(usr.videoKey);
      }
      if (usr.audioKey.length > 0) {
        audioURL = getGETPresignedURL(usr.audioKey);
      }
      if (usr.thumbnailKey.length > 0) {
        thumbnailURL = getGETPresignedURL(usr.thumbnailKey);
      }

      meetingGetUrls.push({
        userId: usr.userId,
        audioURL: audioURL,
        videoURL: videoURL,
        thumbnailURL: thumbnailURL,
      });
    });
    allMeetingGetURLs.push({
      meetingId: meetingId,
      Urls: meetingGetUrls,
    });
  });
  return NextResponse.json({ urls: allMeetingGetURLs }, { status: 200 });
}

export function getGETPresignedURL(fileKey: string) {
  return s3.getSignedUrl("getObject", {
    Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
    Key: fileKey,
    Expires: 60 * 60 * 10, //10 hours
  });
}
