import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.userId || !body.meetingId) {
    return NextResponse.json(
      {
        msg: "Invalid body arguments",
      },
      { status: 400 }
    );
  }
  const { meetingId, userId } = body;
  try {
    const res = await prisma.recordings.create({
      data: {
        userId: userId,
        meetingId: meetingId,
      },
    });
    return NextResponse.json(
      {
        msg: "user successfully added to the recordings table",
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        msg: "Error adding user to the table",
      },
      { status: 500 }
    );
  }
}
