-- CreateTable
CREATE TABLE "public"."FinalAudioKey" (
    "fileNum" SERIAL NOT NULL,
    "segmentNum" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "AudioFileKey" TEXT NOT NULL,

    CONSTRAINT "FinalAudioKey_pkey" PRIMARY KEY ("fileNum")
);

-- CreateTable
CREATE TABLE "public"."FinalVideoKey" (
    "fileNum" SERIAL NOT NULL,
    "segmentNum" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "VideoFileKey" TEXT NOT NULL,

    CONSTRAINT "FinalVideoKey_pkey" PRIMARY KEY ("fileNum")
);

-- CreateTable
CREATE TABLE "public"."FinalScreenFileKey" (
    "fileNum" SERIAL NOT NULL,
    "segmentNum" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "ScreenFileKey" TEXT NOT NULL,

    CONSTRAINT "FinalScreenFileKey_pkey" PRIMARY KEY ("fileNum")
);

-- CreateTable
CREATE TABLE "public"."FinalThumbnailKey" (
    "fileNum" SERIAL NOT NULL,
    "segmentNum" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "ThumbnailFileKey" TEXT NOT NULL,

    CONSTRAINT "FinalThumbnailKey_pkey" PRIMARY KEY ("fileNum")
);
