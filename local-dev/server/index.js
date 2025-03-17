const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Asset } = require('./models');
const sequelize = require('./config/database');

const app = express();
const PORT = 3000;

// Add this logging utility at the top of your server code
const LOG_LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

const isDevelopment = process.env.NODE_ENV !== 'production';

function logger(level, message, data = null) {
    if (!isDevelopment) {
        // In production, only log warnings and errors
        if (level === LOG_LEVELS.WARN || level === LOG_LEVELS.ERROR) {
            // Here you could implement production logging
            // For example, writing to a log file or sending to a logging service
        }
        return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    switch (level) {
        case LOG_LEVELS.ERROR:
            console.error(logMessage);
            if (data) console.error(data);
            break;
        case LOG_LEVELS.WARN:
            console.warn(logMessage);
            if (data) console.warn(data);
            break;
        case LOG_LEVELS.INFO:
            console.info(logMessage);
            if (data) console.info(data);
            break;
        case LOG_LEVELS.DEBUG:
            console.debug(logMessage);
            if (data) console.debug(data);
            break;
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Updated Routes
app.get('/api/assets', async (req, res) => {
    try {
        const assets = await Asset.findAll({
            order: [['registrationDate', 'DESC']]
        });
        logger(LOG_LEVELS.DEBUG, `Retrieved ${assets.length} assets`);
        res.json(assets);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Failed to fetch assets', error);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

app.post('/api/assets', async (req, res) => {
    try {
        // Generate new asset ID (you can keep your existing generation logic)
        const latestAsset = await Asset.findOne({
            order: [['assetId', 'DESC']]
        });
        
        let newAssetID;
        if (latestAsset) {
            const lastNumber = parseInt(latestAsset.assetId.replace('AST', ''));
            newAssetID = `AST${String(lastNumber + 1).padStart(3, '0')}`;
        } else {
            newAssetID = 'AST001';
        }

        const newAsset = await Asset.create({
            registrationDate: new Date(),
            assetId: newAssetID,
            assetType: req.body.assetType,
            make: req.body.make,
            model: req.body.model,
            serialNumber: req.body.serialNumber,
            operatingSystem: req.body.operatingSystem,
            processor: req.body.processor,
            ram: req.body.ram,
            storage: req.body.storage,
            location: req.body.location,
            status: req.body.status,
            assignee: req.body.assignee,
            condition: req.body.condition,
            notes: req.body.notes
        });

        logger(LOG_LEVELS.INFO, `New asset created`, { assetId: newAssetID });
        res.json({ success: true, assetID: newAssetID });
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Failed to register asset', error);
        res.status(500).json({ error: 'Failed to register asset' });
    }
});

app.get('/api/assets/:id', async (req, res) => {
    try {
        const assetId = req.params.id;
        const asset = await Asset.findOne({
            where: { assetId: assetId }
        });
        
        if (!asset) {
            logger(LOG_LEVELS.WARN, `Asset not found`, { assetId });
            return res.status(404).json({ error: 'Asset not found' });
        }
        
        logger(LOG_LEVELS.DEBUG, `Asset details retrieved`, { assetId });
        res.json(asset);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Error fetching asset details', error);
        res.status(500).json({ error: 'Failed to fetch asset details' });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { field, value } = req.query;
        
        if (!field || !value) {
            return res.status(400).json({ error: 'Search field and value are required' });
        }

        // Map frontend field names to database column names
        const fieldMapping = {
            'Asset Type': 'assetType',
            'Asset ID': 'assetId',
            'Serial Number': 'serialNumber',
            'Operating System': 'operatingSystem',
            'Location': 'location',
            'Status': 'status',
            'Assignee': 'assignee',
            'Condition': 'condition',
            'Make': 'make',
            'Model': 'model'
        };

        const dbField = fieldMapping[field] || field.toLowerCase();

        const results = await Asset.findAll({
            where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col(dbField)),
                'LIKE',
                `%${value.toLowerCase()}%`
            )
        });

        res.json(results);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Search failed', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/distinct-values', async (req, res) => {
    try {
        const { field } = req.query;

        // Map frontend field names to database column names
        const fieldMapping = {
            'Asset Type': 'assetType',
            'Asset ID': 'assetId',
            'Serial Number': 'serialNumber',
            'Operating System': 'operatingSystem',
            'Location': 'location',
            'Status': 'status',
            'Assignee': 'assignee',
            'Condition': 'condition',
            'Make': 'make',
            'Model': 'model'
        };

        const dbField = fieldMapping[field] || field.toLowerCase();

        const values = await Asset.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col(dbField)), dbField]],
            where: {
                [dbField]: {
                    [sequelize.Op.not]: null
                }
            },
            order: [[dbField, 'ASC']]
        });

        res.json(values.map(item => item[dbField]));
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Failed to get distinct values', error);
        res.status(500).json({ error: 'Failed to get values' });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const assets = await Asset.findAll();
        
        const statusCounts = {
            Available: 0,
            Assigned: 0,
            'In-Repair': 0
        };

        assets.forEach(asset => {
            if (asset.status in statusCounts) {
                statusCounts[asset.status]++;
            }
        });

        const response = {
            statusCounts,
            totalAssets: assets.length,
            Available: statusCounts.Available,
            Assigned: statusCounts.Assigned,
            'In-Repair': statusCounts['In-Repair'],
            byType: {},
            byStatus: {},
            byOS: {},
            byLocation: {}
        };

        // Calculate distributions
        assets.forEach(asset => {
            // By Type
            if (asset.assetType) {
                response.byType[asset.assetType] = (response.byType[asset.assetType] || 0) + 1;
            }
            
            // By Status
            if (asset.status) {
                response.byStatus[asset.status] = (response.byStatus[asset.status] || 0) + 1;
            }
            
            // By OS
            if (asset.operatingSystem) {
                response.byOS[asset.operatingSystem] = (response.byOS[asset.operatingSystem] || 0) + 1;
            }
            
            // By Location
            if (asset.location) {
                response.byLocation[asset.location] = (response.byLocation[asset.location] || 0) + 1;
            }
        });

        // Add recent activity
        response.recentActivity = assets
            .sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate))
            .slice(0, 5);

        res.json(response);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Failed to fetch dashboard metrics', error);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});

app.get('/api/export', async (req, res) => {
    try {
        const { field, value } = req.query;
        
        // Map frontend field names to database column names
        const fieldMapping = {
            'Asset Type': 'assetType',
            'Asset ID': 'assetId',
            'Location': 'location',
            'Status': 'status'
        };

        let whereClause = {};
        if (field && value) {
            const dbField = fieldMapping[field] || field.toLowerCase();
            whereClause[dbField] = value;
        }

        const assets = await Asset.findAll({
            where: whereClause,
            order: [['registrationDate', 'DESC']]
        });

        // Convert to CSV
        const csvRows = [];
        
        // Define headers
        const headers = [
            'Registration Date', 'Asset ID', 'Asset Type', 'Make', 'Model',
            'Serial Number', 'Operating System', 'Processor', 'RAM', 'Storage',
            'Location', 'Status', 'Assignee', 'Condition', 'Notes'
        ];
        
        csvRows.push(headers.join(','));

        // Add data rows
        assets.forEach(asset => {
            const row = [
                asset.registrationDate,
                asset.assetId,
                asset.assetType,
                asset.make,
                asset.model,
                asset.serialNumber,
                asset.operatingSystem,
                asset.processor,
                asset.ram,
                asset.storage,
                asset.location,
                asset.status,
                asset.assignee,
                asset.condition,
                asset.notes
            ].map(value => {
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            
            csvRows.push(row.join(','));
        });

        const csvData = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=asset-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvData);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Export failed', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Keep the dropdowns endpoint as is since it's static data
app.get('/api/dropdowns', (req, res) => {
    res.json({
        assetTypes: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Network Device', 'Other'],
        operatingSystems: ['Windows 11', 'Windows 10', 'Windows 8', 'Windows 7', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome OS', 'Other'],
        locations: ['Office', 'Remote', 'Storage Room', 'Workshop', 'Data Center', 'Branch Office', 'Other'],
        statuses: ['Assigned', 'In-Repair', 'In-Storage', 'Retired', 'On Order', 'Available', 'Lost', 'Other'],
        conditions: ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Not Working']
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 