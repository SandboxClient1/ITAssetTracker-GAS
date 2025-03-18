const sequelize = require('../config/database');
const Asset = require('./Asset');

// Define any relationships here
// For example, if we add User model in future:
// Asset.belongsTo(User, { foreignKey: 'assignee', as: 'assignedUser' });

const models = {
  Asset
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