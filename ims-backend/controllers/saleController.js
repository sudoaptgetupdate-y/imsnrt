// ims-backend/controllers/saleController.js

const prisma = require('../prisma/client');
const { EventType } = require('@prisma/client');
const saleController = {};

// ... (createEventLog function remains the same) ...
const createEventLog = (tx, inventoryItemId, userId, eventType, details, timestamp = new Date()) => {
    return tx.eventLog.create({
        data: { 
            inventoryItemId, 
            userId, 
            eventType, 
            details,
            createdAt: timestamp
        },
    });
};


saleController.createSale = async (req, res, next) => {
    // --- START: 1. รับ purchasePrice เข้ามาด้วย (แม้ว่าเราจะไม่ได้ใช้โดยตรง แต่ itemsToSell จะมีข้อมูลนี้) ---
    const { customerId, inventoryItemIds, notes } = req.body;
    // --- END ---
    const soldById = req.user.id; 

    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId)) {
        const err = new Error('Customer ID must be a valid number.');
        err.statusCode = 400;
        return next(err);
    }
    
    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const sale = await prisma.$transaction(async (tx) => {
            const itemsToSell = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds },
                    status: 'IN_STOCK' 
                },
                // --- START: 2. Include purchasePrice เพื่อคำนวณต้นทุน ---
                include: { 
                    productModel: { select: { sellingPrice: true } },
                    // (purchasePrice อยู่ใน level เดียวกัน ไม่ต้อง include เพิ่ม)
                },
                // --- END ---
            });

            if (itemsToSell.length !== inventoryItemIds.length) {
                const err = new Error('One or more items are not available for sale or not found.');
                err.statusCode = 400;
                throw err;
            }

            const customer = await tx.customer.findUnique({ where: { id: parsedCustomerId } });
            if (!customer) {
                const err = new Error('Customer not found.');
                err.statusCode = 404;
                throw err;
            }

            // --- START: 3. คำนวณราคาขายและต้นทุน ---
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const totalCostOfSale = itemsToSell.reduce((sum, item) => sum + (item.purchasePrice || 0), 0); // <-- เพิ่มบรรทัดนี้
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;
            // --- END ---

            const newSale = await tx.sale.create({
                data: {
                    customerId: parsedCustomerId,
                    soldById,
                    subtotal,
                    vatAmount,
                    total,
                    totalCost: totalCostOfSale, // <-- 4. บันทึกต้นทุนลง DB
                    notes,
                },
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'SOLD', saleId: newSale.id },
            });

            for (const itemId of inventoryItemIds) {
                await createEventLog(
                    tx,
                    itemId,
                    soldById,
                    EventType.SALE,
                    { 
                        customerName: customer.name,
                        saleId: newSale.id,
                        details: `Item sold to ${customer.name}.`
                    }
                );
            }

            return tx.sale.findUnique({
                where: { id: newSale.id },
                include: { 
                    customer: true, 
                    soldBy: { select: { name: true } },
                    itemsSold: { include: { productModel: true } } 
                }
            });
        });

        res.status(201).json(sale);

    } catch (error) {
        next(error);
    }
};

// ... (getAllSales and getSaleById functions remain the same) ...
saleController.getAllSales = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All'; 
        const skip = (page - 1) * limit;

        const sortBy = req.query.sortBy || 'saleDate';
        const sortOrder = req.query.sortOrder || 'desc';

        let orderBy = {};
        if (sortBy === 'customer') {
            orderBy = { customer: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const whereConditions = [];

        if (statusFilter && statusFilter !== 'All') {
            whereConditions.push({ status: statusFilter });
        }

        if (searchTerm) {
            whereConditions.push({
                OR: [
                    { customer: { name: { contains: searchTerm } } },
                    { soldBy: { name: { contains: searchTerm } } }
                ]
            });
        }

        const where = whereConditions.length > 0 ? { AND: whereConditions } : {};
        
        const [sales, totalItems] = await Promise.all([
            prisma.sale.findMany({
                where,
                skip,
                take: limit,
                orderBy: orderBy, 
                include: {
                    customer: true,
                    soldBy: { select: { id: true, name: true } },
                    itemsSold: { select: { id: true } }
                }
            }),
            prisma.sale.count({ where })
        ]);
        
        const completeSalesData = sales.filter(sale => sale.customer && sale.soldBy);

        res.status(200).json({
            data: completeSalesData,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        next(error);
    }
};


saleController.getSaleById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const saleId = parseInt(id);
        if (isNaN(saleId)) {
            const err = new Error('Invalid Sale ID.');
            err.statusCode = 400;
            throw err;
        }

        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                customer: true,
                soldBy: { select: { id: true, name: true, email: true } },
                voidedBy: { select: { id: true, name: true } },
                itemsSold: {
                    include: {
                        productModel: {
                            include: {
                                brand: true,
                                category: true
                            }
                        }
                    }
                }
            }
        });

        if (!sale) {
            const err = new Error('Sale not found');
            err.statusCode = 404;
            throw err;
        }

        res.status(200).json(sale);

    } catch (error) {
        next(error);
    }
};

