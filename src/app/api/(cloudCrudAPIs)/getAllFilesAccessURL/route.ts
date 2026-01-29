import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma/client";
import { getGETPresignedURL } from "@/utils/functions/getGETPresignedURL";

interface finalAudioChunkKeys {
  audioChunkKeys: {
    [segmentNumber: number]: string[];
  };
}

interface finalVideoChunkKeys {
  videoChunkKeys: {
    [segmentNumber: number]: string[];
  };
}

interface finalScreenAudioAndVideoChunkKeys {
  screenChunkKeys: {
    [segmentNumber: number]: string[];
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.meetingId || !body.userId) {
    return NextResponse.json(
      { msg: "Invalid body arguments" },
      { status: 400 },
    );
  }
  const meetingId = body.meetingId;
  const userId = body.userId;
  try {
    const audioChunkFileKeys = await prisma.audioChunksFilekeys.findMany({
      select: {
        AudioChunkFileKey: true,
        segmentNum: true,
        chunkNum: true,
      },
      where: {
        MeetingId: meetingId,
        userId: userId,
      },
      orderBy: [
        {
          AudioChunkFileKey: "asc",
        },
      ],
    });

    const videoChunksFilekeys = await prisma.videoChunksFilekeys.findMany({
      select: {
        VideoChunkFileKey: true,
        segmentNum: true,
        chunkNum: true,
      },
      where: {
        userId: userId,
        MeetingId: meetingId,
      },
      orderBy: [
        {
          VideoChunkFileKey: "asc",
        },
      ],
    });
    const screenChunkFilekeys = await prisma.screenShareChunksFilekeys.findMany(
      {
        select: {
          ScreenShareChunkFileKey: true,
          segmentNum: true,
          chunkNum: true,
        },
        where: {
          userId: userId,
          MeetingId: meetingId,
        },
        orderBy: [
          {
            ScreenShareChunkFileKey: "asc",
          },
        ],
      },
    );

    //Organise all the chunks according to the segment numbers
    const finalAudioChunksKeys: finalAudioChunkKeys = {
      audioChunkKeys: {},
    };
    if (audioChunkFileKeys.length > 0) {
      audioChunkFileKeys.map((chunk) => {
        const segmentNum = chunk.segmentNum;
        const fileURL = toCdnUrl(
          getGETPresignedURL(chunk.AudioChunkFileKey, `audio_chunk_${userId}`),
        );
        if (
          Object.keys(finalAudioChunksKeys.audioChunkKeys).includes(
            segmentNum.toString(),
          )
        ) {
          //The segment is already created
          finalAudioChunksKeys.audioChunkKeys[segmentNum].push(fileURL);
        } else {
          //create a new segment and then push
          finalAudioChunksKeys.audioChunkKeys[segmentNum] = [fileURL];
        }
      });
    }

    const finalVideoChunkKeys: finalVideoChunkKeys = {
      videoChunkKeys: {},
    };
    if (videoChunksFilekeys.length > 0) {
      videoChunksFilekeys.map((chunk) => {
        const segmentNum = chunk.segmentNum;
        const fileURL = toCdnUrl(
          getGETPresignedURL(chunk.VideoChunkFileKey, `video_chunk_${userId}`),
        );
        if (
          Object.keys(finalVideoChunkKeys.videoChunkKeys).includes(
            chunk.segmentNum.toString(),
          )
        ) {
          //The segment is already present
          finalVideoChunkKeys.videoChunkKeys[segmentNum].push(fileURL);
        } else {
          finalVideoChunkKeys.videoChunkKeys[segmentNum] = [fileURL];
        }
      });
    }

    const finalScreenAudioAndVideoChunkKeys: finalScreenAudioAndVideoChunkKeys =
      {
        screenChunkKeys: {},
      };
    if (screenChunkFilekeys.length > 0) {
      screenChunkFilekeys.map((chunk) => {
        const segmentNum = chunk.segmentNum;
        const fileURL = toCdnUrl(
          getGETPresignedURL(
            chunk.ScreenShareChunkFileKey,
            `screen_chunk_${userId}`,
          ),
        );
        console.log("THE CDN LINK IS", fileURL);
        if (
          Object.keys(
            finalScreenAudioAndVideoChunkKeys.screenChunkKeys,
          ).includes(chunk.segmentNum.toString())
        ) {
          //the object for that segment number already exists
          finalScreenAudioAndVideoChunkKeys.screenChunkKeys[segmentNum].push(
            fileURL,
          );
        } else {
          finalScreenAudioAndVideoChunkKeys.screenChunkKeys[segmentNum] = [
            fileURL,
          ];
        }
      });
    }
    return NextResponse.json(
      {
        audioChunkSegments: finalAudioChunksKeys,
        videoChunkSegments: finalVideoChunkKeys,
        screenChunkSegments: finalScreenAudioAndVideoChunkKeys,
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { msg: "Internal Server error", error: e },
      { status: 500 },
    );
  }
}

function toCdnUrl(url: string) {
  return url.replace(".digitaloceanspaces.com", ".cdn.digitaloceanspaces.com");
}
