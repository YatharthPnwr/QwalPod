/*
  Warnings:

  - Added the required column `userId` to the `AudioChunksFilekeys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ScreenShareChunksFilekeys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `VideoChunksFilekeys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AudioChunksFilekeys" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."ScreenShareChunksFilekeys" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."VideoChunksFilekeys" ADD COLUMN     "userId" TEXT NOT NULL;
