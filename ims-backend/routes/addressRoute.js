// ims-backend/routes/addressRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const addressController = require('../controllers/addressController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for addresses
router.get('/', authCheck, addressController.getAllAddresses);
router.get('/:id', authCheck, addressController.getAddressById);
router.post('/', authCheck, roleCheck(adminAccess), addressController.createAddress);
router.put('/:id', authCheck, roleCheck(adminAccess), addressController.updateAddress);
router.delete('/:id', authCheck, roleCheck(adminAccess), addressController.deleteAddress);

module.exports = router;