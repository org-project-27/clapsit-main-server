/*
  Warnings:

  - Added the required column `model` to the `AIConversationKeys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `AIConversationKeys` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `AIConversationKeys` ADD COLUMN `model` VARCHAR(255) NOT NULL,
    ADD COLUMN `topic` TEXT NOT NULL;
