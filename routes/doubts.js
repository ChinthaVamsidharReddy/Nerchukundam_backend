const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get all doubts
router.get('/', auth, async (req, res) => {
    try {
        const [doubts] = await db.execute(`
            SELECT d.*, 
                   u.username as student_name,
                   COUNT(DISTINCT du.user_id) as upvote_count
            FROM doubts d
            JOIN users u ON d.student_id = u.id
            LEFT JOIN doubt_upvotes du ON d.id = du.doubt_id
            GROUP BY d.id
            ORDER BY d.created_at DESC`
        );
        res.json(doubts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch doubts' });
    }
});

// Post a new doubt
router.post('/', auth, async (req, res) => {
    try {
        const { title, content, category } = req.body;
        const result = await db.execute(
            'INSERT INTO doubts (title, content, category, student_id) VALUES (?, ?, ?, ?)',
            [title, content, category, req.user.id]
        );
        res.status(201).json({ message: 'Doubt posted successfully', id: result[0].insertId });
    } catch (error) {
        res.status(500).json({ message: 'Failed to post doubt' });
    }
});

// Add reply to a doubt
router.post('/:id/reply', auth, async (req, res) => {
    try {
        const { content, is_answer } = req.body;
        await db.execute(
            'INSERT INTO doubt_replies (doubt_id, user_id, content, is_answer) VALUES (?, ?, ?, ?)',
            [req.params.id, req.user.id, content, is_answer || false]
        );
        
        if (is_answer) {
            await db.execute(
                'UPDATE doubts SET status = "answered" WHERE id = ?',
                [req.params.id]
            );
        }
        
        res.json({ message: 'Reply added successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add reply' });
    }
});

// Toggle upvote on a doubt
router.post('/:id/upvote', auth, async (req, res) => {
    try {
        const [existing] = await db.execute(
            'SELECT * FROM doubt_upvotes WHERE doubt_id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        
        if (existing.length > 0) {
            await db.execute(
                'DELETE FROM doubt_upvotes WHERE doubt_id = ? AND user_id = ?',
                [req.params.id, req.user.id]
            );
            res.json({ message: 'Upvote removed' });
        } else {
            await db.execute(
                'INSERT INTO doubt_upvotes (doubt_id, user_id) VALUES (?, ?)',
                [req.params.id, req.user.id]
            );
            res.json({ message: 'Doubt upvoted' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle upvote' });
    }
});

// Get replies for a doubt
router.get('/:id/replies', auth, async (req, res) => {
    try {
        const [replies] = await db.execute(`
            SELECT r.*, 
                   u.username,
                   COUNT(DISTINCT ru.user_id) as upvote_count
            FROM doubt_replies r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN reply_upvotes ru ON r.id = ru.reply_id
            WHERE r.doubt_id = ?
            GROUP BY r.id
            ORDER BY r.is_answer DESC, r.created_at ASC`,
            [req.params.id]
        );
        res.json(replies);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch replies' });
    }
});

module.exports = router;