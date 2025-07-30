// controllers/dashboardController.js
const prisma = require('../prisma/client');
const { ItemType } = require('@prisma/client');

exports.getDashboardStats = async (req, res, next) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [
            totalRevenueResult, // << Query ใหม่
            itemsInStock,
            totalAssets,
            assignedAssets,
            dailySales,
            recentSales,
            stockStatus,
            recentBorrowings,
            recentRepairs,
            activeBorrowings,
            activeRepairs
        ] = await Promise.all([
            // --- START: แก้ไข Logic การคำนวณรายได้ ---
            prisma.sale.aggregate({
                _sum: {
                    total: true,
                },
                where: {
                    status: 'COMPLETED',
                },
            }),
            // --- END: แก้ไข Logic ---
            prisma.inventoryItem.count({
                where: { status: 'IN_STOCK', itemType: ItemType.SALE },
            }),
            prisma.inventoryItem.count({
                where: { itemType: ItemType.ASSET }
            }),
            prisma.inventoryItem.count({
                where: { itemType: ItemType.ASSET, status: 'ASSIGNED' }
            }),
            prisma.sale.groupBy({
                by: ['saleDate'],
                _count: { id: true },
                where: { saleDate: { gte: sevenDaysAgo } },
                orderBy: { saleDate: 'asc' },
            }),
            prisma.sale.findMany({
                take: 5,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: { select: { name: true } },
                    itemsSold: { include: { productModel: true } }
                },
            }),
            prisma.inventoryItem.groupBy({
                where: { itemType: ItemType.SALE },
                by: ['status'],
                _count: { id: true },
            }),
            prisma.borrowing.findMany({
                take: 5,
                orderBy: { borrowDate: 'desc' },
                include: { customer: { select: { name: true } } }
            }),
            prisma.repair.findMany({
                take: 5,
                orderBy: { repairDate: 'desc' },
                include: { receiver: { select: { name: true } } }
            }),
            prisma.borrowing.count({
                where: { status: 'BORROWED' }
            }),
            prisma.repair.count({
                where: { status: 'REPAIRING' }
            })
        ]);
        
        // --- START: แก้ไข Logic การคำนวณรายได้ ---
        const totalRevenue = totalRevenueResult._sum.total || 0;
        // --- END: แก้ไข Logic ---

        const salesChartData = dailySales.map(day => ({
            name: new Date(day.saleDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
            total: day._count.id,
        }));

        res.status(200).json({
            totalRevenue,
            itemsInStock,
            totalAssets,
            assignedAssets,
            salesChartData,
            recentSales,
            stockStatus,
            recentBorrowings,
            recentRepairs,
            activeBorrowings,
            activeRepairs
        });

    } catch (error) {
        next(error);
    }
};

exports.getEmployeeDashboardStats = async (req, res, next) => {
    try {
        const [itemsInStock, defectiveItems, recentSales] = await Promise.all([
            prisma.inventoryItem.count({
                where: { status: 'IN_STOCK', itemType: ItemType.SALE },
            }),
            prisma.inventoryItem.count({
                where: { 
                    OR: [
                        { status: 'DEFECTIVE', itemType: ItemType.SALE },
                        { status: 'DEFECTIVE', itemType: ItemType.ASSET },
                    ]
                },
            }),
            prisma.sale.findMany({
                take: 5,
                orderBy: { saleDate: 'desc' },
                include: {
                    customer: { select: { name: true } },
                    itemsSold: { select: { id: true } } 
                },
            })
        ]);

        res.status(200).json({
            itemsInStock,
            defectiveItems,
            recentSales,
        });

    } catch (error) {
        next(error);
    }
};