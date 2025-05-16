const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const [users] = await db.execute('SELECT role FROM users WHERE id = ?', [req.user.userId]);
        if (users[0]?.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            'SELECT id, username, email, role, status, created_at FROM users'
        );
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Update user status
router.put('/users/:id', auth, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await db.execute(
            'UPDATE users SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

module.exports = router;