const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registrationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'registration_date'
    },
    assetId: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'asset_id'
    },
    assetType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'asset_type'
    },
    make: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    model: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    serialNumber: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true,
        field: 'serial_number'
    },
    operatingSystem: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'operating_system'
    },
    processor: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    ram: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    storage: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    location: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    assignee: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    condition: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'assets',
    timestamps: false // Since we're matching the existing schema
});

module.exports = Asset;