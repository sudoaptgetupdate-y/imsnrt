// controllers/productModelController.js
const prisma = require('../prisma/client');

// --- Create a new Product Model ---
exports.createProductModel = async (req, res, next) => {
    try {
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;
        const userId = req.user.id;

        if (typeof modelNumber !== 'string' || modelNumber.trim() === '') {
            const err = new Error('Model Number is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
            const err = new Error('Selling Price must be a non-negative number.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof categoryId !== 'number' || typeof brandId !== 'number') {
            const err = new Error('Category ID and Brand ID must be numbers.');
            err.statusCode = 400;
            return next(err);
        }

        const newProductModel = await prisma.productModel.create({
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId,
                brandId,
                createdById: userId,
            },
        });
        res.status(201).json(newProductModel);
    } catch (error) {
        next(error);
    }
};

// --- Get all Product Models (Paginated or All) ---
exports.getAllProductModels = async (req, res, next) => {
    try {
        const includeRelations = {
            category: true,
            brand: true,
            createdBy: {
                select: { id: true, name: true }
            }
        };

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';
        
        // --- START: เพิ่มการรับค่า Filter ---
        const categoryIdFilter = req.query.categoryId || 'All';
        const brandIdFilter = req.query.brandId || 'All';

        let where = {};
        const whereConditions = [];

        if (searchTerm) {
            whereConditions.push({
                OR: [
                    { modelNumber: { contains: searchTerm } },
                    { description: { contains: searchTerm } },
                    { brand: { name: { contains: searchTerm } } },
                    { category: { name: { contains: searchTerm } } }
                ]
            });
        }

        if (categoryIdFilter && categoryIdFilter !== 'All') {
            whereConditions.push({ categoryId: parseInt(categoryIdFilter) });
        }

        if (brandIdFilter && brandIdFilter !== 'All') {
            whereConditions.push({ brandId: parseInt(brandIdFilter) });
        }

        if (whereConditions.length > 0) {
            where.AND = whereConditions;
        }
        // --- END ---
        
        let orderBy = {};
        if (sortBy === 'category') {
            orderBy = { category: { name: sortOrder } };
        } else if (sortBy === 'brand') {
            orderBy = { brand: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }
        
        const [productModels, totalItems] = await Promise.all([
            prisma.productModel.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: includeRelations
            }),
            prisma.productModel.count({ where })
        ]);

        res.status(200).json({
            data: productModels,
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

// --- Get a single Product Model by ID ---
exports.getProductModelById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const modelId = parseInt(id);
        if (isNaN(modelId)) {
            const err = new Error('Invalid Product Model ID.');
            err.statusCode = 400;
            throw err;
        }

        const productModel = await prisma.productModel.findUnique({
            where: { id: modelId },
            include: { 
                category: true, 
                brand: true,
                createdBy: { select: { id: true, name: true } }
            }
        });

        if (!productModel) {
            const err = new Error('Product Model not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(productModel);
    } catch (error) {
        next(error);
    }
};

// --- Update a Product Model ---
exports.updateProductModel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { modelNumber, description, sellingPrice, categoryId, brandId } = req.body;

        const modelId = parseInt(id);
        if (isNaN(modelId)) {
            const err = new Error('Invalid Product Model ID.');
            err.statusCode = 400;
            throw err;
        }

        if (typeof modelNumber !== 'string' || modelNumber.trim() === '') {
            const err = new Error('Model Number is required and cannot be empty.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
            const err = new Error('Selling Price must be a non-negative number.');
            err.statusCode = 400;
            return next(err);
        }
        if (typeof categoryId !== 'number' || typeof brandId !== 'number') {
            const err = new Error('Category ID and Brand ID must be numbers.');
            err.statusCode = 400;
            return next(err);
        }

        const updatedProductModel = await prisma.productModel.update({
            where: { id: modelId },
            data: {
                modelNumber,
                description,
                sellingPrice,
                categoryId: parseInt(categoryId, 10),
                brandId: parseInt(brandId, 10),
            },
        });
        res.status(200).json(updatedProductModel);
    } catch (error) {
        next(error);
    }
};

// --- Delete a Product Model ---
exports.deleteProductModel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const modelId = parseInt(id);
        if (isNaN(modelId)) {
            const err = new Error('Invalid Product Model ID.');
            err.statusCode = 400;
            throw err;
        }
        await prisma.productModel.delete({
            where: { id: modelId },
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};