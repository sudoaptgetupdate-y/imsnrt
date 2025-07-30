// ims-backend/controllers/repairController.js
const prisma = require('../prisma/client');
const { ItemStatus, ItemOwner, RepairStatus, RepairOutcome, ItemType, EventType } = require('@prisma/client');
const repairController = {};

// Helper function to create event logs consistently
const createEventLog = (tx, inventoryItemId, userId, eventType, details) => {
    return tx.eventLog.create({
        data: {
            inventoryItemId,
            userId,
            eventType,
            details,
        },
    });
};

repairController.createRepairOrder = async (req, res, next) => {
    const { senderId, receiverId, notes, items, customerId } = req.body;
    const createdById = req.user.id;

    const parsedSenderId = parseInt(senderId, 10);
    const parsedReceiverId = parseInt(receiverId, 10);
    if (isNaN(parsedSenderId) || isNaN(parsedReceiverId)) {
        const err = new Error('Sender ID and Receiver ID must be valid numbers.');
        err.statusCode = 400;
        return next(err);
    }

    if (!Array.isArray(items) || items.length === 0) {
        const err = new Error('Items must be a non-empty array.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const newRepairOrder = await prisma.$transaction(async (tx) => {
            const itemsToCreate = items.filter(item => item.isCustomerItem);
            const createdCustomerItems = [];
            if (itemsToCreate.length > 0) {
                for (const item of itemsToCreate) {
                    const created = await tx.inventoryItem.create({
                        data: {
                            productModelId: item.productModelId,
                            serialNumber: item.serialNumber,
                            ownerType: ItemOwner.CUSTOMER,
                            status: ItemStatus.REPAIRING,
                            addedById: createdById,
                            itemType: ItemType.SALE 
                        },
                    });
                    createdCustomerItems.push(created);
                }
            }
            
            const companyItemIds = items.filter(item => !item.isCustomerItem).map(i => i.id);
            if (companyItemIds.length > 0) {
                await tx.inventoryItem.updateMany({
                    where: { id: { in: companyItemIds } },
                    data: { status: ItemStatus.REPAIRING },
                });
            }

            const allItemIds = [...companyItemIds, ...createdCustomerItems.map(i => i.id)];

            const repairOrder = await tx.repair.create({
                data: {
                    senderId: parsedSenderId,
                    receiverId: parsedReceiverId,
                    notes,
                    createdById,
                    customerId: customerId ? parseInt(customerId) : null,
                    items: {
                        create: allItemIds.map(id => ({
                            inventoryItemId: id
                        }))
                    }
                },
                include: { receiver: true }
            });

            for (const itemId of allItemIds) {
                await createEventLog(
                    tx,
                    itemId,
                    createdById,
                    EventType.REPAIR_SENT,
                    {
                        receiverName: repairOrder.receiver?.name || 'N/A',
                        repairId: repairOrder.id,
                        details: `Sent to repair at ${repairOrder.receiver?.name || 'N/A'}.`
                    }
                );
            }

            return repairOrder;
        });

        res.status(201).json(newRepairOrder);
    } catch (error) {
        next(error);
    }
};

repairController.getAllRepairOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.search || '';
        const statusFilter = req.query.status || 'All';

        let where = {};
        const whereConditions = [];

        if (statusFilter && statusFilter !== 'All') {
            whereConditions.push({ status: statusFilter });
        }
        
        if (searchTerm) {
            whereConditions.push({
                OR: [
                    { sender: { name: { contains: searchTerm } } },
                    { receiver: { name: { contains: searchTerm } } },
                    { id: { equals: parseInt(searchTerm) || 0 } },
                    { customer: { name: { contains: searchTerm } } }
                ]
            });
        }
        
        if(whereConditions.length > 0) {
            where.AND = whereConditions;
        }

        const [repairs, totalItems] = await Promise.all([
            prisma.repair.findMany({
                where,
                skip,
                take: limit,
                orderBy: { repairDate: 'desc' },
                include: {
                    sender: true,
                    receiver: true,
                    customer: { select: { name: true } },
                    items: { 
                        include: { 
                            inventoryItem: true
                        }
                    } 
                }
            }),
            prisma.repair.count({ where })
        ]);

        const formattedRepairs = repairs.map(r => {
            const totalItemCount = r.items.length;
            const returnedItemCount = r.items.filter(i => i.returnedAt !== null).length;
            
            let displayOwner = 'N/A';
            if (r.customer) {
                displayOwner = r.customer.name;
            } else if (r.items.length > 0) {
                const firstItemType = r.items[0].inventoryItem.itemType;
                if (firstItemType === 'ASSET') {
                    displayOwner = 'ทรัพย์สินบริษัท';
                } else {
                    displayOwner = 'สินค้าคงคลัง';
                }
            }

            const { items, ...rest } = r;
            return { ...rest, totalItemCount, returnedItemCount, owner: displayOwner };
        });

        res.status(200).json({
            data: formattedRepairs,
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

repairController.getRepairOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const repairId = parseInt(id);
        if (isNaN(repairId)) {
            const err = new Error('Invalid Repair Order ID.');
            err.statusCode = 400;
            throw err;
        }

        const repairOrder = await prisma.repair.findUnique({
            where: { id: repairId },
            include: {
                sender: true,
                receiver: true,
                createdBy: { select: { name: true } },
                customer: { select: { name: true } }, // <-- ADDED to get customer name
                items: {
                    include: {
                        inventoryItem: { 
                            include: { 
                                productModel: { // <-- MODIFIED to include category and brand
                                    include: {
                                        category: true,
                                        brand: true,
                                    }
                                } 
                            } 
                        }
                    },
                    orderBy: { sentAt: 'asc' }
                }
            }
        });

        if (!repairOrder) {
            const err = new Error('Repair order not found.');
            err.statusCode = 404;
            throw err;
        }

        res.status(200).json(repairOrder);
    } catch (error) {
        next(error);
    }
};

