/*
  Warnings:

  - You are about to drop the column `borrowerId` on the `Borrowing` table. All the data in the column will be lost.
  - Added the required column `customerId` to the `Borrowing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Borrowing` DROP FOREIGN KEY `Borrowing_borrowerId_fkey`;

-- DropIndex
DROP INDEX `Borrowing_borrowerId_fkey` ON `Borrowing`;

-- AlterTable
ALTER TABLE `Borrowing` DROP COLUMN `borrowerId`,
    ADD COLUMN `customerId` INTEGER NOT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Sale` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `Borrowing` ADD CONSTRAINT `Borrowing_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
