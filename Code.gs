// Global variables
const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ASSETS_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assets');

// Serve the web app
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('IT Asset Tracker')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Include HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Get all assets from the sheet
function getAllAssets() {
  const data = ASSETS_SHEET.getDataRange().getValues();
  
  // Check if there's only a header row
  if (data.length <= 1) {
    return [];
  }
  
  const headers = data[0];
  const rows = data.slice(1); // Skip header row
  
  return rows.map(row => {
    let asset = {};
    headers.forEach((header, index) => {
      asset[header] = row[index];
    });
    return asset;
  });
}

// Generate a new Asset ID
function generateAssetID() {
  const lastRow = ASSETS_SHEET.getLastRow();
  if (lastRow === 1) {
    // If only header row exists, start with AST001
    return "AST001";
  } else {
    // Get the last asset ID
    const lastAssetID = ASSETS_SHEET.getRange(lastRow, 1).getValue();
    // Extract the numeric part
    const numericPart = parseInt(lastAssetID.substring(3));
    // Generate new ID with padding
    return "AST" + String(numericPart + 1).padStart(3, '0');
  }
}

// Register a new asset - updated for new column structure
function registerAsset(assetData) {
  const newAssetID = generateAssetID();
  const currentDate = new Date();
  
  const rowData = [
    currentDate,           // Registration Date moved to beginning
    newAssetID,            // Asset ID
    assetData.assetType,   // Asset Type
    assetData.make,        // Make
    assetData.model,       // Model
    assetData.serialNumber, // Serial Number
    assetData.operatingSystem, // Operating System
    assetData.processor || '', // New: Processor
    assetData.ram || '',    // New: RAM
    assetData.storage || '', // New: Storage
    assetData.location,    // Location
    assetData.status,      // Status
    assetData.assignee,    // Assignee
    assetData.condition || '', // New: Condition
    assetData.notes || ''  // Notes
  ];
  
  ASSETS_SHEET.appendRow(rowData);
  return newAssetID;
}

// Get dashboard metrics
function getDashboardMetrics() {
  const assets = getAllAssets();
  
  // Total number of assets
  const totalAssets = assets.length;
  
  // Assets by type
  const assetsByType = {};
  assets.forEach(asset => {
    const type = asset['Asset Type'];
    if (type) {
      assetsByType[type] = (assetsByType[type] || 0) + 1;
    }
  });
  
  // Assets by status
  const assetsByStatus = {};
  assets.forEach(asset => {
    const status = asset['Status'];
    if (status) {
      assetsByStatus[status] = (assetsByStatus[status] || 0) + 1;
    }
  });
  
  // Assets by OS
  const assetsByOS = {};
  assets.forEach(asset => {
    const os = asset['Operating System'];
    if (os) {
      assetsByOS[os] = (assetsByOS[os] || 0) + 1;
    }
  });
  
  // Assets by location
  const assetsByLocation = {};
  assets.forEach(asset => {
    const location = asset['Location'];
    if (location) {
      assetsByLocation[location] = (assetsByLocation[location] || 0) + 1;
    }
  });
  
  return {
    totalAssets,
    assetsByType,
    assetsByStatus,
    assetsByOS,
    assetsByLocation
  };
}

// Get dropdown options - updated to include condition options
function getDropdownOptions() {
  return {
    assetTypes: ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Printer', 'Server', 'Network Device', 'Other'],
    operatingSystems: ['Windows 11', 'Windows 10', 'Windows 8', 'Windows 7', 'macOS', 'Linux', 'iOS', 'Android', 'Chrome OS', 'Other'],
    locations: ['Office', 'Remote', 'Storage Room', 'Workshop', 'Data Center', 'Branch Office', 'Other'],
    statuses: ['Assigned', 'In-Repair', 'In-Storage', 'Retired', 'On Order', 'Available', 'Lost', 'Other'],
    conditions: ['New', 'Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Not Working']
  };
}