// ... (voidSale function remains the same) ...
saleController.voidSale = async (req, res, next) => {
    const { id } = req.params;
    const voidedById = req.user.id;

    try {
        const saleId = parseInt(id);
        if (isNaN(saleId)) {
            const err = new Error('Invalid Sale ID.');
            err.statusCode = 400;
            throw err;
        }

        const voidedSale = await prisma.$transaction(async (tx) => {
            const saleToVoid = await tx.sale.findUnique({
                where: { id: saleId },
                include: { itemsSold: true },
            });

            if (!saleToVoid) {
                const err = new Error('Sale not found.');
                err.statusCode = 404;
                throw err;
            }
            if (saleToVoid.status === 'VOIDED') {
                const err = new Error('This sale has already been voided.');
                err.statusCode = 400;
                throw err;
            }

            const itemIdsToUpdate = saleToVoid.itemsSold.map(item => item.id);

            if (itemIdsToUpdate.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemIdsToUpdate } },
                    data: {
                        status: 'IN_STOCK' 
                    },
                });

                for (const itemId of itemIdsToUpdate) {
                    await createEventLog(
                        tx,
                        itemId,
                        voidedById,
                        EventType.VOID,
                        {
                            saleId: saleId,
                            details: `Sale ID: ${saleId} was voided.`
                        }
                    );
                }
            }

            return await tx.sale.update({
                where: { id: saleId },
                data: {
                    status: 'VOIDED',
                    voidedAt: new Date(),
                    voidedById: voidedById,
                },
            });
        });

        res.status(200).json({ message: 'Sale has been voided successfully.', sale: voidedSale });

    } catch (error) {
        next(error);
    }
};


saleController.createHistoricalSale = async (req, res, next) => {
    const { customerId, inventoryItemIds, notes, saleDate } = req.body;
    const soldById = req.user.id;

    if (!saleDate || isNaN(new Date(saleDate).getTime())) {
        const err = new Error('A valid sale date (saleDate) is required.');
        err.statusCode = 400;
        return next(err);
    }
    // ... (Validation อื่นๆ เหมือน createSale เดิม) ...
    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId)) {
         const err = new Error('Customer ID must be a valid number.');
         err.statusCode = 400;
         return next(err);
    }
    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const sale = await prisma.$transaction(async (tx) => {
            const itemsToSell = await tx.inventoryItem.findMany({
                where: { 
                    id: { in: inventoryItemIds },
                    status: 'IN_STOCK' // (Items must be created first by historical inventory)
                },
                include: { productModel: { select: { sellingPrice: true } } },
            });

            if (itemsToSell.length !== inventoryItemIds.length) {
                const err = new Error('One or more items are not available for sale or not found.');
                err.statusCode = 400;
                throw err;
            }
            
            // --- START: 5. คำนวณต้นทุนสำหรับ Historical Sale ด้วย ---
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const totalCostOfSale = itemsToSell.reduce((sum, item) => sum + (item.purchasePrice || 0), 0); // <-- เพิ่มบรรทัดนี้
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;
            // --- END ---

            const newSale = await tx.sale.create({
                data: {
                    customerId: parsedCustomerId,
                    soldById,
                    subtotal,
                    vatAmount,
                    total,
                    totalCost: totalCostOfSale, // <-- 6. บันทึกต้นทุน
                    notes,
                    saleDate: new Date(saleDate),
                    createdAt: new Date(saleDate)
                },
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'SOLD', saleId: newSale.id },
            });
            
            const customer = await tx.customer.findUnique({ where: { id: parsedCustomerId } });

            for (const itemId of inventoryItemIds) {
                await createEventLog(
                    tx,
                    itemId,
                    soldById,
                    EventType.SALE,
                    { 
                        customerName: customer.name,
                        saleId: newSale.id,
                        details: `Item sold to ${customer.name} (Historical Entry).`
                    },
                    new Date(saleDate)
                );
            }

            return newSale;
        });

        res.status(201).json(sale);

    } catch (error) {
        next(error);
    }
};


module.exports = saleController;