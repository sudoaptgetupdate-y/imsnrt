// routes/borrowingRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    createBorrowing,
    getAllBorrowings,
    returnItems,
    getBorrowingById,
    createHistoricalBorrowing // --- 1. Import ฟังก์ชันใหม่ ---
} = require('../controllers/borrowingController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];
const superAdminAccess = ['SUPER_ADMIN']; // --- 2. เพิ่มตัวแปรสำหรับ Super Admin ---

router.get('/', authCheck, getAllBorrowings);
router.get('/:borrowingId', authCheck, getBorrowingById); 
router.post('/', authCheck, roleCheck(adminAccess), createBorrowing);
router.patch('/:borrowingId/return', authCheck, roleCheck(adminAccess), returnItems);

// --- 3. เพิ่ม Route ใหม่สำหรับ Historical Data ---
router.post('/historical', authCheck, roleCheck(superAdminAccess), createHistoricalBorrowing);

module.exports = router;