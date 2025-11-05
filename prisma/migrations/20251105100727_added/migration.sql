/*
  Warnings:

  - You are about to drop the column `sreenShareFileKey` on the `Recordings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Recordings" DROP COLUMN "sreenShareFileKey",
ADD COLUMN     "screenShareFileKey" TEXT;
