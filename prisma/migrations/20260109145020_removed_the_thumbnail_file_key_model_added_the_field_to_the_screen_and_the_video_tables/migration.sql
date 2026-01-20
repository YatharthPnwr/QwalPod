/*
  Warnings:

  - You are about to drop the `FinalThumbnailKey` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ThumbnailFileKey` to the `FinalScreenFileKey` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ThumbnailFileKey` to the `FinalVideoKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."FinalScreenFileKey" ADD COLUMN     "ThumbnailFileKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."FinalVideoKey" ADD COLUMN     "ThumbnailFileKey" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."FinalThumbnailKey";
