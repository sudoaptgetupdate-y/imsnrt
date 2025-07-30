// ims-backend/controllers/addressController.js

const prisma = require('../prisma/client');
const addressController = {};

// POST /api/addresses - สร้างที่อยู่ใหม่
addressController.createAddress = async (req, res, next) => {
    try {
        const { name, contactPerson, phone, address } = req.body;
        
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const newAddress = await prisma.address.create({
            data: { name, contactPerson, phone, address },
        });
        res.status(201).json(newAddress);
    } catch (error) {
        next(error);
    }
};

// GET /api/addresses - ดึงข้อมูลที่อยู่ทั้งหมด
addressController.getAllAddresses = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm ? {
            OR: [
                { name: { contains: searchTerm } },
                { contactPerson: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
            ],
        } : {};

        const [addresses, totalItems] = await Promise.all([
            prisma.address.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
            prisma.address.count({ where }),
        ]);

        res.status(200).json({
            data: addresses,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/addresses/:id - ดึงข้อมูลที่อยู่เดียว
addressController.getAddressById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const addressId = parseInt(id);
        if (isNaN(addressId)) {
            const err = new Error('Invalid Address ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }

        const address = await prisma.address.findUnique({ where: { id: addressId } });
        if (!address) {
            const err = new Error('Address not found.');
            err.statusCode = 404;
            return next(err); // Changed from throw to next(err)
        }
        res.status(200).json(address);
    } catch (error) {
        next(error);
    }
};

// PUT /api/addresses/:id - อัปเดตที่อยู่
addressController.updateAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, contactPerson, phone, address } = req.body;
        
        const addressId = parseInt(id);
        if (isNaN(addressId)) {
            const err = new Error('Invalid Address ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }
        
        if (typeof name !== 'string' || name.trim() === '') {
            const err = new Error('Name is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }

        const updatedAddress = await prisma.address.update({
            where: { id: addressId },
            data: { name, contactPerson, phone, address },
        });
        res.status(200).json(updatedAddress);
    } catch (error) {
        next(error);
    }
};

// DELETE /api/addresses/:id - ลบที่อยู่
addressController.deleteAddress = async (req, res, next) => {
    try {
        const { id } = req.params;
        const addressId = parseInt(id);
        if (isNaN(addressId)) {
            const err = new Error('Invalid Address ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }
        await prisma.address.delete({ where: { id: addressId } });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

module.exports = addressController;