const prisma = require('../prisma/client');
const { ItemType, EventType, ItemOwner } = require('@prisma/client');
const inventoryController = {};

const macRegex = /^[0-9A-Fa-f]{12}$/; // Regex for MAC address without separators

// Helper function to create event logs consistently
// --- START: MODIFIED ---
const createEventLog = (tx, inventoryItemId, userId, eventType, details, timestamp = new Date()) => {
// --- END: MODIFIED ---
    return tx.eventLog.create({
        data: {
            inventoryItemId,
            userId,
            eventType,
            details,
            // --- START: ADDED ---
            createdAt: timestamp,
            // --- END: ADDED ---
        },
    });
};

inventoryController.addInventoryItem = async (req, res, next) => {
    try {
        const { serialNumber, macAddress, productModelId, supplierId, notes } = req.body;
        const userId = req.user.id;

        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }
        
        const parsedSupplierId = parseInt(supplierId, 10);
        if (isNaN(parsedSupplierId)) {
            const err = new Error('Supplier ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });

        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }

        const { category } = productModel;
        if (category.requiresSerialNumber && (!serialNumber || serialNumber.trim() === '')) {
            const err = new Error('Serial Number is required for this category.');
            err.statusCode = 400;
            return next(err);
        }

        const cleanMacAddress = macAddress ? macAddress.replace(/[:-\s]/g, '') : '';
        if (category.requiresMacAddress && !cleanMacAddress) {
            const err = new Error('MAC Address is required for this category.');
            err.statusCode = 400;
            return next(err);
        }
        if (cleanMacAddress && !macRegex.test(cleanMacAddress)) {
            const err = new Error(`The provided MAC Address '${macAddress}' has an invalid format.`);
            err.statusCode = 400;
            return next(err);
        }

        const newItem = await prisma.$transaction(async (tx) => {
            const createdItem = await tx.inventoryItem.create({
                data: {
                    itemType: ItemType.SALE,
                    ownerType: ItemOwner.COMPANY,
                    serialNumber: serialNumber || null,
                    macAddress: cleanMacAddress || null,
                    notes: notes || null,
                    productModelId: parsedModelId,
                    supplierId: parsedSupplierId,
                    addedById: userId,
                    status: 'IN_STOCK',
                },
            });

            await createEventLog(
                tx,
                createdItem.id,
                userId,
                EventType.CREATE,
                { details: `Item created with S/N: ${serialNumber || 'N/A'}.` }
            );
            
            return createdItem;
        });

        res.status(201).json(newItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.addBatchInventoryItems = async (req, res, next) => {
    try {
        const { productModelId, supplierId, items } = req.body;
        const userId = req.user.id;
        
        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        const parsedSupplierId = parseInt(supplierId, 10);
        if (isNaN(parsedSupplierId)) {
            const err = new Error('Supplier ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        if (!Array.isArray(items) || items.length === 0) {
            const err = new Error('Items list cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        
        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });
        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }
        const { category } = productModel;

        const newItems = await prisma.$transaction(async (tx) => {
            const createdItems = [];
            for (const item of items) {
                if (category.requiresSerialNumber && (!item.serialNumber || item.serialNumber.trim() === '')) {
                    throw new Error(`Serial Number is required for all items in this batch.`);
                }
                const cleanMacAddress = item.macAddress ? item.macAddress.replace(/[:-\s]/g, '') : '';
                if (category.requiresMacAddress && !cleanMacAddress) {
                    throw new Error(`MAC Address is required for all items in this batch.`);
                } else if (cleanMacAddress && !macRegex.test(cleanMacAddress)) {
                    throw new Error(`Invalid MAC Address format for one of the items: ${item.macAddress}`);
                }

                const createdItem = await tx.inventoryItem.create({
                    data: {
                        itemType: ItemType.SALE,
                        ownerType: ItemOwner.COMPANY,
                        serialNumber: item.serialNumber || null,
                        macAddress: cleanMacAddress || null,
                        notes: item.notes || null,
                        productModelId: parsedModelId,
                        supplierId: parsedSupplierId,
                        addedById: userId,
                        status: 'IN_STOCK',
                    },
                });

                await createEventLog(
                    tx,
                    createdItem.id,
                    userId,
                    EventType.CREATE,
                    { details: `Item created in batch with S/N: ${createdItem.serialNumber || 'N/A'}.` }
                );
                
                createdItems.push(createdItem);
            }
            return createdItems;
        });

        res.status(201).json({
            message: `${newItems.length} items have been added successfully.`,
            data: newItems,
        });

    } catch (error) {
        next(error);
    }
};

inventoryController.addHistoricalInventory = async (req, res, next) => {
    try {
        const { items, createdAt } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(items) || items.length === 0) {
            const err = new Error('Items list cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (!createdAt || isNaN(new Date(createdAt).getTime())) {
            const err = new Error('A valid creation date (createdAt) is required.');
            err.statusCode = 400;
            return next(err);
        }

        const newItems = await prisma.$transaction(async (tx) => {
            const createdItems = [];
            for (const item of items) {
                if (!item.productModelId || !item.supplierId) {
                     throw new Error('Product Model ID and Supplier ID are required for all items.');
                }
                const productModel = await tx.productModel.findUnique({
                    where: { id: parseInt(item.productModelId) },
                    include: { category: true },
                });
                if (!productModel) {
                    throw new Error(`Product Model with ID ${item.productModelId} not found.`);
                }
                const { category } = productModel;

                if (category.requiresSerialNumber && (!item.serialNumber || item.serialNumber.trim() === '')) {
                    throw new Error(`Serial Number is required for model ${productModel.modelNumber}.`);
                }
                const cleanMacAddress = item.macAddress ? item.macAddress.replace(/[:-\s]/g, '') : '';
                if (category.requiresMacAddress && !cleanMacAddress) {
                     throw new Error(`MAC Address is required for model ${productModel.modelNumber}.`);
                }
                if(cleanMacAddress && !macRegex.test(cleanMacAddress)){
                    throw new Error(`Invalid MAC Address format for S/N ${item.serialNumber}.`);
                }

                // --- START: เพิ่ม 'notes' ในการสร้างข้อมูล ---
                const createdItem = await tx.inventoryItem.create({
                    data: {
                        productModelId: parseInt(item.productModelId),
                        supplierId: parseInt(item.supplierId),
                        serialNumber: item.serialNumber,
                        macAddress: cleanMacAddress || null,
                        notes: item.notes || null, // <--- เพิ่มบรรทัดนี้
                        itemType: ItemType.SALE,
                        ownerType: ItemOwner.COMPANY,
                        addedById: userId,
                        status: 'IN_STOCK',
                        createdAt: new Date(createdAt),
                    },
                });
                // --- END ---


                await createEventLog(
                    tx,
                    createdItem.id,
                    userId,
                    EventType.CREATE,
                    { details: `Item created via historical entry with S/N: ${createdItem.serialNumber || 'N/A'}.` },
                    new Date(createdAt) 
                );
                
                createdItems.push(createdItem);
            }
            return createdItems;
        });

        res.status(201).json({
            message: `${newItems.length} items have been added successfully with a historical date.`,
            data: newItems,
        });

    } catch (error) {
        next(error);
    }
};

inventoryController.getAllInventoryItems = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';
        const categoryIdFilter = req.query.categoryId || 'All';
        const brandIdFilter = req.query.brandId || 'All';
        const sortBy = req.query.sortBy || 'updatedAt';
        const sortOrder = req.query.sortOrder || 'desc';
        const excludeIds = req.query.excludeIds ? req.query.excludeIds.split(',').map(id => parseInt(id.trim())) : [];
        
        let where = { 
            itemType: ItemType.SALE
        };

        if (excludeIds.length > 0) {
            where.id = {
                notIn: excludeIds
            };
        }

        if (statusFilter && statusFilter !== 'All') {
            where.status = statusFilter;
        }

        const searchConditions = searchTerm 
            ? {
                OR: [
                    { serialNumber: { contains: searchTerm } },
                    { macAddress: { contains: searchTerm.replace(/[:-\s]/g, '') } },
                    { productModel: { modelNumber: { contains: searchTerm } } },
                ],
            }
            : {};
            
        const filterConditions = {};
        if (categoryIdFilter && categoryIdFilter !== 'All') {
            filterConditions.categoryId = parseInt(categoryIdFilter);
        }
        if (brandIdFilter && brandIdFilter !== 'All') {
            filterConditions.brandId = parseInt(brandIdFilter);
        }
        
        if (Object.keys(filterConditions).length > 0) {
            where.productModel = filterConditions;
        }

        where = { ...where, ...searchConditions };

        let orderBy = {};
        if (sortBy === 'productModel') {
            orderBy = { productModel: { modelNumber: sortOrder } };
        } else if (sortBy === 'brand') {
            orderBy = { productModel: { brand: { name: sortOrder } } };
        } else if (sortBy === 'category') {
            orderBy = { productModel: { category: { name: sortOrder } } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const include = {
            productModel: { include: { category: true, brand: true } },
            addedBy: { select: { name: true } },
            supplier: true,
            borrowingRecords: {
                where: { returnedAt: null },
                select: { borrowingId: true }
            },
            repairRecords: {
                orderBy: { sentAt: 'desc' },
                take: 1,
                select: { repairId: true }
            }
        };

        const [items, totalItems] = await Promise.all([
            prisma.inventoryItem.findMany({ where, skip, take: limit, orderBy, include }),
            prisma.inventoryItem.count({ where })
        ]);
        
        const itemIds = items.map(item => item.id);
        let borrowingMap = new Map();
        let repairMap = new Map();

        if (itemIds.length > 0) {
            const borrowingCounts = await prisma.borrowingOnItems.groupBy({
                by: ['inventoryItemId'],
                where: { inventoryItemId: { in: itemIds } },
                _count: { _all: true }
            });
            borrowingMap = new Map(borrowingCounts.map(i => [i.inventoryItemId, i._count._all]));

            const repairCounts = await prisma.repairOnItems.groupBy({
                by: ['inventoryItemId'],
                where: { inventoryItemId: { in: itemIds } },
                _count: { _all: true }
            });
            repairMap = new Map(repairCounts.map(i => [i.inventoryItemId, i._count._all]));
        }

        const formattedItems = items.map(item => {
            const activeBorrowing = item.borrowingRecords.length > 0 ? item.borrowingRecords[0] : null;
            const activeRepair = item.repairRecords.length > 0 ? item.repairRecords[0] : null;
            const { borrowingRecords, repairRecords, ...restOfItem } = item;
            
            const hasHistory = item.saleId !== null || (borrowingMap.get(item.id) || 0) > 0 || (repairMap.get(item.id) || 0) > 0;

            return { 
                ...restOfItem, 
                borrowingId: activeBorrowing ? activeBorrowing.borrowingId : null,
                repairId: activeRepair ? activeRepair.repairId : null,
                isDeletable: !hasHistory
            };
        });

        res.status(200).json({
            data: formattedItems,
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

inventoryController.getInventoryItemById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const item = await prisma.inventoryItem.findFirst({
            where: { id: itemId, itemType: ItemType.SALE },
            include: { 
                productModel: { include: { category: true, brand: true } },
                addedBy: { select: { name: true } }
            }
        });
        if (!item) {
            const err = new Error('Inventory item not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(item);
    } catch (error) {
        next(error);
    }
};

inventoryController.updateInventoryItem = async (req, res, next) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const { serialNumber, macAddress, status, productModelId, supplierId, notes } = req.body;
        
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        const parsedModelId = parseInt(productModelId, 10);
        if (isNaN(parsedModelId)) {
            const err = new Error('Product Model ID is required and must be a valid number.');
            err.statusCode = 400;
            return next(err);
        }

        const productModel = await prisma.productModel.findUnique({
            where: { id: parsedModelId },
            include: { category: true },
        });
        if (!productModel) {
            const err = new Error('Product Model not found.');
            err.statusCode = 404;
            return next(err);
        }
        const { category } = productModel;
        if (category.requiresSerialNumber && (!serialNumber || serialNumber.trim() === '')) {
            const err = new Error('Serial Number is required for this category.');
            err.statusCode = 400;
            return next(err);
        }
        const cleanMacAddressForUpdate = macAddress ? macAddress.replace(/[:-\s]/g, '') : '';
        if (category.requiresMacAddress && !cleanMacAddressForUpdate) {
            const err = new Error('MAC Address is required for this category.');
            err.statusCode = 400;
            return next(err);
        }
        if (cleanMacAddressForUpdate && !macRegex.test(cleanMacAddressForUpdate)) {
            const err = new Error(`The provided MAC Address '${macAddress}' has an invalid format.`);
            err.statusCode = 400;
            return next(err);
        }
        
        const [updatedItem] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId, itemType: 'SALE' },
                data: {
                    serialNumber: serialNumber || null,
                    macAddress: cleanMacAddressForUpdate || null,
                    status,
                    notes: notes || null,
                    productModelId: parsedModelId,
                    supplierId: supplierId ? parseInt(supplierId, 10) : null,
                },
            }),
            createEventLog(
                prisma,
                itemId,
                actorId,
                EventType.UPDATE,
                { details: `Item details updated.` }
            )
        ]);

        res.status(200).json(updatedItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.deleteInventoryItem = async (req, res, next) => {
    const { id } = req.params;
    try {
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const itemToDelete = await prisma.inventoryItem.findFirst({
            where: { id: itemId, itemType: 'SALE' },
        });

        if (!itemToDelete) {
             const err = new Error('Item not found.');
             err.statusCode = 404;
             throw err;
        }

        if (itemToDelete.saleId) {
            const err = new Error('Cannot delete item. It has sales history and must be decommissioned instead.');
            err.statusCode = 400;
            throw err;
        }

        const borrowingCount = await prisma.borrowingOnItems.count({
            where: { inventoryItemId: itemId }
        });
        if (borrowingCount > 0) {
            const err = new Error('Cannot delete item. It has borrowing history and must be decommissioned instead.');
            err.statusCode = 400;
            throw err;
        }

        const repairCount = await prisma.repairOnItems.count({
            where: { inventoryItemId: itemId }
        });
        if (repairCount > 0) {
            const err = new Error('Cannot delete item. It has repair history and must be decommissioned instead.');
            err.statusCode = 400;
            throw err;
        }

        await prisma.$transaction(async (tx) => {
            await tx.eventLog.deleteMany({ where: { inventoryItemId: itemId } });
            await tx.inventoryItem.delete({ where: { id: itemId } });
        });

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const updateItemStatus = async (res, req, next, expectedStatus, newStatus, eventType, details) => {
    const { id } = req.params;
    const actorId = req.user.id;
    try {
        const itemId = parseInt(id);
        if (isNaN(itemId)) {
            const err = new Error('Invalid Item ID.');
            err.statusCode = 400;
            throw err;
        }

        const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, itemType: 'SALE' } });
        if (!item) {
            const err = new Error('Item not found.');
            err.statusCode = 404;
            throw err;
        }
        if (Array.isArray(expectedStatus) ? !expectedStatus.includes(item.status) : item.status !== expectedStatus) {
            const err = new Error(`Only items with status [${Array.isArray(expectedStatus) ? expectedStatus.join(', ') : expectedStatus}] can perform this action.`);
            err.statusCode = 400;
            throw err;
        }

        const [updatedItem] = await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId },
                data: { status: newStatus },
            }),
            createEventLog(
                prisma,
                itemId,
                actorId,
                eventType,
                { details: details || `Status changed from ${item.status} to ${newStatus}.` }
            )
        ]);

        res.status(200).json(updatedItem);
    } catch (error) {
        next(error);
    }
};

