const { Sequelize } = require('sequelize');
require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const sequelize = new Sequelize(
  process.env.DB_NAME || 'it_assets',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'Nasirhaidary25',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'production' ? false : console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Only test connection if not in test environment
if (process.env.NODE_ENV !== 'test') {
  sequelize
    .authenticate()
    .then(() => {
      console.log('Database connection established successfully.');
    })
    .catch((err) => {
      console.error('Unable to connect to the database:', err);
    });
}

module.exports = sequelize;
