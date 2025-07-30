// ims-backend/routes/companyProfileRoute.js
const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const { getProfile, updateProfile } = require('../controllers/companyProfileController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Any authenticated user can view the profile (for receipts)
router.get('/', authCheck, getProfile);

// Only admins can update the profile
router.put('/', authCheck, roleCheck(adminAccess), updateProfile);

module.exports = router;