const prisma = require('../prisma/client');
const { SaleStatus } = require('@prisma/client');

// --- START: BUG FIX (นำฟังก์ชัน Helper ที่จำเป็นกลับมา) ---
const getStartAndEndDates = (period, year) => {
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    const numericYear = parseInt(year, 10) || now.getFullYear();

    if (period === 'year') {
        currentStart = new Date(numericYear, 0, 1);
        currentEnd = new Date(numericYear, 11, 31, 23, 59, 59);
        previousStart = new Date(numericYear - 1, 0, 1);
        previousEnd = new Date(numericYear - 1, 11, 31, 23, 59, 59);
    } else if (period === 'thisMonth') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (period === 'last3Months') {
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of this month
        currentStart = new Date(now.getFullYear(), now.getMonth() - 2, 1); // Start of 2 months ago
        previousEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59); // End of 3 months ago
        previousStart = new Date(now.getFullYear(), now.getMonth() - 5, 1); // Start of 5 months ago
    } else if (period === 'last6Months') {
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        currentStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth() - 5, 0, 23, 59, 59);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    } else { // 'recent' (or default) - usually last 30 days vs 30 days before that
        currentEnd = now;
        currentStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        previousEnd = new Date(currentStart.getTime()); // (แก้ไข: previousEnd ควรเป็นจุดสิ้นสุดของช่วงก่อนหน้า คือจุดเริ่มต้นของช่วงปัจจุบัน)
        previousStart = new Date(currentStart.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    return { currentStart, currentEnd, previousStart, previousEnd }; // (ฟังก์ชันนี้ต้อง return object นี้)
};
// --- END: BUG FIX ---


// Main data fetching logic (คงการอัปเกรด Phase 7 ไว้)
const fetchSalesData = async (where) => {
    return prisma.$transaction(async (tx) => {
        
        // (Phase 7 upgrade: ดึง totalCost)
        const statsAggregation = await tx.sale.aggregate({ // (เปลี่ยนชื่อตัวแปร stats -> statsAggregation)
            where,
            _count: { id: true },
            _sum: { 
                total: true,
                totalCost: true // <-- PHASE 7
            }
        });
        
        // (แก้ไข: Prisma aggregate return array เสมอ (แม้จะเป็น empty group) 
        // หรือ object เดียวถ้ามี _count/sum เราควรจัดการกับผลลัพธ์เดียว)
        const stats = statsAggregation; // (ปรับ Logic การเข้าถึงข้อมูล)

        const topProducts = await tx.inventoryItem.groupBy({
            // ... (Query อื่นๆ ของ topProducts คงเดิม) ...
            by: ['productModelId'],
            where: {
                saleId: { not: null },
                sale: where, 
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        const topCustomers = await tx.sale.groupBy({
            // ... (Query อื่นๆ ของ topCustomers คงเดิม) ...
            by: ['customerId'],
            where,
            _sum: { total: true },
            _count: { id: true },
            orderBy: { _sum: { total: 'desc' } },
            take: 10,
        });

        // (Mapping data คงเดิม)
        const productModelIds = topProducts.map(p => p.productModelId);
        const productModels = await tx.productModel.findMany({
            where: { id: { in: productModelIds } },
            select: { id: true, modelNumber: true, brand: { select: { name: true } } }
        });
        const productMap = new Map(productModels.map(p => [p.id, p]));

        const customerIds = topCustomers.map(c => c.customerId);
        const customers = await tx.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true }
        });
        const customerMap = new Map(customers.map(c => [c.id, c.name]));

        const formattedTopProducts = topProducts.map(p => ({
            name: productMap.get(p.productModelId)?.modelNumber || 'Unknown',
            brand: productMap.get(p.productModelId)?.brand?.name || '',
            unitsSold: p._count.id,
        })).filter(p => p.name !== 'Unknown');

        const formattedTopCustomers = topCustomers.map(c => ({
            name: customerMap.get(c.customerId) || 'Unknown',
            totalSpent: c._sum.total,
            transactions: c._count.id,
        })).filter(c => c.name !== 'Unknown');

        // (Phase 7 upgrade: Return totalCost)
        return {
            stats: {
                totalRevenue: stats._sum.total || 0,
                totalCost: stats._sum.totalCost || 0, // <-- PHASE 7
                salesCount: stats._count.id || 0,
            },
            topProducts: formattedTopProducts,
            topCustomers: formattedTopCustomers,
        };
    });
};

const reportController = {};

reportController.getSalesReport = async (req, res, next) => {
    try {
        const { period, year } = req.query;
        
        // (บรรทัดนี้ (เดิมคือ 92) จะทำงานได้แล้ว เพราะฟังก์ชัน helper ด้านบนมีอยู่)
        const { currentStart, currentEnd, previousStart, previousEnd } = getStartAndEndDates(period, year);

        const currentWhere = {
            saleDate: { gte: currentStart, lte: currentEnd },
            status: SaleStatus.COMPLETED
        };
        const previousWhere = {
            saleDate: { gte: previousStart, lte: previousEnd },
            status: SaleStatus.COMPLETED
        };
        
        const [currentData, previousData] = await Promise.all([
            fetchSalesData(currentWhere),
            fetchSalesData(previousWhere)
        ]);

        // (Logic การคำนวณคงเดิม)
        const calculateComparison = (current, previous) => {
            if (previous === 0) return (current > 0 ? 100 : 0);
            if (current === 0) return (previous > 0 ? -100 : 0);
            return ((current - previous) / previous) * 100;
        };

        const revenueComparison = calculateComparison(currentData.stats.totalRevenue, previousData.stats.totalRevenue);
        const salesCountComparison = calculateComparison(currentData.stats.salesCount, previousData.stats.salesCount);
        
        const currentItemsSoldCount = currentData.topProducts.reduce((sum, p) => sum + p.unitsSold, 0);
        const uniqueCustomersCount = currentData.topCustomers.length; 
        
        // (Phase 7 upgrade: ส่ง totalCost ไปใน response)
        res.status(200).json({
            stats: {
                totalRevenue: currentData.stats.totalRevenue,
                totalCost: currentData.stats.totalCost, // <-- PHASE 7
                salesCount: currentData.stats.salesCount,
                itemsSoldCount: currentItemsSoldCount, 
                uniqueCustomers: uniqueCustomersCount,
                revenueComparison: revenueComparison,
                salesCountComparison: salesCountComparison,
            },
            charts: {
                topProducts: currentData.topProducts,
                topCustomers: currentData.topCustomers,
            },
            periodText: period === 'year' ? `year ${year}` : (period || 'recent'), // (ปรับปรุง default ให้เป็น recent)
        });

    } catch (error) {
        next(error); // (ส่ง error ต่อไปให้ errorHandlerMiddleware)
    }
};

module.exports = reportController;