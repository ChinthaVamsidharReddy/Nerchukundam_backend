const pool = require('../config/database');

module.exports = async (req, res, next) => {
    try {
        // Check if user exists in request (set by auth middleware)
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Query to check if user is a mentor
        const [rows] = await pool.query(
            'SELECT role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (rows.length === 0 || rows[0].role !== 'mentor') {
            return res.status(403).json({ message: 'Access denied. Mentor privileges required.' });
        }

        next();
    } catch (error) {
        console.error('Error in isMentor middleware:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 