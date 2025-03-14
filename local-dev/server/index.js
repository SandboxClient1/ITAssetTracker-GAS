const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
    console.log(`Server running at http://localhost:${PORT}`);
}); 