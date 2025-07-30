// ims-backend/routes/historyRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const historyController = require('../controllers/historyController.js');

// Route กลางสำหรับดึงประวัติของ Item ID ใดๆ
router.get('/:itemId', authCheck, historyController.getHistoryByItemId);

module.exports = router;