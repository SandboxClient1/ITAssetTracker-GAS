const XLSX = require('xlsx');
const path = require('path');
const Asset = require('../models/Asset');
const sequelize = require('../config/database');

async function migrateData() {
    console.log('Starting data migration...');
    
    try {
        // 1. Read Excel file
        const excelPath = path.join(__dirname, '../assets.xlsx');
        console.log('Reading Excel file from:', excelPath);
        
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets['Assets'];
        const excelData = XLSX.utils.sheet_to_json(sheet);
        
        console.log(`Found ${excelData.length} records in Excel file`);

        // 2. Sync database (this will create the table if it doesn't exist)
        await sequelize.sync();
        console.log('Database synchronized');

        // 3. Prepare data for insertion
        const assetsToInsert = excelData.map(item => ({
            registrationDate: new Date(item['Registration Date']),
            assetId: item['Asset ID'],
            assetType: item['Asset Type'],
            make: item['Make'],
            model: item['Model'],
            serialNumber: item['Serial Number'],
            operatingSystem: item['Operating System'],
            processor: item['Processor'],
            ram: item['RAM'],
            storage: item['Storage'],
            location: item['Location'],
            status: item['Status'],
            assignee: item['Assignee'],
            condition: item['Condition'],
            notes: item['Notes']
        }));

        // 4. Insert data in batches of 100
        const BATCH_SIZE = 100;
        console.log('Starting batch insert...');
        
        for (let i = 0; i < assetsToInsert.length; i += BATCH_SIZE) {
            const batch = assetsToInsert.slice(i, i + BATCH_SIZE);
            await Asset.bulkCreate(batch, {
                validate: true,
                logging: false
            });
            console.log(`Processed ${Math.min(i + BATCH_SIZE, assetsToInsert.length)} of ${assetsToInsert.length} records`);
        }

        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run migration
migrateData()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });