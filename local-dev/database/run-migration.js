const fs = require('fs');
const path = require('path');
const { sequelize } = require('../server/models');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migrations', '20240318_add_timestamps.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Run the migration
        await sequelize.query(migrationSQL);
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

runMigration(); 