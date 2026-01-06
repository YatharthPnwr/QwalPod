/*
  Warnings:

  - The primary key for the `AudioChunksFilekeys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `AudioChunksFilekeys` table. All the data in the column will be lost.
  - The primary key for the `ScreenShareChunksFilekeys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ScreenShareChunksFilekeys` table. All the data in the column will be lost.
  - The primary key for the `VideoChunksFilekeys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `VideoChunksFilekeys` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."AudioChunksFilekeys" DROP CONSTRAINT "AudioChunksFilekeys_pkey",
DROP COLUMN "id",
ADD COLUMN     "chunkNum" SERIAL NOT NULL,
ADD CONSTRAINT "AudioChunksFilekeys_pkey" PRIMARY KEY ("chunkNum");

-- AlterTable
ALTER TABLE "public"."ScreenShareChunksFilekeys" DROP CONSTRAINT "ScreenShareChunksFilekeys_pkey",
DROP COLUMN "id",
ADD COLUMN     "chunkNum" SERIAL NOT NULL,
ADD CONSTRAINT "ScreenShareChunksFilekeys_pkey" PRIMARY KEY ("chunkNum");

-- AlterTable
ALTER TABLE "public"."VideoChunksFilekeys" DROP CONSTRAINT "VideoChunksFilekeys_pkey",
DROP COLUMN "id",
ADD COLUMN     "chunkNum" SERIAL NOT NULL,
ADD CONSTRAINT "VideoChunksFilekeys_pkey" PRIMARY KEY ("chunkNum");
