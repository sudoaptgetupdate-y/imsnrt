-- AlterTable
ALTER TABLE `Borrowing` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `notes` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Sale` ALTER COLUMN `updatedAt` DROP DEFAULT;
