// controllers/customerController.js
const prisma = require('../prisma/client');
const customerController = {};

// ... (functions from createCustomer to deleteCustomer remain the same)
customerController.createCustomer = async (req, res, next) => {
    try {
        const { customerCode, name, phone, address } = req.body;
        const userId = req.user.id; 

        if (typeof customerCode !== 'string' || customerCode.trim() === '') {
            const err = new Error('Customer Code is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Customer Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const newCustomer = await prisma.customer.create({
            data: {
                customerCode,
                name,
                phone,
                address,
                createdById: userId,
            },
        });
        res.status(201).json(newCustomer);
    } catch (error) {
        next(error);
    }
};

customerController.getAllCustomers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm 
            ? {
                OR: [
                    { name: { contains: searchTerm } },
                    { customerCode: { contains: searchTerm } },
                    { phone: { contains: searchTerm } }
                ],
            }
            : {};

        const [customers, totalItems] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip: skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { createdBy: { select: { name: true } } }
            }),
            prisma.customer.count({ where })
        ]);
        
        res.status(200).json({
            data: customers,
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

customerController.getCustomerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
        });

        if (!customer) {
            const err = new Error('Customer not found');
            err.statusCode = 404;
            return next(err);
        }
        res.status(200).json(customer);
    } catch (error) {
        next(error);
    }
};

customerController.updateCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { customerCode, name, phone, address } = req.body;
        
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        if (typeof customerCode !== 'string' || customerCode.trim() === '') {
            const err = new Error('Customer Code is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Customer Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: customerId },
            data: { customerCode, name, phone, address },
        });
        res.status(200).json(updatedCustomer);
    } catch (error) {
        next(error);
    }
};

customerController.deleteCustomer = async (req, res, next) => {
    try {
        const { id } = req.params;
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        await prisma.customer.delete({
            where: { id: customerId },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

customerController.getCustomerHistory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }

        const [sales, borrowings] = await Promise.all([
            prisma.sale.findMany({
                where: { customerId: customerId },
                include: { itemsSold: { include: { productModel: true } } },
                orderBy: { saleDate: 'desc' }
            }),
            prisma.borrowing.findMany({
                where: { customerId: customerId }, // <-- แก้ไขจาก borrowerId
                include: { 
                    items: {
                        include: { inventoryItem: { include: { productModel: true } } }
                    }
                },
                orderBy: { borrowDate: 'desc' }
            })
        ]);

        const salesHistory = sales.map(sale => ({
            type: 'SALE',
            id: `sale-${sale.id}`,
            date: sale.saleDate,
            itemCount: sale.itemsSold.length,
            details: sale
        }));

        const borrowingHistory = borrowings.map(b => ({
            type: 'BORROWING',
            id: `borrow-${b.id}`,
            date: b.borrowDate,
            itemCount: b.items.length,
            details: b
        }));

        const combinedHistory = [...salesHistory, ...borrowingHistory]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(combinedHistory);

    } catch (error) {
        next(error);
    }
};

customerController.getCustomerSummary = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        const [purchases, borrowings] = await Promise.all([
            prisma.sale.findMany({
                where: { customerId, status: 'COMPLETED' },
                include: { itemsSold: { include: { productModel: true } } },
                orderBy: { saleDate: 'desc' }
            }),
            prisma.borrowing.findMany({
                where: { customerId: customerId }, // <-- แก้ไขจาก borrowerId
                include: {
                    items: { 
                        include: {
                            inventoryItem: { include: { productModel: true } }
                        }
                    }
                },
                orderBy: { borrowDate: 'desc' }
            })
        ]);

        const allBorrowedItems = borrowings.flatMap(b =>
            b.items.map(boi => ({
                ...boi.inventoryItem,
                borrowDate: b.borrowDate,
                dueDate: b.dueDate,
                returnedAt: boi.returnedAt,
            }))
        );

        const currentlyBorrowedItems = allBorrowedItems.filter(item => item.returnedAt === null);
        const returnedItemsHistory = allBorrowedItems.filter(item => item.returnedAt !== null);

        const purchaseHistory = purchases.flatMap(sale =>
            sale.itemsSold.map(item => ({
                ...item,
                transactionDate: sale.saleDate,
                transactionId: sale.id
            }))
        );

        res.status(200).json({
            purchaseHistory,
            currentlyBorrowedItems,
            returnedItemsHistory
        });
    } catch (error) {
        next(error);
    }
};

customerController.getActiveBorrowings = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        const activeBorrowings = await prisma.borrowing.findMany({
            where: {
                customerId: customerId, // <-- แก้ไขจาก borrowerId
                status: 'BORROWED',
            },
            include: {
                items: {
                    where: { returnedAt: null },
                    include: { 
                        inventoryItem: {
                            include: { productModel: true }
                        }
                    }
                }
            },
            orderBy: { borrowDate: 'asc' },
        });
        
        const formattedActiveBorrowings = activeBorrowings.map(b => ({
            ...b,
            items: b.items.map(i => i.inventoryItem)
        }));

        res.status(200).json(formattedActiveBorrowings);

    } catch (error) {
        next(error);
    }
};

customerController.getReturnedHistory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        const returnedRecords = await prisma.borrowingOnItems.findMany({
            where: {
                borrowing: {
                    customerId: customerId, // <-- แก้ไขจาก borrowerId
                },
                returnedAt: {
                    not: null,
                }
            },
            include: {
                inventoryItem: {
                    include: {
                        productModel: {
                            include: {
                                brand: true,
                                category: true
                            }
                        }
                    }
                },
                borrowing: true,
            },
            orderBy: {
                returnedAt: 'desc',
            }
        });
        
        const formattedItems = returnedRecords.map(record => ({
            ...record.inventoryItem,
            returnDate: record.returnedAt,
            borrowDate: record.borrowing.borrowDate,
            transactionId: record.borrowingId,
        }));
        
        res.status(200).json(formattedItems);
    } catch (error) {
        next(error);
    }
};

customerController.getPurchaseHistory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const customerId = parseInt(id);
        if (isNaN(customerId)) {
            const err = new Error('Invalid Customer ID.');
            err.statusCode = 400;
            return next(err);
        }
        
        const sales = await prisma.sale.findMany({
            where: { customerId: customerId, status: 'COMPLETED' },
            include: {
                itemsSold: {
                    where: {
                        status: {
                            in: ['SOLD', 'RETURNED_TO_CUSTOMER']
                        }
                    },
                    include: { 
                        productModel: {
                            include: {
                                brand: true,
                                category: true
                            }
                        } 
                    }
                }
            },
            orderBy: { saleDate: 'desc' }
        });

        const purchasedItems = sales.flatMap(s => 
            s.itemsSold.map(item => ({
                ...item,
                purchaseDate: s.saleDate,
                transactionId: s.id
            }))
        );

        res.status(200).json(purchasedItems);
    } catch (error) {
        next(error);
    }
};

module.exports = customerController;