// controllers/brandController.js
const prisma = require('../prisma/client');

// สร้าง Brand ใหม่
exports.createBrand = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (typeof name !== 'string' || name.trim() === "") {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            return next(err);
        }
        const newBrand = await prisma.brand.create({
            data: { name },
        });
        res.status(201).json(newBrand);
    } catch (error) {
        next(error);
    }
};

// ดู Brand ทั้งหมด
exports.getAllBrands = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = searchTerm
            ? { name: { contains: searchTerm } }
            : {};

        const [brands, totalItems] = await Promise.all([
            prisma.brand.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.brand.count({ where })
        ]);

        res.status(200).json({
            data: brands,
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

exports.getBrandById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const brandId = parseInt(id);
        if (isNaN(brandId)) {
            const err = new Error('Invalid Brand ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }

        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });

        if (!brand) {
            const err = new Error('Brand not found');
            err.statusCode = 404;
            return next(err); // Changed from throw to next(err)
        }
        res.status(200).json(brand);
    } catch (error) {
        next(error);
    }
};

exports.updateBrand = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        const brandId = parseInt(id);
        if (isNaN(brandId)) {
            const err = new Error('Invalid Brand ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }

        if (typeof name !== 'string' || name.trim() === "") {
            const err = new Error('Name is required and cannot be empty');
            err.statusCode = 400;
            return next(err);
        }
        const updatedBrand = await prisma.brand.update({
            where: { id: brandId },
            data: { name },
        });
        res.status(200).json(updatedBrand);
    } catch (error) {
        next(error);
    }
};

exports.deleteBrand = async (req, res, next) => {
    try {
        const { id } = req.params;
        const brandId = parseInt(id);
        if (isNaN(brandId)) {
            const err = new Error('Invalid Brand ID.');
            err.statusCode = 400;
            return next(err); // Changed from throw to next(err)
        }
        await prisma.brand.delete({
            where: { id: brandId },
        });
        res.status(204).send(); // No Content
    } catch (error) {
        next(error);
    }
};