/*
  Warnings:

  - Added the required column `segmentNum` to the `AudioChunksFilekeys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `segmentNum` to the `ScreenShareChunksFilekeys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `segmentNum` to the `VideoChunksFilekeys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AudioChunksFilekeys" ADD COLUMN     "segmentNum" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."ScreenShareChunksFilekeys" ADD COLUMN     "segmentNum" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."VideoChunksFilekeys" ADD COLUMN     "segmentNum" INTEGER NOT NULL;
