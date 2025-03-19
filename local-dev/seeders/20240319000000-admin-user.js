'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await queryInterface.bulkInsert('Users', [{
      id: '00000000-0000-0000-0000-000000000000',
      username: 'admin',
      email: 'admin@itassets.com',
      password: hashedPassword,
      role: 'admin',
      department: 'IT',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }], {});

    console.log('Admin user created successfully:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@itassets.com');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', {
      username: 'admin'
    }, {});
  }
}; 