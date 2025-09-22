-- CreateEnum
CREATE TYPE "public"."UploadStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."Recordings" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioFileUrl" TEXT,
    "videoFileUrl" TEXT,
    "status" "public"."UploadStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recordings_userId_meetingId_key" ON "public"."Recordings"("userId", "meetingId");
