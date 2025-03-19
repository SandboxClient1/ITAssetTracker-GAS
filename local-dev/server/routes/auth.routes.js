const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { User, sequelize } = require('../models');
const { Op } = require('sequelize');
const { generateToken, authenticate, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

// Validation middleware
const registerValidation = [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'manager', 'user']),
    body('department').optional().trim().escape(),
    validateRequest
];

const loginValidation = [
    body('login').trim().notEmpty(),
    body('password').notEmpty(),
    validateRequest
];

// Routes
// POST /api/auth/register - Register a new user (admin only)
router.post('/register',
    authenticate,
    authorize('admin'),
    registerValidation,
    async (req, res) => {
        try {
            const { username, email, password, role, department } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [{ username }, { email }]
                }
            });

            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Username or email already exists'
                });
            }

            // Create user
            const user = await User.create({
                username,
                email,
                password,
                role: role || 'user',
                department
            });

            res.status(201).json({
                status: 'success',
                message: 'User registered successfully',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    department: user.department
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error registering user',
                error: error.message
            });
        }
    }
);

// POST /api/auth/login - Login user
router.post('/login',
    loginValidation,
    async (req, res) => {
        try {
            const { login, password } = req.body;
            console.log('Login attempt for:', login);

            // Find user by username or email
            const user = await User.findByLogin(login);
            console.log('User found:', user ? 'yes' : 'no');

            if (!user || !user.is_active) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials or inactive account'
                });
            }

            // Validate password
            const isValid = await user.validatePassword(password);
            console.log('Password valid:', isValid ? 'yes' : 'no');

            if (!isValid) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Invalid credentials'
                });
            }

            // Update last login
            await user.update({ last_login: new Date() });

            // Generate token
            const token = generateToken(user);

            res.json({
                status: 'success',
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        department: user.department
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Error during login',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// GET /api/auth/me - Get current user
router.get('/me',
    authenticate,
    async (req, res) => {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password'] }
            });

            res.json({
                status: 'success',
                data: user
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching user data',
                error: error.message
            });
        }
    }
);

// PUT /api/auth/me - Update current user
router.put('/me',
    authenticate,
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('password').optional().isLength({ min: 6 }),
        body('department').optional().trim().escape(),
        validateRequest
    ],
    async (req, res) => {
        try {
            const { email, password, department } = req.body;
            const updateData = {};

            if (email) updateData.email = email;
            if (password) updateData.password = password;
            if (department) updateData.department = department;

            await req.user.update(updateData);

            res.json({
                status: 'success',
                message: 'Profile updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error updating profile',
                error: error.message
            });
        }
    }
);

// Admin routes
// GET /api/auth/users - Get all users (admin only)
router.get('/users',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const users = await User.findAll({
                attributes: { exclude: ['password'] }
            });

            res.json({
                status: 'success',
                data: users
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error fetching users',
                error: error.message
            });
        }
    }
);

// PUT /api/auth/users/:id - Update user (admin only)
router.put('/users/:id',
    authenticate,
    authorize('admin'),
    [
        body('email').optional().isEmail().normalizeEmail(),
        body('role').optional().isIn(['admin', 'manager', 'user']),
        body('is_active').optional().isBoolean(),
        body('department').optional().trim().escape(),
        validateRequest
    ],
    async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            await user.update(req.body);

            res.json({
                status: 'success',
                message: 'User updated successfully',
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    is_active: user.is_active
                }
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Error updating user',
                error: error.message
            });
        }
    }
);

module.exports = router; 