// ims-backend/routes/inventoryRoute.js

const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const inventoryController = require('../controllers/inventoryController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for inventory items (for SALE)
router.get('/', authCheck, inventoryController.getAllInventoryItems);
router.get('/:id', authCheck, inventoryController.getInventoryItemById);

// --- START: เพิ่ม Route ใหม่สำหรับ Batch Create ---
router.post('/batch', authCheck, roleCheck(adminAccess), inventoryController.addBatchInventoryItems);
// --- END ---

router.post('/', authCheck, roleCheck(adminAccess), inventoryController.addInventoryItem);
router.put('/:id', authCheck, roleCheck(adminAccess), inventoryController.updateInventoryItem);
router.delete('/:id', authCheck, roleCheck(adminAccess), inventoryController.deleteInventoryItem);

router.patch('/:id/decommission', authCheck, roleCheck(adminAccess), inventoryController.decommissionItem);
router.patch('/:id/reinstate', authCheck, roleCheck(adminAccess), inventoryController.reinstateItem);

router.patch('/:id/reserve', authCheck, roleCheck(adminAccess), inventoryController.markAsReserved);
router.patch('/:id/unreserve', authCheck, roleCheck(adminAccess), inventoryController.unreserveItem);
router.patch('/:id/defect', authCheck, roleCheck(adminAccess), inventoryController.markAsDefective);
router.patch('/:id/in-stock', authCheck, roleCheck(adminAccess), inventoryController.markAsInStock);

module.exports = router;