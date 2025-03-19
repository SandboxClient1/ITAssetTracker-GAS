const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING(100),
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'manager', 'user'),
        defaultValue: 'user',
        allowNull: false
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

// Instance method to check password
User.prototype.validatePassword = async function(password) {
    try {
        const isValid = await bcrypt.compare(password, this.password);
        console.log('Password comparison result:', isValid);
        return isValid;
    } catch (error) {
        console.error('Password validation error:', error);
        throw error;
    }
};

// Class method to find user by username or email
User.findByLogin = async function(login) {
    return User.findOne({
        where: {
            [Op.or]: [
                { username: login },
                { email: login }
            ]
        }
    });
};

// Create admin user if it doesn't exist
User.createAdminIfNotExists = async function() {
    try {
        const admin = await User.findOne({
            where: { username: 'admin' }
        });

        if (!admin) {
            await User.create({
                username: 'admin',
                email: 'admin@itassets.com',
                password: 'admin123',
                role: 'admin',
                department: 'IT',
                is_active: true
            });
            console.log('Admin user created successfully');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

module.exports = User; 