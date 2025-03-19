const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const { Asset } = require('./models');
const { sequelize } = require('./models');
const { ASSET_STATUSES } = require('./constants');
const { authenticate, authorize } = require('./middleware/auth');
const { User } = require('./models');

// Import routes
const assetRoutes = require('./routes/asset.routes');
const authRoutes = require('./routes/auth.routes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'blob:', 'cdn.jsdelivr.net'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
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
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Auth routes (unprotected)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/assets', authenticate, assetRoutes);

// Protected API endpoints
app.get('/api/dashboard', authenticate, async (req, res) => {
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
            if (asset.status) {
                response.data.assetsByStatus[asset.status] = (response.data.assetsByStatus[asset.status] || 0) + 1;
                response.data.statusCounts[asset.status] = (response.data.statusCounts[asset.status] || 0) + 1;
            }
            
            if (asset.asset_type) {
                response.data.assetsByType[asset.asset_type] = (response.data.assetsByType[asset.asset_type] || 0) + 1;
            }
            
            if (asset.operating_system) {
                response.data.assetsByOS[asset.operating_system] = (response.data.assetsByOS[asset.operating_system] || 0) + 1;
            }
            
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

app.get('/api/dropdowns', authenticate, (req, res) => {
    res.json({
        assetTypes: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Network Device', 'Other'],
        operatingSystems: ['Windows 11', 'Windows 10', 'Windows 8', 'Windows 7', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome OS', 'Other'],
        locations: ['Office', 'Remote', 'Storage Room', 'Workshop', 'Data Center', 'Branch Office', 'Other'],
        statuses: Object.values(ASSET_STATUSES),
        conditions: ['New', 'Good', 'Fair', 'Poor']
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    // Log error details server-side only
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    });

    // Send sanitized error response to client
    res.status(err.status || 500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'An error occurred while processing your request'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

// Sync database and start server
sequelize.sync({ force: true }).then(async () => {
    console.log('Database synchronized - tables recreated');
    
    // Create admin user if it doesn't exist
    await User.createAdminIfNotExists();
    
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});

module.exports = app; // Export for testing 