repairController.returnItemsFromRepair = async (req, res, next) => {
    const { id: repairId } = req.params;
    const { itemsToReturn } = req.body;
    const actorId = req.user.id;

    const id = parseInt(repairId);
    if (isNaN(id)) {
        const err = new Error('Invalid Repair Order ID.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(itemsToReturn) || itemsToReturn.length === 0) {
        const err = new Error('itemsToReturn must be a non-empty array.');
        err.statusCode = 400;
        return next(err);
    }
    const validOutcomes = Object.values(RepairOutcome);
    for (const item of itemsToReturn) {
        if (typeof item.inventoryItemId !== 'number' || !validOutcomes.includes(item.repairOutcome)) {
            const err = new Error('Each item in itemsToReturn must have a numeric inventoryItemId and a valid repairOutcome.');
            err.statusCode = 400;
            return next(err);
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            const now = new Date();

            const repairOrder = await tx.repair.findUnique({
                where: { id: id },
                include: { receiver: true }
            });

            for (const itemData of itemsToReturn) {
                const { inventoryItemId, repairOutcome } = itemData;

                const repairItemRecord = await tx.repairOnItems.findUnique({
                    where: {
                        repairId_inventoryItemId: { repairId: id, inventoryItemId: inventoryItemId }
                    },
                    include: { 
                        inventoryItem: {
                            include: {
                                sale: true // Include the related sale to check its status
                            }
                        } 
                    }
                });

                if (!repairItemRecord || repairItemRecord.inventoryItem.status !== 'REPAIRING') {
                    throw new Error(`Item ID ${inventoryItemId} is not valid for this repair order or is not in a REPAIRING state.`);
                }
                
                await tx.repairOnItems.update({
                    where: {
                        repairId_inventoryItemId: { repairId: id, inventoryItemId: inventoryItemId }
                    },
                    data: { returnedAt: now, repairOutcome: repairOutcome },
                });

                const { inventoryItem } = repairItemRecord;
                let newStatus;
                
                // *** START: CORRECTED LOGIC ***
                // Check if the item was part of a COMPLETED sale.
                const isSoldAndCompleted = inventoryItem.sale && inventoryItem.sale.status === 'COMPLETED';

                if (inventoryItem.ownerType === ItemOwner.CUSTOMER || isSoldAndCompleted) {
                    newStatus = ItemStatus.RETURNED_TO_CUSTOMER;
                } else {
                    if (repairOutcome === RepairOutcome.REPAIRED_SUCCESSFULLY) {
                        newStatus = inventoryItem.itemType === ItemType.ASSET ? ItemStatus.IN_WAREHOUSE : ItemStatus.IN_STOCK;
                    } else {
                        newStatus = ItemStatus.DECOMMISSIONED;
                    }
                }
                // *** END: CORRECTED LOGIC ***
                
                await tx.inventoryItem.update({
                    where: { id: inventoryItemId },
                    data: { status: newStatus },
                });

                await createEventLog(
                    tx,
                    inventoryItemId,
                    actorId,
                    EventType.REPAIR_RETURNED,
                    {
                        receiverName: repairOrder?.receiver?.name || 'N/A',
                        repairId: id,
                        outcome: repairOutcome,
                        details: `Returned from ${repairOrder?.receiver?.name || 'N/A'}.`
                    }
                );
            }

            const remainingItems = await tx.repairOnItems.count({
                where: { repairId: id, returnedAt: null }
            });

            const newRepairStatus = remainingItems === 0 ? RepairStatus.COMPLETED : RepairStatus.PARTIALLY_RETURNED;
            
            await tx.repair.update({
                where: { id: id },
                data: { status: newRepairStatus },
            });
        });

        res.status(200).json({ message: 'Items have been returned successfully.' });
    } catch (error) {
        next(error);
    }
};

module.exports = repairController;