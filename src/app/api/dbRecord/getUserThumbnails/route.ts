import { NextRequest, NextResponse } from "next/server";
import { getGETPresignedURL } from "@/utils/functions/getGETPresignedURL";
import prisma from "@/lib/prisma/client";
import { clerkClient } from "@/lib/clerk/clerkClient";

interface thumbnailURL {
  meetingId: string;
  thumbnailUrl: string;
}
export async function POST(req: NextRequest) {
  const bodyArgs = await req.json();
  const userId = bodyArgs.userId;
  const username = (await clerkClient.users.getUser(userId)).firstName;
  console.log(userId);
  if (!userId) {
    NextResponse.json({
      err: "Failed to find userId in the body",
    });
  }

  //Find the fileKeys of the thumbnail
  try {
    const thumbnailFileKeys = await prisma.recordings.findMany({
      select: {
        thumbnailFileKey: true,
        meetingId: true,
      },
      where: {
        userId: userId,
      },
    });
    //For each file key find the url
    const thumbnailURLs: thumbnailURL[] = [];
    thumbnailFileKeys.forEach((meeting) => {
      const fileKey = meeting.thumbnailFileKey as string;
      const meetingId = meeting.meetingId;
      let thumbnailURL;
      if (meeting.thumbnailFileKey) {
        thumbnailURL = getGETPresignedURL(fileKey, username as string);
      }
      const thumbnailLinkAndMeetingId: thumbnailURL = {
        thumbnailUrl: thumbnailURL as string,
        meetingId: meetingId,
      };
      thumbnailURLs.push(thumbnailLinkAndMeetingId);
    });
    //get the urls of the thumbnails
    return NextResponse.json({ userThumbnails: thumbnailURLs });
  } catch (e) {
    return NextResponse.json({ err: "Error in getting the user thumbnail." });
  }
}
