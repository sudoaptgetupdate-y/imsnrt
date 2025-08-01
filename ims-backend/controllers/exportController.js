// ims-backend/controllers/exportController.js

const prisma = require('../prisma/client');
const { ItemType } = require('@prisma/client');

/**
 * ฟังก์ชันสำหรับแปลงข้อมูล JSON Array เป็น CSV String
 * @param {Array<Object>} items - ข้อมูลสินค้าที่ดึงมาจากฐานข้อมูล
 * @returns {string} - ข้อมูลในรูปแบบ CSV
 */
const jsonToCsv = (items) => {
    const header = [
        'Serial_Number', 'Product_Model', 'Brand', 'Category', 'Status',
        'Supplier_Name', 'Customer_Name', 'Purchase_Date'
    ];

    const rows = items.map(item => {
        const sale = item.sale;
        const customerName = sale ? sale.customer.name : '';
        const purchaseDate = sale ? new Date(sale.saleDate).toISOString().split('T')[0] : '';

        const row = [
            item.serialNumber || '',
            item.productModel.modelNumber,
            item.productModel.brand.name,
            item.productModel.category.name,
            item.status,
            item.supplier ? item.supplier.name : '',
            customerName,
            purchaseDate
        ];
        
        return row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    // --- FIX: แก้ไขการขึ้นบรรทัดใหม่และ BOM ---
    // 1. ใช้ \r\n จริงๆ แทน \\r\\n (escaped string)
    const csvString = [header.join(','), ...rows].join('\r\n');
    
    // 2. เพิ่ม BOM สำหรับ UTF-8 (ใช้ \uFEFF จริงๆ แทน \\uFEFF)
    const bom = '\uFEFF';

    return bom + csvString;
    // --- END: จบส่วนแก้ไข ---
};

const exportController = {};

/**
 * Controller หลักสำหรับ Export ข้อมูล Inventory
 */
exportController.exportInventory = async (req, res, next) => {
    try {
        const {
            search = '',
            status = 'All',
            categoryId = 'All',
            brandId = 'All',
            sortBy = 'serialNumber',
            sortOrder = 'asc'
        } = req.query;

        let where = { itemType: ItemType.SALE };
        const filterConditions = [];

        if (status !== 'All') {
            filterConditions.push({ status: status });
        }
        if (search) {
            filterConditions.push({
                OR: [
                    { serialNumber: { contains: search } },
                    { macAddress: { equals: search } },
                    { productModel: { modelNumber: { contains: search } } },
                ],
            });
        }
        const productModelFilters = {};
        if (categoryId !== 'All') {
            productModelFilters.categoryId = parseInt(categoryId);
        }
        if (brandId !== 'All') {
            productModelFilters.brandId = parseInt(brandId);
        }
        if (Object.keys(productModelFilters).length > 0) {
            filterConditions.push({ productModel: productModelFilters });
        }
        if (filterConditions.length > 0) {
            where.AND = filterConditions;
        }

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
                productModel: {
                    include: {
                        brand: true,
                        category: true,
                    },
                },
                supplier: true,
                sale: {
                    include: {
                        customer: true,
                    },
                },
            },
        });

        const csvData = jsonToCsv(items);

        // --- FIX: แก้ไข HTTP Headers ---
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"');
        res.setHeader('Cache-Control', 'no-cache');
        // --- END: จบส่วนแก้ไข ---
        
        res.send(csvData);

    } catch (error) {
        next(error);
    }
};

module.exports = exportController;