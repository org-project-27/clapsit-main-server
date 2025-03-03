-- CreateTable
CREATE TABLE `AIConversationKeys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_key` VARCHAR(255) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `key_name` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `AIConversationKeys_conversation_key_key`(`conversation_key`),
    INDEX `user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AIConversationHistory` (
    `conversation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_key` VARCHAR(255) NOT NULL,
    `question` TEXT NOT NULL,
    `response` TEXT NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `conversation_key`(`conversation_key`),
    PRIMARY KEY (`conversation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AIConversationKeys` ADD CONSTRAINT `AIConversationKeys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `AIConversationHistory` ADD CONSTRAINT `AIConversationHistory_conversation_key_fkey` FOREIGN KEY (`conversation_key`) REFERENCES `AIConversationKeys`(`conversation_key`) ON DELETE CASCADE ON UPDATE NO ACTION;
