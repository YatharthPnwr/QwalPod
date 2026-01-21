import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { clerkClient } from "@/lib/clerk/clerkClient";
import { s3 } from "@/lib/aws/awsS3Client";

interface SegmentInfo {
  segNumber: number;
  link: string;
  thumbnailLink?: string;
}
interface UserFileUrls {
  userProfile: string;
  userName: string;
  audio: SegmentInfo[];
  video: SegmentInfo[];
  screen: SegmentInfo[];
}
interface GetAllFilesRes {
  [userId: string]: UserFileUrls;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("The body arguments are", body);
  if (!body.meetingId) {
    return NextResponse.json(
      {
        msg: "invalid body arguments",
      },
      { status: 500 },
    );
  }
  const { meetingId } = body;
  //Check if the user is authenticated
  //Get all the users in that meeting.
  const users = await prisma.recordings.findMany({
    select: {
      userId: true,
    },
    where: {
      meetingId: meetingId,
    },
  });

  //Get all the files paths
  //Audio
  const getAllFilesResponse: GetAllFilesRes = {};
  await Promise.all(
    users.map(async (user) => {
      const userInfo = clerkClient.users.getUser(user.userId);
      if (!userInfo) {
        return NextResponse.json(
          {
            msg: "Invalid userId",
          },
          { status: 400 },
        );
      }
      const username = (await userInfo).username;
      const profilePic = (await userInfo).imageUrl;

      const audioRes = await prisma.finalAudioKey.findMany({
        select: {
          AudioFileKey: true,
          segmentNum: true,
        },
        where: {
          userId: user.userId,
          MeetingId: meetingId,
        },
      });

      //video file
      const videoRes = await prisma.finalVideoKey.findMany({
        select: {
          VideoFileKey: true,
          segmentNum: true,
          ThumbnailFileKey: true,
        },
        where: {
          userId: user.userId,
          MeetingId: meetingId,
        },
      });

      //screen file
      const screenRes = await prisma.finalScreenFileKey.findMany({
        select: {
          ScreenFileKey: true,
          segmentNum: true,
          ThumbnailFileKey: true,
        },
        where: {
          userId: user.userId,
          MeetingId: meetingId,
        },
      });

      //Generate the GET links for audio video and screen
      const res: UserFileUrls = {
        userProfile: profilePic,
        userName: username as string,
        audio: [],
        video: [],
        screen: [],
      };

      audioRes.map((segment) => {
        const link = s3.getSignedUrl("getObject", {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: segment.AudioFileKey,
          ResponseContentDisposition: `attachment; filename=${user.userId}_audio_${segment.segmentNum}.mp3`,
          Expires: 60 * 60 * 10, //10 hours
        });
        res.audio.push({
          segNumber: segment.segmentNum,
          link: link,
        });
      });

      videoRes.map((segment) => {
        const link = s3.getSignedUrl("getObject", {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: segment.VideoFileKey,
          ResponseContentDisposition: `attachment; filename=${user.userId}_video_${segment.segmentNum}.mp4`,
          Expires: 60 * 60 * 10, //10 hours
        });
        const thumbnailLink = s3.getSignedUrl("getObject", {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: segment.ThumbnailFileKey,
          ResponseContentDisposition: `inline; filename=${user.userId}_thumbnail_${segment.segmentNum}.jpg`,
          Expires: 60 * 60 * 10,
        });
        res.video.push({
          segNumber: segment.segmentNum,
          link: link,
          thumbnailLink: thumbnailLink,
        });
      });

      screenRes.map((segment) => {
        const link = s3.getSignedUrl("getObject", {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: segment.ScreenFileKey,
          ResponseContentDisposition: `attachment; filename=${user.userId}_screen_${segment.segmentNum}.mp4`,
          Expires: 60 * 60 * 10, //10 hours
        });
        const thumbnailLink = s3.getSignedUrl("getObject", {
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
          Key: segment.ThumbnailFileKey,
          ResponseContentDisposition: `inline; filename=${user.userId}_screen_thumbnail_${segment.segmentNum}.jpg`,
          Expires: 60 * 60 * 10,
        });
        res.screen.push({
          segNumber: segment.segmentNum,
          link: link,
          thumbnailLink: thumbnailLink,
        });
      });

      const userId = user.userId;
      getAllFilesResponse[userId] = res;
    }),
  );
  return NextResponse.json(
    {
      getAllFilesResponse,
    },
    { status: 200 },
  );
}
