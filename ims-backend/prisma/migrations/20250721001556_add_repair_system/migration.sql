-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `ownerType` ENUM('COMPANY', 'CUSTOMER') NOT NULL DEFAULT 'COMPANY',
    MODIFY `status` ENUM('IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'BORROWED', 'IN_WAREHOUSE', 'ASSIGNED', 'DECOMMISSIONED', 'AWAITING_REPAIR', 'REPAIRING', 'RETURNED_TO_CUSTOMER') NOT NULL DEFAULT 'IN_STOCK';

-- CreateTable
CREATE TABLE `Address` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contactPerson` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Address_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `repairDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `status` ENUM('REPAIRING', 'PARTIALLY_RETURNED', 'COMPLETED') NOT NULL DEFAULT 'REPAIRING',
    `createdById` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RepairOnItems` (
    `repairId` INTEGER NOT NULL,
    `inventoryItemId` INTEGER NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `returnedAt` DATETIME(3) NULL,
    `repairOutcome` ENUM('REPAIRED_SUCCESSFULLY', 'UNREPAIRABLE') NULL,

    PRIMARY KEY (`repairId`, `inventoryItemId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `InventoryItem_ownerType_idx` ON `InventoryItem`(`ownerType`);

-- AddForeignKey
ALTER TABLE `Repair` ADD CONSTRAINT `Repair_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repair` ADD CONSTRAINT `Repair_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `Address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repair` ADD CONSTRAINT `Repair_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `Address`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepairOnItems` ADD CONSTRAINT `RepairOnItems_repairId_fkey` FOREIGN KEY (`repairId`) REFERENCES `Repair`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RepairOnItems` ADD CONSTRAINT `RepairOnItems_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
