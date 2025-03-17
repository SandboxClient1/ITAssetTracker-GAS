const sequelize = require('./server/config/database');

async function testDB() {
    try {
        await sequelize.authenticate();
        console.log('Connection successful!');
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await sequelize.close();
    }
}

testDB();
