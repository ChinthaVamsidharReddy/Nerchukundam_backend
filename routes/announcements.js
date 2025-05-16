const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Get all announcements (for both students and mentors)
router.get('/', auth, async (req, res) => {
    try {
        const [announcements] = await pool.query(`
            SELECT a.*, u.username as mentor_name 
            FROM announcements a 
            JOIN users u ON a.mentor_id = u.id 
            WHERE a.status = 'active' 
            ORDER BY a.created_at DESC
        `);
        res.json(announcements);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new announcement (mentor only)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'mentor') {
        return res.status(403).json({ message: 'Access denied. Only mentors can create announcements.' });
    }

    const { title, content, priority = 'medium' } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO announcements (title, content, mentor_id, priority) VALUES (?, ?, ?, ?)',
            [title, content, req.user.id, priority]
        );
        
        const [announcement] = await pool.query(
            'SELECT a.*, u.username as mentor_name FROM announcements a JOIN users u ON a.mentor_id = u.id WHERE a.id = ?',
            [result.insertId]
        );

        res.status(201).json(announcement[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete announcement (mentor only)
router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'mentor') {
        return res.status(403).json({ message: 'Access denied. Only mentors can delete announcements.' });
    }

    try {
        const [announcement] = await pool.query(
            'SELECT * FROM announcements WHERE id = ? AND mentor_id = ?',
            [req.params.id, req.user.id]
        );

        if (!announcement.length) {
            return res.status(404).json({ message: 'Announcement not found or unauthorized' });
        }

        await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
        res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;