import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json(
      { msg: "Invalid method invoked" },
      { status: 405 }
    );
  }

  // type: "screen" | "video" | "audio";
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
  if (fileType == "audio") {
    try {
      await prisma.audioChunksFilekeys.create({
        data: {
          userId: userId,
          MeetingId: meetingId,
          AudioChunkFileKey: fileKey,
        },
      });
      return NextResponse.json(
        { msg: "Successfully added fileKey to the DB." },
        { status: 201 }
      );
    } catch (e) {
      console.log(e);
      return NextResponse.json(
        { msg: "Error saving FileKey to database" },
        { status: 500 }
      );
    }
  } else if (fileType == "video") {
    try {
      await prisma.videoChunksFilekeys.create({
        data: {
          userId: userId,
          MeetingId: meetingId,
          VideoChunkFileKey: fileKey,
        },
      });
      return NextResponse.json(
        { msg: "Successfully added fileKey to the DB." },
        { status: 201 }
      );
    } catch (e) {
      console.log(e);
      return NextResponse.json(
        { msg: "Error saving FileKey to database" },
        { status: 500 }
      );
    }
  } else if (fileType == "screen") {
    try {
      await prisma.screenShareChunksFilekeys.create({
        data: {
          userId: userId,
          MeetingId: meetingId,
          ScreenShareChunkFileKey: fileKey,
        },
      });
      return NextResponse.json(
        { msg: "Successfully added fileKey to the DB." },
        { status: 201 }
      );
    } catch (e) {
      console.log(e);
      return NextResponse.json(
        { msg: "Error saving FileKey to database" },
        { status: 500 }
      );
    }
  }
}
