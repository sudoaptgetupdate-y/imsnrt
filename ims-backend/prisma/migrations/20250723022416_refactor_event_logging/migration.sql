/*
  Warnings:

  - You are about to drop the `AssetHistory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `AssetHistory` DROP FOREIGN KEY `AssetHistory_inventoryItemId_fkey`;

-- DropForeignKey
ALTER TABLE `AssetHistory` DROP FOREIGN KEY `AssetHistory_userId_fkey`;

-- DropTable
DROP TABLE `AssetHistory`;

-- CreateTable
CREATE TABLE `EventLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryItemId` INTEGER NOT NULL,
    `userId` INTEGER NULL,
    `eventType` ENUM('CREATE', 'UPDATE', 'SALE', 'VOID', 'BORROW', 'RETURN_FROM_BORROW', 'ASSIGN', 'RETURN_FROM_ASSIGN', 'DECOMMISSION', 'REINSTATE', 'REPAIR_SENT', 'REPAIR_RETURNED') NOT NULL,
    `details` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventLog_inventoryItemId_idx`(`inventoryItemId`),
    INDEX `EventLog_eventType_idx`(`eventType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventLog` ADD CONSTRAINT `EventLog_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventLog` ADD CONSTRAINT `EventLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
