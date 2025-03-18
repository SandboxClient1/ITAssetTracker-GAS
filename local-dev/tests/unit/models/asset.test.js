const { Asset, sequelize } = require('../../../server/models');

describe('Asset Model', () => {
  beforeAll(async () => {
    // Sync database - force true will drop the table and recreate it
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    await Asset.destroy({ where: {} }); // Clean up after each test
  });

  describe('Validation', () => {
    it('should create an asset with valid fields', async () => {
      const validAsset = {
        asset_id: 'LAP001',
        asset_type: 'Laptop',
        make: 'Dell',
        model: 'XPS 13',
        serial_number: 'DELL123456',
        status: 'Available'
      };

      const asset = await Asset.create(validAsset);
      expect(asset.asset_id).toBe(validAsset.asset_id);
      expect(asset.asset_type).toBe(validAsset.asset_type);
      expect(asset.status).toBe(validAsset.status);
    });

    it('should fail when required fields are missing', async () => {
      const invalidAsset = {
        make: 'Dell',
        model: 'XPS 13'
      };

      await expect(Asset.create(invalidAsset)).rejects.toThrow();
    });

    it('should fail with invalid status', async () => {
      const invalidAsset = {
        asset_id: 'LAP002',
        asset_type: 'Laptop',
        status: 'InvalidStatus'
      };

      await expect(Asset.create(invalidAsset)).rejects.toThrow();
    });

    it('should fail with duplicate asset_id', async () => {
      const asset1 = {
        asset_id: 'LAP003',
        asset_type: 'Laptop',
        status: 'Available'
      };

      await Asset.create(asset1);
      await expect(Asset.create(asset1)).rejects.toThrow();
    });
  });

  describe('Asset ID Generation', () => {
    it('should generate correct asset ID for new asset type', async () => {
      const assetId = await Asset.generateAssetId('Laptop');
      expect(assetId).toBe('LAP001');
    });

    it('should increment asset ID correctly', async () => {
      await Asset.create({
        asset_id: 'LAP001',
        asset_type: 'Laptop',
        status: 'Available'
      });

      const assetId = await Asset.generateAssetId('Laptop');
      expect(assetId).toBe('LAP002');
    });
  });

  describe('JSON Serialization', () => {
    it('should format registration_date in ISO string', async () => {
      const asset = await Asset.create({
        asset_id: 'LAP001',
        asset_type: 'Laptop',
        status: 'Available'
      });

      const json = asset.toJSON();
      expect(json.registration_date).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
}); 