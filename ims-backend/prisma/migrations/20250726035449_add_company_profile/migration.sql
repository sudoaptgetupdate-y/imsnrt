-- AlterTable
ALTER TABLE `Borrowing` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `Sale` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- CreateTable
CREATE TABLE `CompanyProfile` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `name` VARCHAR(191) NULL,
    `addressLine1` TEXT NULL,
    `addressLine2` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
