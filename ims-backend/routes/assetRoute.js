// ims-backend/routes/assetRoute.js

const express = require('express');
const router = express.Router();
const { authCheck } = require('../middlewares/authMiddleware.js');
const { roleCheck } = require('../middlewares/roleCheckMiddleware.js');
const assetController = require('../controllers/assetController.js');

const adminAccess = ['ADMIN', 'SUPER_ADMIN'];

// Routes for assets
router.get('/', authCheck, assetController.getAllAssets);
router.get('/:id', authCheck, assetController.getAssetById);
router.post('/batch', authCheck, roleCheck(adminAccess), assetController.addBatchAssets);

router.post('/', authCheck, roleCheck(adminAccess), assetController.createAsset);
router.put('/:id', authCheck, roleCheck(adminAccess), assetController.updateAsset);
router.delete('/:id', authCheck, roleCheck(adminAccess), assetController.deleteAsset);

router.patch('/:id/decommission', authCheck, roleCheck(adminAccess), assetController.decommissionAsset);
router.patch('/:id/reinstate', authCheck, roleCheck(adminAccess), assetController.reinstateAsset);

// --- START: ADDED NEW ROUTES ---
router.patch('/:id/defect', authCheck, roleCheck(adminAccess), assetController.markAsDefective);
router.patch('/:id/in-warehouse', authCheck, roleCheck(adminAccess), assetController.markAsInWarehouse);
// --- END: ADDED NEW ROUTES ---

module.exports = router;