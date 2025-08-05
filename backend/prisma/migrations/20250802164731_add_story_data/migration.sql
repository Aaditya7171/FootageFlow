/*
  Warnings:

  - You are about to drop the column `transcript` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the column `transcriptTimestamps` on the `videos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "storyData" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetOTP" TEXT,
ADD COLUMN     "resetOTPExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "transcript",
DROP COLUMN "transcriptTimestamps";

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "segments" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcripts_videoId_key" ON "transcripts"("videoId");

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
