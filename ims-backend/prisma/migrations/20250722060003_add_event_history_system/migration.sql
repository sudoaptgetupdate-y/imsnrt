/*
  Warnings:

  - You are about to drop the column `assignedAt` on the `AssetHistory` table. All the data in the column will be lost.
  - You are about to drop the column `assignedToId` on the `AssetHistory` table. All the data in the column will be lost.
  - You are about to drop the column `returnedAt` on the `AssetHistory` table. All the data in the column will be lost.
  - The values [AWAITING_REPAIR] on the enum `InventoryItem_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `type` to the `AssetHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `AssetHistory` DROP FOREIGN KEY `AssetHistory_assignedToId_fkey`;

-- DropIndex
DROP INDEX `AssetHistory_assignedToId_fkey` ON `AssetHistory`;

-- AlterTable
ALTER TABLE `AssetHistory` DROP COLUMN `assignedAt`,
    DROP COLUMN `assignedToId`,
    DROP COLUMN `returnedAt`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `details` VARCHAR(191) NULL,
    ADD COLUMN `type` ENUM('CREATE', 'UPDATE', 'ASSIGN', 'RETURN', 'DECOMMISSION', 'REINSTATE', 'REPAIR_SENT', 'REPAIR_RETURNED') NOT NULL,
    ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `InventoryItem` MODIFY `status` ENUM('IN_STOCK', 'SOLD', 'RESERVED', 'DEFECTIVE', 'BORROWED', 'IN_WAREHOUSE', 'ASSIGNED', 'DECOMMISSIONED', 'REPAIRING', 'RETURNED_TO_CUSTOMER') NOT NULL DEFAULT 'IN_STOCK';

-- AddForeignKey
ALTER TABLE `AssetHistory` ADD CONSTRAINT `AssetHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
