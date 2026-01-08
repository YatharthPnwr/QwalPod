import { NextRequest, NextResponse } from "next/server";
import { addJobs } from "@/lib/bullMQ";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.meetingId || !body.userId) {
    return NextResponse.json(
      { msg: "Missing body arguments" },
      { status: 405 }
    );
  }
  const meetingId = body.meetingId;
  const userId = body.userId;

  //add a job
  try {
    await addJobs(`${meetingId}/${userId}/consolidate`, {
      meetingId: meetingId,
      userId: userId,
    });
    return NextResponse.json(
      { msg: "Successfully added job" },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ msg: "Failure in adding job" }, { status: 500 });
  }
}
