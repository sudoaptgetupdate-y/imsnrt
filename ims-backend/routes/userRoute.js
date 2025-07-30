// routes/userRoute.js
const express = require('express');
const router = express.Router();

const { authCheck } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleCheckMiddleware');

const userController = require('../controllers/userController');

router.patch('/me/profile', authCheck, userController.updateMyProfile);
router.patch('/me/password', authCheck, userController.changeMyPassword);
router.get('/me/assets', authCheck, userController.getMyAssets); 

const superAdminOnly = [authCheck, roleCheck(['SUPER_ADMIN'])];

router.get('/', superAdminOnly, userController.getAllUsers);
router.post('/', superAdminOnly, userController.createUser);
router.get('/:id', superAdminOnly, userController.getUserById);
router.put('/:id', superAdminOnly, userController.updateUser);
router.patch('/:id/status', superAdminOnly, userController.updateUserStatus);
router.delete('/:id', superAdminOnly, userController.deleteUser);
router.get('/:id/assets', superAdminOnly, userController.getUserAssets);
router.get('/:id/assets/summary', superAdminOnly, userController.getUserAssetSummary);
router.get('/:id/active-assets', superAdminOnly, userController.getActiveAssetsForUser); // <-- เพิ่มบรรทัดนี้

module.exports = router;