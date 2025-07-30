// controllers/saleController.js
const prisma = require('../prisma/client');
const { EventType } = require('@prisma/client');
const saleController = {};

const createEventLog = (tx, inventoryItemId, userId, eventType, details) => {
    return tx.eventLog.create({
        data: { inventoryItemId, userId, eventType, details },
    });
};

saleController.createSale = async (req, res, next) => {
    const { customerId, inventoryItemIds } = req.body;
    const soldById = req.user.id; 

    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId)) {
        const err = new Error('Customer ID must be a valid number.');
        err.statusCode = 400;
        return next(err);
    }
    
    // ... (the rest of the function)
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
                include: { productModel: { select: { sellingPrice: true } } },
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

            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;

            const newSale = await tx.sale.create({
                data: {
                    customerId: parsedCustomerId,
                    soldById,
                    subtotal,
                    vatAmount,
                    total,
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

// ... (rest of the file is correct)
saleController.getAllSales = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All'; 
        const skip = (page - 1) * limit;

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
                orderBy: { saleDate: 'desc' },
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
                // *** START: CORRECTED LOGIC ***
                // We ONLY update the status, but keep the saleId for historical tracking.
                await tx.inventoryItem.updateMany({
                    where: { id: { in: itemIdsToUpdate } },
                    data: {
                        status: 'IN_STOCK' 
                    },
                });
                // *** END: CORRECTED LOGIC ***

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

saleController.updateSale = async (req, res, next) => {
    const { id } = req.params;
    const { customerId, inventoryItemIds } = req.body;
    const actorId = req.user.id;

    try {
        const saleId = parseInt(id);
        if (isNaN(saleId)) {
            const err = new Error('Invalid Sale ID.');
            err.statusCode = 400;
            throw err;
        }
        
        const parsedCustomerId = parseInt(customerId, 10);
        if (isNaN(parsedCustomerId)) {
            const err = new Error('Customer ID must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }
        if (!Array.isArray(inventoryItemIds) || inventoryItemIds.some(itemId => typeof itemId !== 'number')) {
            const err = new Error('inventoryItemIds must be an array of numbers.');
            err.statusCode = 400;
            return next(err);
        }

        const updatedSale = await prisma.$transaction(async (tx) => {
            const originalSale = await tx.sale.findUnique({
                where: { id: saleId },
                include: { itemsSold: true },
            });

            if (!originalSale) {
                const err = new Error("Sale not found.");
                err.statusCode = 404;
                throw err;
            }
            
            const originalItemIds = originalSale.itemsSold.map(item => item.id);
            if (originalItemIds.length > 0) {
                 await tx.inventoryItem.updateMany({
                    where: { id: { in: originalItemIds } },
                    data: { status: 'IN_STOCK', saleId: null },
                });
            }

             const itemsToSell = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds } },
                include: { productModel: { select: { sellingPrice: true } } },
            });
            if (itemsToSell.length !== inventoryItemIds.length) {
                const err = new Error('One or more new items are not available for sale.');
                err.statusCode = 400;
                throw err;
            }
            const subtotal = itemsToSell.reduce((sum, item) => sum + (item.productModel?.sellingPrice || 0), 0);
            const vatAmount = subtotal * 0.07;
            const total = subtotal + vatAmount;

            if (inventoryItemIds.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: inventoryItemIds } },
                    data: { status: 'SOLD', saleId: saleId },
                });
            }

            await createEventLog(
                tx,
                -1,
                actorId,
                EventType.UPDATE,
                { details: `Sale ID: ${saleId} was updated.` }
            );

            return await tx.sale.update({
                where: { id: saleId },
                data: {
                    customerId: parsedCustomerId,
                    subtotal: subtotal,
                    vatAmount: vatAmount,
                    total: total,
                },
                include: { customer: true, soldBy: true, itemsSold: true },
            });
        });

        res.status(200).json(updatedSale);

    } catch (error) {
        next(error);
    }
};

module.exports = saleController;