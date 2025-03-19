const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const assetController = require('../controllers/asset.controller');
const validateRequest = require('../middleware/validateRequest');
const { ASSET_STATUSES } = require('../constants');

// Validation middleware
const createAssetValidation = [
  body('asset_type').notEmpty().trim().escape(),
  body('make').optional().trim().escape(),
  body('model').optional().trim().escape(),
  body('serial_number').optional().trim().escape(),
  body('operating_system').optional().trim().escape(),
  body('processor').optional().trim().escape(),
  body('ram').optional().trim().escape(),
  body('storage').optional().trim().escape(),
  body('location').optional().trim().escape(),
  body('status').isIn(Object.values(ASSET_STATUSES)),
  body('assignee').optional().trim().escape(),
  body('condition').optional().isIn(['New', 'Good', 'Fair', 'Poor']),
  body('notes').optional().trim(),
  validateRequest
];

const updateAssetValidation = [
  param('id').isInt(),
  ...createAssetValidation.slice(0, -1), // Reuse create validation without the last validateRequest
  validateRequest
];

// Routes
// GET /api/assets - Get all assets with optional filtering
router.get('/', 
  query('status').optional().isIn(Object.values(ASSET_STATUSES)),
  query('asset_type').optional().trim(),
  query('location').optional().trim(),
  validateRequest,
  assetController.getAllAssets
);

// GET /api/assets/:id - Get a single asset
router.get('/:id',
  param('id').isInt(),
  validateRequest,
  assetController.getAssetById
);

// POST /api/assets - Create a new asset
router.post('/', createAssetValidation, assetController.createAsset);

// PUT /api/assets/:id - Update an asset
router.put('/:id', updateAssetValidation, assetController.updateAsset);

// DELETE /api/assets/:id - Delete an asset
router.delete('/:id',
  param('id').trim().notEmpty(),
  validateRequest,
  assetController.deleteAsset
);

// GET /api/assets/search - Search assets
router.get('/search',
  query('q').optional().trim(),
  validateRequest,
  assetController.searchAssets
);

module.exports = router; 