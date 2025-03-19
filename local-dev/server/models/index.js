const sequelize = require('../config/database');
const Asset = require('./Asset');
const User = require('./User');

// Define relationships
Asset.belongsTo(User, { 
    foreignKey: 'assignee',
    as: 'assigned_to'
});

Asset.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
});

Asset.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
});

User.hasMany(Asset, {
    foreignKey: 'assignee',
    as: 'assigned_assets'
});

User.hasMany(Asset, {
    foreignKey: 'created_by',
    as: 'created_assets'
});

User.hasMany(Asset, {
    foreignKey: 'updated_by',
    as: 'updated_assets'
});

const models = {
    Asset,
    User
};

// Add the sequelize instance to models
Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models);
    }
});

module.exports = {
    sequelize,
    ...models
};