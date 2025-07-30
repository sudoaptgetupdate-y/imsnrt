// routes/borrowingRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const {
    createBorrowing,
    getAllBorrowings,
    returnItems,
    getBorrowingById
} = require('../controllers/borrowingController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

router.get('/', authCheck, getAllBorrowings);
router.get('/:borrowingId', authCheck, getBorrowingById); 
router.post('/', authCheck, roleCheck(adminAccess), createBorrowing);
router.patch('/:borrowingId/return', authCheck, roleCheck(adminAccess), returnItems);

module.exports = router;