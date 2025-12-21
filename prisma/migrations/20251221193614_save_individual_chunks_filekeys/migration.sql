/*
  Warnings:

  - You are about to drop the column `audioFileKey` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `screenShareFileKey` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `videoFileKey` on the `Recordings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Recordings_userId_meetingId_key";

-- AlterTable
ALTER TABLE "public"."Recordings" DROP COLUMN "audioFileKey",
DROP COLUMN "screenShareFileKey",
DROP COLUMN "status",
DROP COLUMN "videoFileKey",
ADD COLUMN     "audioChunkFileKey" TEXT,
ADD COLUMN     "screenShareChunkKey" TEXT,
ADD COLUMN     "videoChunkFileKey" TEXT;

-- CreateTable
CREATE TABLE "public"."AudioChunksFilekeys" (
    "id" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "AudioChunkFileKey" TEXT NOT NULL,

    CONSTRAINT "AudioChunksFilekeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VideoChunksFilekeys" (
    "id" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "VideoChunkFileKey" TEXT NOT NULL,

    CONSTRAINT "VideoChunksFilekeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScreenShareChunksFilekeys" (
    "id" TEXT NOT NULL,
    "MeetingId" TEXT NOT NULL,
    "ScreenShareChunkFileKey" TEXT NOT NULL,

    CONSTRAINT "ScreenShareChunksFilekeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AudioChunksFilekeys_MeetingId_AudioChunkFileKey_key" ON "public"."AudioChunksFilekeys"("MeetingId", "AudioChunkFileKey");

-- CreateIndex
CREATE UNIQUE INDEX "VideoChunksFilekeys_MeetingId_VideoChunkFileKey_key" ON "public"."VideoChunksFilekeys"("MeetingId", "VideoChunkFileKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenShareChunksFilekeys_MeetingId_ScreenShareChunkFileKey_key" ON "public"."ScreenShareChunksFilekeys"("MeetingId", "ScreenShareChunkFileKey");
