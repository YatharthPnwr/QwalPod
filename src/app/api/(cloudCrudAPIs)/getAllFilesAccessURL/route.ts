import { s3 } from "@/lib/aws/awsS3Client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { clerkClient } from "@/lib/clerk/clerkClient";

interface userKeyPath {
  userId: string;
  videoFileKey: string | null;
  audioFileKey: string | null;
  thumbnailFileKey: string | null;
}

interface userMeetingUrls {
  userId: string;
  userName: string;
  pic: string;
  videoURL?: string;
  audioURL?: string;
  thumbnailURL?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.meetingId) {
    return NextResponse.json(
      { msg: "Invalid body arguments" },
      { status: 400 }
    );
  }
  const meetingId = body.meetingId;
  try {
    const usersAndFileKeys: userKeyPath[] = await prisma.recordings.findMany({
      select: {
        userId: true,
        audioFileKey: true,
        videoFileKey: true,
        thumbnailFileKey: true,
      },
      where: {
        meetingId: meetingId,
      },
    });
    const meetingGetUrls: userMeetingUrls[] = await Promise.all(
      usersAndFileKeys.map(async (usr) => {
        let videoURL = "";
        let audioURL = "";
        let thumbnailURL = "";
        const user = await clerkClient.users.getUser(usr.userId);
        const userName = user.firstName;
        if (usr.videoFileKey && usr.videoFileKey.length > 0) {
          videoURL = getGETPresignedURL(usr.videoFileKey, userName as string);
        }
        if (usr.audioFileKey && usr.audioFileKey.length > 0) {
          audioURL = getGETPresignedURL(usr.audioFileKey, userName as string);
        }
        if (usr.thumbnailFileKey && usr.thumbnailFileKey.length > 0) {
          thumbnailURL = getGETPresignedURL(
            usr.thumbnailFileKey,
            userName as string
          );
        }

        const userProfilePic = user.imageUrl;
        return {
          userId: usr.userId as string,
          userName: userName as string,
          pic: userProfilePic as string,
          audioURL: audioURL,
          videoURL: videoURL,
          thumbnailURL: thumbnailURL,
        };
      })
    );
    return NextResponse.json({ urls: meetingGetUrls }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ msg: "Internal Server error" }, { status: 500 });
  }
}

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
