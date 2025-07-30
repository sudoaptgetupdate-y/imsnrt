// ims-backend/controllers/reportController.js

const prisma = require('../prisma/client');

const getDateRange = (period, year) => {
    const now = new Date();
    let startDate, endDate = new Date();
    let prevStartDate, prevEndDate;
    
    const targetYear = year ? parseInt(year) : now.getFullYear();

    switch (period) {
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
        case 'last_3_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59);
            break;
        case 'last_6_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth() - 5, 0, 23, 59, 59);
            break;
        case 'this_year':
        default:
            startDate = new Date(targetYear, 0, 1);
            endDate = new Date(targetYear, 11, 31, 23, 59, 59);
            prevStartDate = new Date(targetYear - 1, 0, 1);
            prevEndDate = new Date(targetYear - 1, 11, 31, 23, 59, 59);
    }
    return { startDate, endDate, prevStartDate, prevEndDate };
};

exports.getSalesReport = async (req, res, next) => {
    try {
        const { period = 'this_month', year } = req.query;

        const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period, year);
        
        const currentPeriodWhere = { status: 'COMPLETED', saleDate: { gte: startDate, lte: endDate } };
        const previousPeriodWhere = { status: 'COMPLETED', saleDate: { gte: prevStartDate, lte: prevEndDate } };

        const [currentSales, previousSales] = await Promise.all([
            prisma.sale.findMany({ where: currentPeriodWhere, include: { itemsSold: { include: { productModel: true } }, customer: true } }),
            prisma.sale.findMany({ where: previousPeriodWhere, include: { itemsSold: true } })
        ]);
        
        // --- Current Period Stats ---
        const totalRevenue = currentSales.reduce((sum, sale) => sum + sale.total, 0);
        const totalSales = currentSales.length;
        const allItemsSold = currentSales.flatMap(sale => sale.itemsSold);
        const totalItemsSoldCount = allItemsSold.length;
        const uniqueCustomerIds = new Set(currentSales.map(sale => sale.customerId));
        const totalUniqueCustomers = uniqueCustomerIds.size;
        
        // --- Previous Period Stats for Comparison ---
        const prevTotalRevenue = previousSales.reduce((sum, sale) => sum + sale.total, 0);
        const prevTotalItemsSoldCount = previousSales.reduce((sum, sale) => sum + sale.itemsSold.length, 0);

        // Top 10 Products
        const productSales = allItemsSold.reduce((acc, item) => {
            const modelId = item.productModelId;
            if (!acc[modelId]) {
                acc[modelId] = { count: 0, revenue: 0, modelNumber: item.productModel.modelNumber };
            }
            acc[modelId].count += 1;
            acc[modelId].revenue += item.productModel.sellingPrice;
            return acc;
        }, {});
        const top10Products = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Top 10 Customers
        const customerStats = currentSales.reduce((acc, sale) => {
            if (!sale.customer) return acc;
            const customerId = sale.customerId;
            if (!acc[customerId]) {
                acc[customerId] = { name: sale.customer.name, totalRevenue: 0, transactionCount: 0 };
            }
            acc[customerId].totalRevenue += sale.total;
            acc[customerId].transactionCount += 1;
            return acc;
        }, {});
        const top10Customers = Object.values(customerStats).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10);

        // Chart Data
        let salesOverTime;
        if (period.startsWith('last_') || period === 'this_month') {
             const monthlyData = {};
             currentSales.forEach(sale => {
                const monthName = new Date(sale.saleDate).toLocaleString('default', { month: 'short' });
                monthlyData[monthName] = (monthlyData[monthName] || 0) + sale.total;
            });
            salesOverTime = Object.entries(monthlyData).map(([name, total]) => ({ name, total }));
        } else { // Year view
            const monthlyData = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('default', { month: 'short' }), total: 0 }));
            currentSales.forEach(sale => {
                const monthIndex = new Date(sale.saleDate).getMonth();
                monthlyData[monthIndex].total += sale.total;
            });
            salesOverTime = monthlyData;
        }

        res.status(200).json({
            summary: {
                totalRevenue,
                totalSales,
                totalItemsSoldCount,
                totalUniqueCustomers, // <-- This is the corrected field
            },
            comparison: {
                prevTotalRevenue,
                prevTotalItemsSoldCount
            },
            top10Products,
            top10Customers,
            salesOverTime,
        });

    } catch (error) {
        next(error);
    }
};