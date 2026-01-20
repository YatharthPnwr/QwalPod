import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export default async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.userId || !body.meetingId) {
    return NextResponse.json(
      { msg: "Invalid Body arguments" },
      { status: 400 }
    );
  }
  const { userId, meetingId } = body;

  //Get the audioFile, videoFile, the thumbnailFile, and the screenFile.
  try {
    const audioRes = await prisma.finalAudioKey.findMany({
      select: {
        MeetingId: true,
        userId: true,
        segmentNum: true,
        AudioFileKey: true,
      },
      where: {
        userId: userId,
        MeetingId: meetingId,
      },
    });

    const videoRes = await prisma.finalVideoKey.findMany({
      select: {
        MeetingId: true,
        userId: true,
        segmentNum: true,
        VideoFileKey: true,
        ThumbnailFileKey: true,
      },
      where: {
        userId: userId,
        MeetingId: meetingId,
      },
    });

    const screenRes = await prisma.finalScreenFileKey.findMany({
      select: {
        MeetingId: true,
        userId: true,
        segmentNum: true,
        ScreenFileKey: true,
        ThumbnailFileKey: true,
      },
      where: {
        userId: userId,
        MeetingId: meetingId,
      },
    });
    const res = {
      audioFileLinks: audioRes,
      videoFileLinks: videoRes,
      screenFileLinks: screenRes,
    };
    NextResponse.json(
      {
        res,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { msg: "Could not retrieve the files" },
      { status: 500 }
    );
  }
}
