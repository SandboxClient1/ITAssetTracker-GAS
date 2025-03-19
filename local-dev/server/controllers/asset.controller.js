const { Op } = require('sequelize');
const { Asset } = require('../models');

// Get all assets with optional filtering
exports.getAllAssets = async (req, res) => {
  try {
    const { status, asset_type, location } = req.query;
    const where = {};

    if (status) where.status = status;
    if (asset_type) where.asset_type = asset_type;
    if (location) where.location = location;

    const assets = await Asset.findAll({
      where,
      order: [['registration_date', 'DESC']]
    });

    res.json({
      status: 'success',
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving assets',
      error: error.message
    });
  }
};

// Get a single asset by ID
exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset not found'
      });
    }

    res.json({
      status: 'success',
      data: asset
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error retrieving asset',
      error: error.message
    });
  }
};

// Create a new asset
exports.createAsset = async (req, res) => {
  try {
    // Generate asset_id based on asset_type
    const asset_id = await Asset.generateAssetId(req.body.asset_type);
    
    // Create the asset with the generated asset_id
    const asset = await Asset.create({
      registration_date: new Date(),
      asset_id,
      asset_type: req.body.asset_type,
      make: req.body.make,
      model: req.body.model,
      serial_number: req.body.serial_number,
      operating_system: req.body.operating_system,
      processor: req.body.processor,
      ram: req.body.ram,
      storage: req.body.storage,
      location: req.body.location,
      status: req.body.status,
      assignee: req.body.assignee,
      condition: req.body.condition,
      notes: req.body.notes
    });

    res.status(201).json({
      status: 'success',
      message: 'Asset created successfully',
      data: asset,
      assetID: asset.asset_id
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating asset',
      error: error.message
    });
  }
};

// Update an asset
exports.updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset not found'
      });
    }

    // Prevent updating asset_id
    delete req.body.asset_id;
    
    await asset.update(req.body);

    res.json({
      status: 'success',
      message: 'Asset updated successfully',
      data: asset
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error updating asset',
      error: error.message
    });
  }
};

// Delete an asset
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      where: { asset_id: req.params.id }
    });
    
    if (!asset) {
      return res.status(404).json({
        status: 'error',
        message: 'Asset not found'
      });
    }

    await asset.destroy();

    res.json({
      status: 'success',
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error deleting asset',
      error: error.message
    });
  }
};

// Search assets
exports.searchAssets = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q ? {
      [Op.or]: [
        { asset_id: { [Op.iLike]: `%${q}%` } },
        { asset_type: { [Op.iLike]: `%${q}%` } },
        { make: { [Op.iLike]: `%${q}%` } },
        { model: { [Op.iLike]: `%${q}%` } },
        { serial_number: { [Op.iLike]: `%${q}%` } },
        { location: { [Op.iLike]: `%${q}%` } },
        { assignee: { [Op.iLike]: `%${q}%` } }
      ]
    } : {};

    const assets = await Asset.findAll({
      where,
      order: [['registration_date', 'DESC']]
    });

    res.json({
      status: 'success',
      data: assets
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error searching assets',
      error: error.message
    });
  }
}; 