/*
  Warnings:

  - You are about to drop the column `fullText` on the `transcripts` table. All the data in the column will be lost.
  - You are about to drop the column `segments` on the `transcripts` table. All the data in the column will be lost.
  - Added the required column `transcriptions` to the `transcripts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transcripts" DROP COLUMN "fullText",
DROP COLUMN "segments",
ADD COLUMN     "processedLanguages" TEXT[],
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "transcriptions" JSONB NOT NULL;
