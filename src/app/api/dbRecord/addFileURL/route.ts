import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json(
      { msg: "Invalid method invoked" },
      { status: 405 }
    );
  }
  const body = await req.json();
  if (!body.meetingId || !body.userId || !body.fileType || !body.fileKey) {
    return NextResponse.json(
      {
        msg: "Missing body arguments",
      },
      { status: 400 }
    );
  }
  const { meetingId, userId, fileType, fileKey } = body;
  let params: {
    meetingId: string;
    userId: string;
    audioFileKey?: string;
    videoFileKey?: string;
    thumbnailFileKey?: string;
    screenShareFileKey?: string;
  } = {
    meetingId,
    userId,
  };

  if (fileType === "AUDIO") {
    params.audioFileKey = fileKey;
  } else if (fileType === "VIDEO") {
    params.videoFileKey = fileKey;
  } else if (fileType === "THUMBNAIL") {
    params.thumbnailFileKey = fileKey;
  } else if (fileType === "SCREEN") {
    params.screenShareFileKey = fileKey;
  } else {
    return NextResponse.json({ msg: "Invalid FileType" }, { status: 400 });
  }

  try {
    const res = await prisma.recordings.upsert({
      where: {
        userId_meetingId: {
          userId,
          meetingId,
        },
      },
      update: params,
      create: params,
    });

    const updatedRecord = await prisma.recordings.findUnique({
      where: {
        userId_meetingId: {
          userId,
          meetingId,
        },
      },
    });

    // Mark as COMPLETED only if all four keys are present
    if (
      updatedRecord?.audioFileKey &&
      updatedRecord?.videoFileKey &&
      updatedRecord?.thumbnailFileKey &&
      updatedRecord?.screenShareFileKey
    ) {
      await prisma.recordings.update({
        where: {
          userId_meetingId: {
            userId,
            meetingId,
          },
        },
        data: {
          status: "COMPLETED",
        },
      });
    }

    return NextResponse.json({ msg: res }, { status: 201 });
  } catch (e) {
    console.error("Error saving to database:", e);

    return NextResponse.json(
      { msg: "Error saving entry to database" },
      { status: 500 }
    );
  }
}