inventoryController.decommissionItem = (req, res, next) => {
    updateItemStatus(res, req, next, ['IN_STOCK', 'DEFECTIVE'], 'DECOMMISSIONED', EventType.DECOMMISSION, 'Item decommissioned.');
};

inventoryController.reinstateItem = (req, res, next) => {
    updateItemStatus(res, req, next, 'DECOMMISSIONED', 'IN_STOCK', EventType.REINSTATE, 'Item reinstated to stock.');
};

inventoryController.markAsReserved = (req, res, next) => {
    updateItemStatus(res, req, next, 'IN_STOCK', 'RESERVED', EventType.UPDATE, 'Item marked as reserved.');
};

inventoryController.unreserveItem = (req, res, next) => {
    updateItemStatus(res, req, next, 'RESERVED', 'IN_STOCK', EventType.UPDATE, 'Item unreserved and returned to stock.');
};

inventoryController.markAsDefective = (req, res, next) => {
    updateItemStatus(res, req, next, ['IN_STOCK', 'RESERVED'], 'DEFECTIVE', EventType.UPDATE, 'Item marked as defective.');
};

inventoryController.markAsInStock = (req, res, next) => {
    updateItemStatus(res, req, next, 'DEFECTIVE', 'IN_STOCK', EventType.UPDATE, 'Item returned to stock from defective status.');
};

module.exports = inventoryController;