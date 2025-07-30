// ims-backend/controllers/historyController.js
const prisma = require('../prisma/client');
const historyController = {};

historyController.getHistoryByItemId = async (req, res, next) => {
    try {
        const { itemId } = req.params;
        const id = parseInt(itemId);
        if (isNaN(id)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const item = await prisma.inventoryItem.findUnique({
            where: { id },
            // --- START: แก้ไขส่วนนี้ ---
            include: { 
                productModel: true,
                supplier: true // เพิ่มการดึงข้อมูล Supplier
            }
            // --- END ---
        });

        if (!item) {
            const err = new Error('Item not found.');
            err.statusCode = 404;
            throw err;
        }

        const events = await prisma.eventLog.findMany({
            where: { inventoryItemId: id },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({
            itemDetails: item,
            history: events
        });

    } catch (error) {
        next(error);
    }
};

module.exports = historyController;