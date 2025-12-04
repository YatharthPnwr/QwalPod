import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.meetingId) {
    return NextResponse.json(
      { msg: "Invalid body arguments" },
      { status: 400 }
    );
  }
  try {
    const usersAndFileKeys = await prisma.recordings.findMany({
      select: {
        userId: true,
        audioFileKey: true,
        videoFileKey: true,
        thumbnailFileKey: true,
        screenShareFileKey: true,
      },
      where: {
        meetingId: body.meetingId,
      },
    });

    return NextResponse.json({
      usersAndFileKeys,
    });
  } catch (e) {
    return NextResponse.json(
      { msg: "Internal Server error", error: e },
      { status: 500 }
    );
  }
}
