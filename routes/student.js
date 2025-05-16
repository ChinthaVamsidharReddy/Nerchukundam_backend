const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

// Get learning materials
router.get('/materials', auth, async (req, res) => {
  try {
    const materials = await req.db.query(
      'SELECT * FROM materials WHERE status = "active" ORDER BY upload_date DESC'
    );
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials' });
  }
});

// Get playlists
router.get('/playlists', auth, async (req, res) => {
  try {
    const playlists = await req.db.query(
      'SELECT * FROM playlists ORDER BY upload_date DESC'
    );
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching playlists' });
  }
});

// Submit a doubt/question
router.post('/doubts', auth, async (req, res) => {
  const { title, description, category } = req.body;
  try {
    await req.db.query(
      'INSERT INTO doubts (student_id, title, description, category) VALUES (?, ?, ?, ?)',
      [req.user.id, title, description, category]
    );
    res.json({ message: 'Question submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting question' });
  }
});

// Get available quizzes
router.get('/quizzes', auth, async (req, res) => {
  try {
    const quizzes = await req.db.query(
      'SELECT * FROM quizzes WHERE status = "active" ORDER BY created_at DESC'
    );
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quizzes' });
  }
});

// Submit quiz attempt
router.post('/quizzes/:quizId/submit', auth, async (req, res) => {
  const { answers } = req.body;
  try {
    // Save quiz attempt
    await req.db.query(
      'INSERT INTO quiz_attempts (student_id, quiz_id, answers, score) VALUES (?, ?, ?, ?)',
      [req.user.id, req.params.quizId, JSON.stringify(answers), req.body.score]
    );
    res.json({ message: 'Quiz submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting quiz' });
  }
});

// Get learning roadmaps
router.get('/roadmaps', auth, async (req, res) => {
  try {
    const roadmaps = await req.db.query(
      'SELECT * FROM roadmaps WHERE status = "active"'
    );
    res.json(roadmaps);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching roadmaps' });
  }
});

// Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const leaderboard = await req.db.query(`
      SELECT u.username, u.full_name, 
             COUNT(DISTINCT qa.id) as quizzes_completed,
             AVG(qa.score) as avg_score,
             COUNT(DISTINCT d.id) as doubts_asked
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
      LEFT JOIN doubts d ON u.id = d.student_id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY avg_score DESC, quizzes_completed DESC
      LIMIT 10
    `);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard' });
  }
});

// Get announcements
router.get('/announcements', auth, async (req, res) => {
  try {
    const announcements = await req.db.query(
      'SELECT * FROM announcements WHERE status = "active" ORDER BY created_at DESC'
    );
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

// Get forum posts
router.get('/forums', auth, async (req, res) => {
  try {
    const posts = await req.db.query(
      'SELECT * FROM forum_posts ORDER BY created_at DESC'
    );
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forum posts' });
  }
});

// Create forum post
router.post('/forums', auth, async (req, res) => {
  const { title, content, category } = req.body;
  try {
    await req.db.query(
      'INSERT INTO forum_posts (student_id, title, content, category) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, category]
    );
    res.json({ message: 'Post created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating post' });
  }
});

// Get bookmarks
router.get('/bookmarks', auth, async (req, res) => {
  try {
    const bookmarks = await req.db.query(`
      SELECT b.*, 
             m.title as material_title,
             p.title as playlist_title,
             q.title as quiz_title
      FROM bookmarks b
      LEFT JOIN materials m ON b.material_id = m.id
      LEFT JOIN playlists p ON b.playlist_id = p.id
      LEFT JOIN quizzes q ON b.quiz_id = q.id
      WHERE b.student_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(bookmarks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookmarks' });
  }
});

// Add bookmark
router.post('/bookmarks', auth, async (req, res) => {
  const { type, itemId } = req.body;
  try {
    await req.db.query(
      `INSERT INTO bookmarks (student_id, ${type}_id) VALUES (?, ?)`,
      [req.user.id, itemId]
    );
    res.json({ message: 'Bookmark added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding bookmark' });
  }
});

// Get study plan
router.get('/planner', auth, async (req, res) => {
  try {
    const tasks = await req.db.query(
      'SELECT * FROM study_tasks WHERE student_id = ? ORDER BY due_date ASC',
      [req.user.id]
    );
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching study plan' });
  }
});

// Add study task
router.post('/planner', auth, async (req, res) => {
  const { title, description, due_date } = req.body;
  try {
    await req.db.query(
      'INSERT INTO study_tasks (student_id, title, description, due_date) VALUES (?, ?, ?, ?)',
      [req.user.id, title, description, due_date]
    );
    res.json({ message: 'Task added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding task' });
  }
});

// Get suggested resources
router.get('/resources/suggested', auth, async (req, res) => {
  try {
    // Get resources based on student's activity and interests
    const resources = await req.db.query(`
      SELECT DISTINCT m.*
      FROM materials m
      JOIN downloads d ON m.id = d.material_id
      JOIN material_ratings mr ON m.id = mr.material_id
      WHERE m.category IN (
        SELECT DISTINCT category 
        FROM downloads 
        WHERE student_id = ?
      )
      AND m.id NOT IN (
        SELECT material_id 
        FROM downloads 
        WHERE student_id = ?
      )
      ORDER BY mr.rating DESC
      LIMIT 10
    `, [req.user.id, req.user.id]);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suggested resources' });
  }
});

module.exports = router; 