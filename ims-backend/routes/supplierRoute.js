// ims-backend/routes/supplierRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const supplierController = require('../controllers/supplierController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// GET routes are accessible by any authenticated user
router.get('/', authCheck, supplierController.getAllSuppliers);
router.get('/:id', authCheck, supplierController.getSupplierById);

// POST, PUT, DELETE routes are restricted to admin roles
router.post('/', authCheck, roleCheck(adminAccess), supplierController.createSupplier);
router.put('/:id', authCheck, roleCheck(adminAccess), supplierController.updateSupplier);
router.delete('/:id', authCheck, roleCheck(adminAccess), supplierController.deleteSupplier);

module.exports = router;