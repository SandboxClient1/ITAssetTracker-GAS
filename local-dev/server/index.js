const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const { Asset } = require('./models');
const { sequelize } = require('./models');
const { ASSET_STATUSES } = require('./constants');

// Import routes
const assetRoutes = require('./routes/asset.routes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            scriptSrcAttr: ["'unsafe-inline'"]
        },
    }
}));

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Updated Routes
app.get('/api/assets', async (req, res) => {
    try {
        const assets = await Asset.findAll({
            order: [['registrationDate', 'DESC']]
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

app.get('/api/assets/:id', async (req, res) => {
    try {
        const assetId = req.params.id;
        const asset = await Asset.findOne({
            where: { asset_id: assetId }
        });
        
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
        console.error('Error fetching asset details:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch asset details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { field, value } = req.query;
        let whereClause = {};

        // Map frontend field names to database column names
        const fieldMapping = {
            'Asset ID': 'asset_id',
            'Serial Number': 'serial_number',
            'Location': 'location',
            'Status': 'status',
            'Assignee': 'assignee',
            'Condition': 'condition'
        };

        if (field && value) {
            const dbField = fieldMapping[field] || field.toLowerCase();
            whereClause[dbField] = value;
        }

        const assets = await Asset.findAll({
            where: whereClause,
            order: [['registration_date', 'DESC']]
        });

        res.json({
            status: 'success',
            data: assets
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error searching assets',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/distinct-values', async (req, res) => {
    try {
        const { field } = req.query;
        
        if (!field) {
            return res.status(400).json({
                status: 'error',
                message: 'Field parameter is required'
            });
        }

        // Map frontend field names to database column names
        const fieldMapping = {
            'Status': 'status',
            'Location': 'location',
            'Asset Type': 'asset_type'
        };

        const dbField = fieldMapping[field] || field;

        const distinctValues = await sequelize.query(
            `SELECT DISTINCT ${dbField} as value FROM assets WHERE ${dbField} IS NOT NULL AND ${dbField} != '' ORDER BY ${dbField} ASC`,
            {
                type: sequelize.QueryTypes.SELECT
            }
        );

        const values = distinctValues
            .map(item => item.value)
            .filter(value => value !== null && value !== undefined && value !== '');

        res.json(values);
    } catch (error) {
        console.error('Distinct values error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch distinct values',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const assets = await Asset.findAll();
        
        const response = {
            data: {
                totalAssets: assets.length,
                statusCounts: {
                    [ASSET_STATUSES.AVAILABLE]: 0,
                    [ASSET_STATUSES.ASSIGNED]: 0,
                    [ASSET_STATUSES.IN_REPAIR]: 0,
                    [ASSET_STATUSES.RETIRED]: 0
                },
                assetsByType: {},
                assetsByStatus: {},
                assetsByOS: {},
                assetsByLocation: {},
                recentActivity: []
            }
        };

        // Calculate distributions
        assets.forEach(asset => {
            // By Status - both for chart and counts
            if (asset.status) {
                // For the status chart
                response.data.assetsByStatus[asset.status] = (response.data.assetsByStatus[asset.status] || 0) + 1;
                
                // For the status counts (summary boxes)
                response.data.statusCounts[asset.status] = (response.data.statusCounts[asset.status] || 0) + 1;
            }
            
            // By Type
            if (asset.asset_type) {
                response.data.assetsByType[asset.asset_type] = (response.data.assetsByType[asset.asset_type] || 0) + 1;
            }
            
            // By OS
            if (asset.operating_system) {
                response.data.assetsByOS[asset.operating_system] = (response.data.assetsByOS[asset.operating_system] || 0) + 1;
            }
            
            // By Location
            if (asset.location) {
                response.data.assetsByLocation[asset.location] = (response.data.assetsByLocation[asset.location] || 0) + 1;
            }
        });

        // Add recent activity
        response.data.recentActivity = assets
            .sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date))
            .slice(0, 5)
            .map(asset => ({
                id: asset.id,
                assetId: asset.asset_id,
                assetType: asset.asset_type,
                status: asset.status,
                registrationDate: asset.registration_date
            }));

        res.json(response);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch dashboard metrics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/export', async (req, res) => {
    try {
        const { field, value } = req.query;
        
        // Map frontend field names to database column names
        const fieldMapping = {
            'Asset Type': 'asset_type',
            'Asset ID': 'asset_id',
            'Serial Number': 'serial_number',
            'Operating System': 'operating_system',
            'Location': 'location',
            'Status': 'status',
            'Assignee': 'assignee',
            'Condition': 'condition',
            'Make': 'make',
            'Model': 'model'
        };

        let whereClause = {};
        if (field && value) {
            const dbField = fieldMapping[field] || field.toLowerCase();
            whereClause[dbField] = value;
        }

        const assets = await Asset.findAll({
            where: whereClause,
            order: [['registration_date', 'DESC']]
        });

        // Convert to CSV
        const csvRows = [];
        
        // Define headers
        const headers = [
            'Registration Date',
            'Asset ID',
            'Asset Type',
            'Make',
            'Model',
            'Serial Number',
            'Operating System',
            'Processor',
            'RAM',
            'Storage',
            'Location',
            'Status',
            'Assignee',
            'Condition',
            'Notes'
        ];
        
        csvRows.push(headers.join(','));

        // Add data rows
        assets.forEach(asset => {
            const row = [
                asset.registration_date ? new Date(asset.registration_date).toISOString().split('T')[0] : '',
                asset.asset_id || '',
                asset.asset_type || '',
                asset.make || '',
                asset.model || '',
                asset.serial_number || '',
                asset.operating_system || '',
                asset.processor || '',
                asset.ram || '',
                asset.storage || '',
                asset.location || '',
                asset.status || '',
                asset.assignee || '',
                asset.condition || '',
                (asset.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')
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
        console.error('Export error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Export failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Dropdowns endpoint for form options
app.get('/api/dropdowns', (req, res) => {
    res.json({
        assetTypes: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Network Device', 'Other'],
        operatingSystems: ['Windows 11', 'Windows 10', 'Windows 8', 'Windows 7', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome OS', 'Other'],
        locations: ['Office', 'Remote', 'Storage Room', 'Workshop', 'Data Center', 'Branch Office', 'Other'],
        statuses: Object.values(ASSET_STATUSES),
        conditions: ['New', 'Good', 'Fair', 'Poor']
    });
});

// Routes
app.use('/api/assets', assetRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

const PORT = process.env.PORT || 3000;

// Sync database and start server
sequelize.sync()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to sync database:', err);
    });

module.exports = app; // Export for testing 