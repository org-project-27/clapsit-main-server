-- AlterTable
ALTER TABLE `AIConversationHistory` ADD COLUMN `saved` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `AIConversationKeys` ADD COLUMN `saved` BOOLEAN NULL DEFAULT false;
