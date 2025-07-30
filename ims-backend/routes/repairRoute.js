// ims-backend/routes/repairRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const repairController = require('../controllers/repairController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for repair orders
router.get('/', authCheck, repairController.getAllRepairOrders);
router.get('/:id', authCheck, repairController.getRepairOrderById);
router.post('/', authCheck, roleCheck(adminAccess), repairController.createRepairOrder);

// --- START: ADDED MISSING ROUTE ---
router.post('/:id/return', authCheck, roleCheck(adminAccess), repairController.returnItemsFromRepair);
// --- END: ADDED MISSING ROUTE ---

module.exports = router;