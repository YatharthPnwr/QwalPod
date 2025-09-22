/*
  Warnings:

  - You are about to drop the column `audioFileUrl` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `videoFileUrl` on the `Recordings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Recordings" DROP COLUMN "audioFileUrl",
DROP COLUMN "videoFileUrl",
ADD COLUMN     "audioFileKey" TEXT,
ADD COLUMN     "videoFileKey" TEXT;
