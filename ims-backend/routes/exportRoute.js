// ims-backend/routes/exportRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const exportController = require('../controllers/exportController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// URL: GET /api/export/inventory
router.get('/inventory', authCheck, roleCheck(adminAccess), exportController.exportInventory);

module.exports = router;