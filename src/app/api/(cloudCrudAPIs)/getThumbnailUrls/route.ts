import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { getGETPresignedURL } from "../getAllFilesAccessURL/route";
interface userMeetingVideoData {
  meetingId: string;
  thumbnailUrl: string;
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.userId) {
    return NextResponse.json(
      { msg: "Invalid body arguments" },
      { status: 400 }
    );
  }
  const userId = body.userId;
  const userRecordings = await prisma.recordings.findMany({
    where: {
      userId: userId,
    },
    select: {
      thumbnailFileKey: true,
      meetingId: true,
    },
  });
  const userThumbnails: userMeetingVideoData[] = [];
  console.log(userRecordings);
  userRecordings.map((recording) => {
    const thumbnailKey = recording.thumbnailFileKey;
    const meetingId = recording.meetingId;
    if (thumbnailKey != undefined) {
      const thumbnailUrl = getGETPresignedURL(thumbnailKey);
      userThumbnails.push({ thumbnailUrl: thumbnailUrl, meetingId: meetingId });
    }
  });
  return NextResponse.json({
    userThumbnails: userThumbnails,
  });
}
