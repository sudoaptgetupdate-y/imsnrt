// ims-backend/controllers/borrowingController.js
const prisma = require('../prisma/client');
const { EventType } = require('@prisma/client');
const borrowingController = {};

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

borrowingController.createBorrowing = async (req, res, next) => {
    // --- START: CORRECTED FIX ---
    const { customerId, inventoryItemIds, dueDate, notes } = req.body;
    const approvedById = req.user.id;

    const parsedCustomerId = parseInt(customerId, 10);
    if (isNaN(parsedCustomerId)) {
        const err = new Error('Customer ID must be a valid number.');
        err.statusCode = 400;
        return next(err);
    }
    // --- END: CORRECTED FIX ---

    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }
    if (dueDate && isNaN(Date.parse(dueDate))) {
        const err = new Error('Invalid due date format.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const newBorrowing = await prisma.$transaction(async (tx) => {
            const itemsToBorrow = await tx.inventoryItem.findMany({
                where: { id: { in: inventoryItemIds }, status: 'IN_STOCK' }
            });

            if (itemsToBorrow.length !== inventoryItemIds.length) {
                const err = new Error('One or more items are not available or not found.');
                err.statusCode = 400;
                throw err;
            }

            const customer = await tx.customer.findUnique({ where: { id: parsedCustomerId } });
             if (!customer) {
                const err = new Error('Customer not found.');
                err.statusCode = 404;
                throw err;
            }

            const createdBorrowing = await tx.borrowing.create({
                data: {
                    customerId: parsedCustomerId,
                    approvedById,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    notes,
                    status: 'BORROWED',
                },
            });
            
            await tx.borrowingOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    borrowingId: createdBorrowing.id,
                    inventoryItemId: itemId,
                })),
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'BORROWED' },
            });

            for (const itemId of inventoryItemIds) {
                await createEventLog(
                    tx,
                    itemId,
                    approvedById,
                    EventType.BORROW,
                    {
                        customerName: customer.name,
                        borrowingId: createdBorrowing.id,
                        details: `Item borrowed by ${customer.name}.`
                    }
                );
            }

            return tx.borrowing.findUnique({
                where: { id: createdBorrowing.id },
                include: {
                    customer: true,
                    approvedBy: { select: { id: true, name: true } },
                    items: { include: { inventoryItem: { include: { productModel: true } } } }
                }
            });
        });

        res.status(201).json(newBorrowing);

    } catch (error) {
        next(error);
    }
};

// ... ส่วนที่เหลือของไฟล์ไม่ต้องแก้ไข ...

borrowingController.returnItems = async (req, res, next) => {
    const { borrowingId } = req.params;
    const { itemIdsToReturn } = req.body;
    const actorId = req.user.id;

    const id = parseInt(borrowingId);
    if (isNaN(id)) {
        const err = new Error('Invalid Borrowing ID.');
        err.statusCode = 400;
        return next(err);
    }
    if (!Array.isArray(itemIdsToReturn) || itemIdsToReturn.length === 0 || itemIdsToReturn.some(item => typeof item !== 'number')) {
        const err = new Error('itemIdsToReturn must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        await prisma.$transaction(async (tx) => {
             const borrowing = await tx.borrowing.findUnique({
                where: { id: id },
                include: { customer: true }
            });
            if (!borrowing) {
                const err = new Error('Borrowing record not found.');
                err.statusCode = 404;
                throw err;
            }

            await tx.borrowingOnItems.updateMany({
                where: {
                    borrowingId: id,
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });
            
            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_STOCK' },
            });

            for (const itemId of itemIdsToReturn) {
                await createEventLog(
                    tx,
                    itemId,
                    actorId,
                    EventType.RETURN_FROM_BORROW,
                    {
                        customerName: borrowing.customer.name,
                        borrowingId: id,
                        details: `Item returned from ${borrowing.customer.name}.`
                    }
                );
            }

            const remainingItems = await tx.borrowingOnItems.count({
                where: {
                    borrowingId: id,
                    returnedAt: null
                }
            });

            if (remainingItems === 0) {
                await tx.borrowing.update({
                    where: { id: id },
                    data: {
                        status: 'RETURNED',
                        returnDate: new Date(),
                    },
                });
            }
        });

        res.status(200).json({ message: 'Items returned successfully.' });

    } catch (error) {
        next(error);
    }
};

borrowingController.getAllBorrowings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'borrowDate';
        const sortOrder = req.query.sortOrder || 'desc';
        
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
                    { customer: { name: { contains: searchTerm } } },
                    { approvedBy: { name: { contains: searchTerm } } },
                    { items: { some: { inventoryItem: { serialNumber: { contains: searchTerm } } } } }
                ]
            });
        }
        
        if(whereConditions.length > 0) {
            where.AND = whereConditions;
        }

        let orderBy = {};
        if (sortBy === 'customer') {
            orderBy = { customer: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const [borrowings, totalItems] = await Promise.all([
            prisma.borrowing.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    customer: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: {
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.borrowing.count({ where })
        ]);
        
        const formattedBorrowings = borrowings.map(b => {
            const totalItemCount = b.items.length;
            const returnedItemCount = b.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = b;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedBorrowings,
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

borrowingController.getBorrowingById = async (req, res, next) => {
    try {
        const { borrowingId } = req.params;
        
        const id = parseInt(borrowingId);
        if (isNaN(id)) {
            const err = new Error("Invalid Borrowing ID provided.");
            err.statusCode = 400;
            throw err;
        }

        const borrowing = await prisma.borrowing.findUnique({
            where: { id: id },
            include: {
                customer: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                productModel: {
                                    include: { brand: true, category: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!borrowing) {
            const err = new Error('Borrowing record not found');
            err.statusCode = 404;
            throw err;
        }
        
        res.status(200).json(borrowing);

    } catch (error) {
        next(error);
    }
};

module.exports = borrowingController;