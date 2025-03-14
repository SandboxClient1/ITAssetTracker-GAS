const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

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

// Initialize Excel workbook for assets
const ASSETS_FILE = path.join(__dirname, 'assets.xlsx');
if (!fs.existsSync(ASSETS_FILE)) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ['Registration Date', 'Asset ID', 'Asset Type', 'Make', 'Model', 'Serial Number', 
         'Operating System', 'Processor', 'RAM', 'Storage', 'Location', 'Status', 'Assignee', 
         'Condition', 'Notes']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');
    XLSX.writeFile(wb, ASSETS_FILE);
}

// Helper functions
function readAssetsSheet() {
    const workbook = XLSX.readFile(ASSETS_FILE);
    const sheet = workbook.Sheets['Assets'];
    return XLSX.utils.sheet_to_json(sheet);
}

function writeAssetsSheet(data) {
    const workbook = XLSX.readFile(ASSETS_FILE);
    const ws = XLSX.utils.json_to_sheet(data);
    workbook.Sheets['Assets'] = ws;
    XLSX.writeFile(workbook, ASSETS_FILE);
}

// Routes
app.get('/api/assets', (req, res) => {
    try {
        const assets = readAssetsSheet();
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

app.post('/api/assets', (req, res) => {
    try {
        const assets = readAssetsSheet();
        const newAssetID = generateAssetID(assets);
        const newAsset = {
            'Registration Date': new Date().toISOString(),
            'Asset ID': newAssetID,
            ...req.body
        };
        
        assets.push(newAsset);
        writeAssetsSheet(assets);
        
        res.json({ success: true, assetID: newAssetID });
    } catch (error) {
        res.status(500).json({ error: 'Failed to register asset' });
    }
});

app.get('/api/dashboard', (req, res) => {
    try {
        const assets = readAssetsSheet();
        const metrics = calculateDashboardMetrics(assets);
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});

app.get('/api/dropdowns', (req, res) => {
    res.json({
        assetTypes: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Network Device', 'Other'],
        operatingSystems: ['Windows 11', 'Windows 10', 'Windows 8', 'Windows 7', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome OS', 'Other'],
        locations: ['Office', 'Remote', 'Storage Room', 'Workshop', 'Data Center', 'Branch Office', 'Other'],
        statuses: ['Assigned', 'In-Repair', 'In-Storage', 'Retired', 'On Order', 'Available', 'Lost', 'Other'],
        conditions: ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Not Working']
    });
});

// Search endpoint
app.get('/api/search', (req, res) => {
    try {
        const { field, value } = req.query;
        
        if (!field || !value) {
            return res.status(400).json({ error: 'Search field and value are required' });
        }
        
        const assets = readAssetsSheet();
        
        const results = assets.filter(asset => {
            const assetValue = asset[field];
            if (assetValue === undefined || assetValue === null) return false;
            
            const searchValue = value.toString().toLowerCase().trim();
            const fieldValue = assetValue.toString().toLowerCase().trim();
            
            return fieldValue.includes(searchValue);
        });
        
        logger(LOG_LEVELS.DEBUG, `Search performed`, {
            field,
            value,
            resultCount: results.length
        });

        res.json(results);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Search failed', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get asset details endpoint
app.get('/api/assets/:id', (req, res) => {
    try {
        const assetId = req.params.id;
        const assets = readAssetsSheet();
        
        const asset = assets.find(a => a['Asset ID'] === assetId);
        
        if (!asset) {
            logger(LOG_LEVELS.WARN, `Asset not found`, { assetId });
            res.status(404).json({ error: 'Asset not found' });
            return;
        }
        
        logger(LOG_LEVELS.DEBUG, `Asset details retrieved`, { assetId });
        res.json(asset);
    } catch (error) {
        logger(LOG_LEVELS.ERROR, 'Error fetching asset details', error);
        res.status(500).json({ error: 'Failed to fetch asset details' });
    }
});

// Helper functions
function generateAssetID(assets) {
    if (assets.length === 0) {
        return 'AST001';
    }
    const lastAsset = assets[assets.length - 1];
    const lastID = lastAsset['Asset ID'];
    const numericPart = parseInt(lastID.substring(3));
    return `AST${String(numericPart + 1).padStart(3, '0')}`;
}

function calculateDashboardMetrics(assets) {
    const metrics = {
        totalAssets: assets.length,
        assetsByType: {},
        assetsByStatus: {},
        assetsByOS: {},
        assetsByLocation: {}
    };
    
    assets.forEach(asset => {
        // Count by type
        const type = asset['Asset Type'];
        metrics.assetsByType[type] = (metrics.assetsByType[type] || 0) + 1;
        
        // Count by status
        const status = asset['Status'];
        metrics.assetsByStatus[status] = (metrics.assetsByStatus[status] || 0) + 1;
        
        // Count by OS
        const os = asset['Operating System'];
        metrics.assetsByOS[os] = (metrics.assetsByOS[os] || 0) + 1;
        
        // Count by location
        const location = asset['Location'];
        metrics.assetsByLocation[location] = (metrics.assetsByLocation[location] || 0) + 1;
    });
    
    return metrics;
}

app.listen(PORT, () => {
    logger(LOG_LEVELS.INFO, `Server running at http://localhost:${PORT}`);
}); 