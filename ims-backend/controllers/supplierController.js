// ims-backend/controllers/supplierController.js

const prisma = require('../prisma/client');
const supplierController = {};

// --- Create a new Supplier ---
supplierController.createSupplier = async (req, res, next) => {
    try {
        const { supplierCode, name, contactPerson, phone, address } = req.body;
        const userId = req.user.id; 

        if (typeof supplierCode !== 'string' || supplierCode.trim() === '') {
            const err = new Error('Supplier Code is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Supplier Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const newSupplier = await prisma.supplier.create({
            data: {
                supplierCode,
                name,
                contactPerson,
                phone,
                address,
                createdById: userId,
            },
        });
        res.status(201).json(newSupplier);
    } catch (error) {
        next(error);
    }
};

// --- Get all Suppliers ---
supplierController.getAllSuppliers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm 
            ? {
                OR: [
                    { name: { contains: searchTerm } },
                    { supplierCode: { contains: searchTerm } },
                    { contactPerson: { contains: searchTerm } },
                    { phone: { contains: searchTerm } }
                ],
            }
            : {};

        const [suppliers, totalItems] = await Promise.all([
            prisma.supplier.findMany({
                where,
                skip: skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { createdBy: { select: { name: true } } }
            }),
            prisma.supplier.count({ where })
        ]);
        
        res.status(200).json({
            data: suppliers,
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

// --- Get a single Supplier by ID ---
supplierController.getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const supplierId = parseInt(id);
        if (isNaN(supplierId)) {
            const err = new Error('Invalid Supplier ID.');
            err.statusCode = 400;
            throw err;
        }

        const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
        });

        if (!supplier) {
            const err = new Error('Supplier not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(supplier);
    } catch (error) {
        next(error);
    }
};

// --- Update a Supplier ---
supplierController.updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { supplierCode, name, contactPerson, phone, address } = req.body;
        
        const supplierId = parseInt(id);
        if (isNaN(supplierId)) {
            const err = new Error('Invalid Supplier ID.');
            err.statusCode = 400;
            throw err;
        }
        
        if (typeof supplierCode !== 'string' || supplierCode.trim() === '') {
            const err = new Error('Supplier Code is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Supplier Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const updatedSupplier = await prisma.supplier.update({
            where: { id: supplierId },
            data: { supplierCode, name, contactPerson, phone, address },
        });
        res.status(200).json(updatedSupplier);
    } catch (error) {
        next(error);
    }
};

// --- Delete a Supplier ---
supplierController.deleteSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const supplierId = parseInt(id);
        if (isNaN(supplierId)) {
            const err = new Error('Invalid Supplier ID.');
            err.statusCode = 400;
            throw err;
        }
        await prisma.supplier.delete({
            where: { id: supplierId },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = supplierController;