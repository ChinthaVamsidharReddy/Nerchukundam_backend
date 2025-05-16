const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/db');

// Diagnostic route to check database connectivity
router.get('/diagnostic', auth, async (req, res) => {
  try {
    const tables = ['users', 'materials', 'downloads', 'doubts', 'material_ratings'];
    const results = {};
    
    // Check if user exists and is a mentor
    const [userCheck] = await db.query(
      'SELECT id, role FROM users WHERE id = ?',
      [req.user.id]
    );
    results.user = {
      exists: userCheck.length > 0,
      isMentor: userCheck[0]?.role === 'mentor'
    };

    // Check each table
    for (const table of tables) {
      try {
        const [count] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = {
          exists: true,
          rowCount: count[0].count
        };
      } catch (error) {
        results[table] = {
          exists: false,
          error: error.message
        };
      }
    }

    res.json({
      success: true,
      database: {
        connected: true,
        tables: results
      }
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      database: {
        connected: false
      }
    });
  }
});

// GET /api/mentor/dashboard - Get mentor dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    // First, verify the user is a mentor
    if (!req.user || req.user.role !== 'mentor') {
      return res.status(403).json({ message: 'Access denied. Mentor privileges required.' });
    }

    // Initialize default response
    let dashboardData = {
      stats: {
        totalUploads: 0,
        totalDownloads: 0,
        activeStudents: 0,
        pendingQuestions: 0
      },
      materials: []
    };

    try {
      // Get total uploads with simplified query
      const [uploadStats] = await db.query(
        'SELECT COUNT(*) as totalUploads FROM materials WHERE mentor_id = ?',
        [req.user.id]
      );
      dashboardData.stats.totalUploads = uploadStats[0]?.totalUploads || 0;
    } catch (error) {
      console.error('Error fetching upload stats:', error);
    }

    try {
      // Get total downloads with simplified query
      const [downloadStats] = await db.query(`
        SELECT COUNT(*) as totalDownloads 
        FROM downloads d 
        INNER JOIN materials m ON d.material_id = m.id 
        WHERE m.mentor_id = ?`,
        [req.user.id]
      );
      dashboardData.stats.totalDownloads = downloadStats[0]?.totalDownloads || 0;
    } catch (error) {
      console.error('Error fetching download stats:', error);
    }

    try {
      // Get active students with simplified query
      const [activeStudents] = await db.query(`
        SELECT COUNT(DISTINCT d.student_id) as activeCount
        FROM downloads d
        INNER JOIN materials m ON d.material_id = m.id
        WHERE m.mentor_id = ? 
        AND d.download_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [req.user.id]
      );
      dashboardData.stats.activeStudents = activeStudents[0]?.activeCount || 0;
    } catch (error) {
      console.error('Error fetching active students:', error);
    }

    try {
      // Get pending questions with simplified query
      const [pendingQuestions] = await db.query(`
        SELECT COUNT(*) as pendingCount
        FROM doubts d
        INNER JOIN materials m ON d.category = m.category
        WHERE m.mentor_id = ? AND d.status = 'pending'`,
        [req.user.id]
      );
      dashboardData.stats.pendingQuestions = pendingQuestions[0]?.pendingCount || 0;
    } catch (error) {
      console.error('Error fetching pending questions:', error);
    }

    try {
      // Get recent materials with simplified query
      const [materials] = await db.query(`
        SELECT 
          m.id,
          m.title,
          m.description,
          m.category,
          m.file_path,
          m.view_count,
          COALESCE(COUNT(DISTINCT d.id), 0) as download_count,
          COALESCE(AVG(mr.rating), 0) as rating
        FROM materials m
        LEFT JOIN downloads d ON m.id = d.material_id
        LEFT JOIN material_ratings mr ON m.id = mr.material_id
        WHERE m.mentor_id = ?
        GROUP BY m.id, m.title, m.description, m.category, m.file_path, m.view_count
        ORDER BY m.upload_date DESC
        LIMIT 10`,
        [req.user.id]
      );
      dashboardData.materials = materials || [];
    } catch (error) {
      console.error('Error fetching materials:', error);
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Error in dashboard route:', error);
    res.status(500).json({ 
      message: 'Error fetching dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get mentor's quizzes
router.get('/quizzes', auth, async (req, res) => {
    try {
        const [quizzes] = await db.query(
            'SELECT * FROM quizzes WHERE created_by = ?',
            [req.user.id]
        );
        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Failed to fetch quizzes' });
    }
});
module.exports = router;