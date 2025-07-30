// ims-backend/routes/reportRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');
const reportController = require('../controllers/reportController');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

router.get('/sales', authCheck, roleCheck(adminAccess), reportController.getSalesReport);

module.exports = router;