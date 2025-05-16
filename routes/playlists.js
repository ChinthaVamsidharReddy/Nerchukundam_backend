const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get all playlists
router.get('/', auth, async (req, res) => {
    try {
        const [playlists] = await db.execute(
            'SELECT p.*, u.username as mentor_name FROM playlists p ' +
            'JOIN users u ON p.mentor_id = u.id ' +
            'ORDER BY p.upload_date DESC'
        );
        res.json(playlists);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ message: 'Failed to fetch playlists' });
    }
});

// Add new playlist link
router.post('/add', auth, async (req, res) => {
    try {
        const { title, description, url, category, subcategory } = req.body;
        console.log("1")
        if (!title || !url || !category) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        console.log(title,description,url,category,subcategory,req.user.id)
        await db.execute(
            'INSERT INTO playlists (title, description, url, category, subcategory, mentor_id) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, url, category, subcategory || null, req.user.id]
        );
        console.log("3")
        
        res.status(201).json({ message: 'Playlist link added successfully' });
    } catch (error) {
        console.log("4")
        console.error('Error adding playlist:', error);
        res.status(500).json({ message: 'Failed to add playlist' });
    }
});
// Delete playlist

router.delete('/:id', auth, async (req, res) => {
    try {
        const [playlist] = await db.execute(
            'SELECT mentor_id FROM playlists WHERE id = ?',
            [req.params.id]
        );
        
        if (playlist.length === 0) {
            return res.status(404).json({ message: 'Playlist not found' });
        }
        
        if (playlist[0].mentor_id !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this playlist' });
        }

        await db.execute('DELETE FROM playlists WHERE id = ?', [req.params.id]);
        res.json({ message: 'Playlist deleted successfully' });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ message: 'Failed to delete playlist' });
    }
});
    
    // Search playlists
    
    router.get('/search', auth, async (req, res) => {
    try {
    const { query, category } = req.query;
    let sql = `
    SELECT p.*, u.username as mentor_name
    FROM playlists p
    JOIN users u ON p.mentor_id = u.id
    WHERE 1=1
    `;
    const params = [];
    
    if (query) {
    sql += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
    params.push(`%${query}%`, `%${query}%`);
    }
    if (category) {
    sql += ` AND p.category = ?`;
    params.push(category);
    }
    sql += ` ORDER BY p.upload_date DESC`;
    const [playlists] = await db.execute(sql, params);
    res.json(playlists);
    } catch (error) {
    console.error('Error searching playlists:', error);
    res.status(500).json({ message: 'Failed to search playlists' });
    }
    });

module.exports = router;