-- AlterTable
ALTER TABLE `Borrowing` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `InventoryItem` ADD COLUMN `purchasePrice` DOUBLE NULL;

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `totalCost` DOUBLE NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;
