const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');
const { ASSET_STATUSES } = require('../constants');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registration_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
    },
    asset_id: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    asset_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    make: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    model: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    serial_number: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: true
    },
    operating_system: {
        type: DataTypes.STRING(50),
        allowNull: true
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
        allowNull: false,
        defaultValue: ASSET_STATUSES.AVAILABLE,
        validate: {
            isIn: [Object.values(ASSET_STATUSES)]
        }
    },
    assignee: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    condition: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            isIn: [['New', 'Good', 'Fair', 'Poor']]
        }
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'assets',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['asset_id']
        },
        {
            unique: true,
            fields: ['serial_number']
        },
        {
            fields: ['status']
        }
    ]
});

Asset.prototype.toJSON = function() {
    const values = { ...this.get() };
    if (values.registration_date) {
        values.registration_date = values.registration_date.toISOString();
    }
    return values;
};

Asset.generateAssetId = async function(assetType) {
    const prefix = assetType.substring(0, 3).toUpperCase();
    const lastAsset = await this.findOne({
        where: {
            asset_id: {
                [Op.like]: `${prefix}%`
            }
        },
        order: [['asset_id', 'DESC']]
    });

    if (!lastAsset) {
        return `${prefix}001`;
    }

    const lastNumber = parseInt(lastAsset.asset_id.slice(3));
    const newNumber = (lastNumber + 1).toString().padStart(3, '0');
    return `${prefix}${newNumber}`;
};

module.exports = Asset;