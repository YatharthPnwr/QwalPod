/*
  Warnings:

  - You are about to drop the column `audioChunkFileKey` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `screenShareChunkKey` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailFileKey` on the `Recordings` table. All the data in the column will be lost.
  - You are about to drop the column `videoChunkFileKey` on the `Recordings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Recordings" DROP COLUMN "audioChunkFileKey",
DROP COLUMN "screenShareChunkKey",
DROP COLUMN "thumbnailFileKey",
DROP COLUMN "videoChunkFileKey";
