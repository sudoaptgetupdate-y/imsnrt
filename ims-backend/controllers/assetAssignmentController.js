// ims-backend/controllers/assetAssignmentController.js
const prisma = require('../prisma/client');
const { EventType, AssignmentStatus } = require('@prisma/client');
const assetAssignmentController = {};

const createEventLog = (tx, inventoryItemId, userId, eventType, details) => {
    return tx.eventLog.create({
        data: { inventoryItemId, userId, eventType, details },
    });
};

assetAssignmentController.createAssignment = async (req, res, next) => {
    const { assigneeId, inventoryItemIds, notes } = req.body;
    const approvedById = req.user.id;

    const parsedAssigneeId = parseInt(assigneeId, 10);
    if (isNaN(parsedAssigneeId)) {
        const err = new Error('Assignee ID must be a valid number.');
        err.statusCode = 400;
        return next(err);
    }

    if (!Array.isArray(inventoryItemIds) || inventoryItemIds.length === 0 || inventoryItemIds.some(id => typeof id !== 'number')) {
        const err = new Error('inventoryItemIds must be a non-empty array of numbers.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const newAssignment = await prisma.$transaction(async (tx) => {
            const itemsToAssign = await tx.inventoryItem.findMany({
                where: {
                    id: { in: inventoryItemIds },
                    status: 'IN_WAREHOUSE',
                    itemType: 'ASSET'
                }
            });
            const assignee = await tx.user.findUnique({ where: { id: parsedAssigneeId } });

            if (!assignee) {
                const err = new Error('Assignee not found.');
                err.statusCode = 404;
                throw err;
            }
            if (itemsToAssign.length !== inventoryItemIds.length) {
                const err = new Error('One or more assets are not available or not found in the warehouse.');
                err.statusCode = 400;
                throw err;
            }

            const createdAssignment = await tx.assetAssignment.create({
                data: {
                    assigneeId: parsedAssigneeId,
                    approvedById,
                    notes,
                    status: 'ASSIGNED',
                },
            });

            await tx.assetAssignmentOnItems.createMany({
                data: inventoryItemIds.map(itemId => ({
                    assignmentId: createdAssignment.id,
                    inventoryItemId: itemId,
                })),
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: inventoryItemIds } },
                data: { status: 'ASSIGNED' },
            });

            for (const itemId of inventoryItemIds) {
                 await createEventLog(
                    tx,
                    itemId,
                    approvedById,
                    EventType.ASSIGN,
                    {
                        assignee: assignee.name,
                        assignmentId: createdAssignment.id,
                        details: `Assigned to ${assignee.name}.`
                    }
                );
            }

            return createdAssignment;
        });

        res.status(201).json(newAssignment);

    } catch (error) {
        next(error);
    }
};

assetAssignmentController.returnItems = async (req, res, next) => {
    const { assignmentId } = req.params;
    const { itemIdsToReturn } = req.body;
    const actorId = req.user.id;

    const id = parseInt(assignmentId);
    if (isNaN(id)) {
        const err = new Error('Invalid Assignment ID.');
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
            const assignment = await tx.assetAssignment.findUnique({ where: { id: id }, include: { assignee: true } });
            if (!assignment) {
                const err = new Error('Assignment record not found.');
                err.statusCode = 404;
                throw err;
            }

            await tx.assetAssignmentOnItems.updateMany({
                where: {
                    assignmentId: id,
                    inventoryItemId: { in: itemIdsToReturn },
                },
                data: { returnedAt: new Date() },
            });

            await tx.inventoryItem.updateMany({
                where: { id: { in: itemIdsToReturn } },
                data: { status: 'IN_WAREHOUSE' },
            });

            for (const itemId of itemIdsToReturn) {
                await createEventLog(
                    tx,
                    itemId,
                    actorId,
                    EventType.RETURN_FROM_ASSIGN,
                    {
                        returnedFrom: assignment.assignee?.name || 'N/A',
                        assignmentId: id,
                        details: `Returned from ${assignment.assignee?.name || 'N/A'}.`
                    }
                );
            }

            const remainingItems = await tx.assetAssignmentOnItems.count({
                where: {
                    assignmentId: id,
                    returnedAt: null
                }
            });

            let newStatus = remainingItems === 0 ? AssignmentStatus.RETURNED : AssignmentStatus.PARTIALLY_RETURNED;

            await tx.assetAssignment.update({
                where: { id: id },
                data: {
                    status: newStatus,
                    returnDate: newStatus === AssignmentStatus.RETURNED ? new Date() : null,
                },
            });
        });

        res.status(200).json({ message: 'Assets returned successfully.' });
    } catch (error) {
        next(error);
    }
};

assetAssignmentController.getAllAssignments = async (req, res, next) => {
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
                    { assignee: { name: { contains: searchTerm } } },
                    { id: { equals: parseInt(searchTerm) || 0 } }
                ]
            });
        }
        
        if(whereConditions.length > 0) {
            where.AND = whereConditions;
        }

        const [assignments, totalItems] = await Promise.all([
            prisma.assetAssignment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { assignedDate: 'desc' },
                include: {
                    assignee: { select: { id: true, name: true } },
                    approvedBy: { select: { id: true, name: true } },
                    items: {
                        select: {
                            returnedAt: true
                        }
                    }
                }
            }),
            prisma.assetAssignment.count({ where })
        ]);
        
        const formattedAssignments = assignments.map(a => {
            const totalItemCount = a.items.length;
            const returnedItemCount = a.items.filter(item => item.returnedAt !== null).length;
            const { items, ...rest } = a;
            return {
                ...rest,
                totalItemCount,
                returnedItemCount
            };
        });

        res.status(200).json({
            data: formattedAssignments,
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

assetAssignmentController.getAssignmentById = async (req, res, next) => {
    const { assignmentId } = req.params;
    try {
        const id = parseInt(assignmentId);
        if (isNaN(id)) {
            const err = new Error("Invalid Assignment ID provided.");
            err.statusCode = 400;
            throw err;
        }

        const assignment = await prisma.assetAssignment.findUnique({
            where: { id: id },
            include: {
                assignee: true,
                approvedBy: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        inventoryItem: {
                            include: {
                                // --- START: แก้ไขส่วนนี้ ---
                                productModel: {
                                    include: {
                                        category: true,
                                        brand: true
                                    }
                                }
                                // --- END: แก้ไขส่วนนี้ ---
                            }
                        }
                    }
                }
            }
        });

        if (!assignment) {
            const err = new Error('Assignment record not found');
            err.statusCode = 404;
            throw err;
        }
        
        res.status(200).json(assignment);
    } catch (error) {
        next(error);
    }
};

module.exports = assetAssignmentController;