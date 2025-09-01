const prisma = require('../prisma/client');
const { ItemType } = require('@prisma/client');

const inventoryToCsv = (items) => {
    // 1. เพิ่ม BOM ( \uFEFF ) เข้าไปหน้า header
    const header = "\uFEFFCategory,Brand,Model,SerialNumber,MACAddress,Status,Supplier,Customer,SoldDate,Notes\n";
    const rows = items.map(item => {
        const category = item.productModel.category.name.replace(/,/g, '');
        const brand = item.productModel.brand.name.replace(/,/g, '');
        const model = item.productModel.modelNumber.replace(/,/g, '');
        const serial = item.serialNumber || '';
        const mac = item.macAddress || '';
        const status = item.status || '';
        const supplier = item.supplier?.name.replace(/,/g, '') || '';
        
        let customerName = '';
        let soldDate = '';
        if (item.sale && item.sale.customer) {
            customerName = item.sale.customer.name.replace(/,/g, '');
            soldDate = item.sale.saleDate ? new Date(item.sale.saleDate).toISOString().split('T')[0] : '';
        }

        const notes = (item.notes || '').replace(/"/g, '""');

        return `"${category}","${brand}","${model}","${serial}","${mac}","${status}","${supplier}","${customerName}","${soldDate}","${notes}"`;
    }).join('\n');
    return header + rows;
};


const assetToCsv = (items) => {
    // 2. เพิ่ม BOM ( \uFEFF ) เข้าไปหน้า header
    const header = "\uFEFFAssetCode,Category,Brand,Model,SerialNumber,MACAddress,Status,Supplier,AssignedTo,AssignmentDate,Notes\n";
    const rows = items.map(item => {
        const assetCode = item.assetCode || '';
        const category = item.productModel.category.name.replace(/,/g, '');
        const brand = item.productModel.brand.name.replace(/,/g, '');
        const model = item.productModel.modelNumber.replace(/,/g, '');
        const serial = item.serialNumber || '';
        const mac = item.macAddress || '';
        const status = item.status || '';
        const supplier = item.supplier?.name.replace(/,/g, '') || '';

        let assignedTo = '';
        let assignmentDate = '';
        const currentAssignment = item.assignmentRecords
            .filter(record => !record.returnedAt)
            .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0];

        if (currentAssignment && currentAssignment.assignment.assignee) {
            assignedTo = currentAssignment.assignment.assignee.name.replace(/,/g, '');
            assignmentDate = new Date(currentAssignment.assignedAt).toISOString().split('T')[0];
        }
        
        const notes = (item.notes || '').replace(/"/g, '""');

        return `"${assetCode}","${category}","${brand}","${model}","${serial}","${mac}","${status}","${supplier}","${assignedTo}","${assignmentDate}","${notes}"`;
    }).join('\n');
    return header + rows;
};


const exportController = {};

exportController.exportInventory = async (req, res, next) => {
    try {
        const { search, status, categoryId, brandId, sortBy = 'serialNumber', sortOrder = 'asc' } = req.query;

        let where = { itemType: ItemType.SALE };
        if (status && status !== 'All') where.status = status;
        if (search) {
            where.OR = [
                { serialNumber: { contains: search } },
                { macAddress: { equals: search } },
                { productModel: { modelNumber: { contains: search } } },
            ];
        }
        
        const productModelConditions = {};
        if (categoryId && categoryId !== 'All') productModelConditions.categoryId = parseInt(categoryId);
        if (brandId && brandId !== 'All') productModelConditions.brandId = parseInt(brandId);
        if (Object.keys(productModelConditions).length > 0) where.productModel = productModelConditions;

        let orderBy = {};
        if (sortBy === 'customerName') {
            orderBy = { sale: { customer: { name: sortOrder } } };
        } else if (sortBy === 'supplierName') {
            orderBy = { supplier: { name: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const items = await prisma.inventoryItem.findMany({
            where,
            orderBy,
            include: {
                productModel: { include: { category: true, brand: true } },
                supplier: true,
                sale: { include: { customer: true } }
            }
        });

        const csvData = inventoryToCsv(items);
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment('inventory-export.csv');
        res.send(csvData);
    } catch (error) {
        next(error);
    }
};

exportController.exportAssets = async (req, res, next) => {
    try {
        const { search, status, categoryId, brandId, sortBy = 'assetCode', sortOrder = 'asc' } = req.query;
        
        let where = { itemType: ItemType.ASSET };
        if (status && status !== 'All') where.status = status;
        if (search) {
            where.OR = [
                { assetCode: { contains: search } },
                { serialNumber: { contains: search } },
                { macAddress: { equals: search } },
                { productModel: { modelNumber: { contains: search } } },
            ];
        }

        const productModelConditions = {};
        if (categoryId && categoryId !== 'All') productModelConditions.categoryId = parseInt(categoryId);
        if (brandId && brandId !== 'All') productModelConditions.brandId = parseInt(brandId);
        if (Object.keys(productModelConditions).length > 0) where.productModel = productModelConditions;
        
        let orderBy = {};
        if (sortBy === 'assignedTo') {
             orderBy = { assignmentRecords: { _count: sortOrder } };
        } else {
            orderBy = { [sortBy]: sortOrder };
        }

        const items = await prisma.inventoryItem.findMany({
            where,
            orderBy,
            include: {
                productModel: { include: { category: true, brand: true } },
                supplier: true,
                assignmentRecords: {
                    include: {
                        assignment: {
                            include: {
                                assignee: true
                            }
                        }
                    }
                }
            }
        });

        const csvData = assetToCsv(items);
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment('asset-export.csv');
        res.send(csvData);
    } catch (error) {
        next(error);
    }
};

module.exports = exportController;