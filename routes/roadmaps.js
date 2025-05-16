const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Get all categories
router.get('/categories', auth, async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM categories');
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all available roadmaps with mentor information
router.get('/all', auth, async (req, res) => {
    try {
        const [roadmaps] = await pool.query(
            `SELECT r.*, 
                u.full_name as mentor_name,
                COUNT(DISTINCT rs.id) as total_steps,
                COUNT(DISTINCT CASE WHEN sp.status = 'COMPLETED' AND sp.student_id = ? THEN sp.id END) as completed_steps,
                COUNT(DISTINCT CASE WHEN sp.status = 'IN_PROGRESS' AND sp.student_id = ? THEN sp.id END) as in_progress_steps
            FROM roadmaps r
            JOIN users u ON r.created_by = u.id
            LEFT JOIN roadmap_steps rs ON r.id = rs.roadmap_id
            LEFT JOIN student_progress sp ON rs.id = sp.step_id AND sp.student_id = ?
            GROUP BY r.id, r.title, r.description, r.category, r.subcategory, r.difficulty_level, r.estimated_hours, r.created_by, r.created_at, r.updated_at, u.full_name
            ORDER BY r.created_at DESC`,
            [req.user.id, req.user.id, req.user.id]
        );
        res.json(roadmaps);
    } catch (error) {
        console.error('Error fetching all roadmaps:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get roadmaps by category
router.get('/category/:categoryId', auth, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const [roadmaps] = await pool.query(
            'SELECT * FROM roadmaps WHERE category_id = ?',
            [categoryId]
        );
        res.json(roadmaps);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get roadmap details with steps and resources
router.get('/:roadmapId', auth, async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const connection = await pool.getConnection();

        try {
            // Get roadmap details with mentor info
            const [roadmap] = await connection.query(
                `SELECT r.*, u.full_name as mentor_name 
                 FROM roadmaps r
                 JOIN users u ON r.created_by = u.id 
                 WHERE r.id = ?`,
                [roadmapId]
            );

            if (roadmap.length === 0) {
                connection.release();
                return res.status(404).json({ message: 'Roadmap not found' });
            }

            // Get steps with resources
            const [steps] = await connection.query(
                `SELECT rs.*, 
                    GROUP_CONCAT(
                        JSON_OBJECT(
                            'id', sr.id,
                            'title', sr.title,
                            'type', sr.type,
                            'url', sr.url,
                            'description', sr.description
                        )
                    ) as resources
                FROM roadmap_steps rs
                LEFT JOIN step_resources sr ON rs.id = sr.step_id
                WHERE rs.roadmap_id = ?
                GROUP BY rs.id, rs.title, rs.description, rs.order_index
                ORDER BY rs.order_index`,
                [roadmapId]
            );

            // Get student progress
            const [progress] = await connection.query(
                `SELECT * FROM student_progress 
                 WHERE student_id = ? AND step_id IN 
                 (SELECT id FROM roadmap_steps WHERE roadmap_id = ?)`,
                [req.user.id, roadmapId]
            );

            // Map progress to steps and parse resources
            const stepsWithProgress = steps.map(step => ({
                ...step,
                resources: step.resources ? JSON.parse(`[${step.resources}]`) : [],
                progress: progress.find(p => p.step_id === step.id)?.status || 'NOT_STARTED',
                is_locked: false // Will be updated below
            }));

            // Add lock status based on previous step completion
            for (let i = 1; i < stepsWithProgress.length; i++) {
                const previousStep = stepsWithProgress[i - 1];
                stepsWithProgress[i].is_locked = previousStep.progress !== 'COMPLETED';
            }

            connection.release();
            res.json({
                ...roadmap[0],
                steps: stepsWithProgress
            });
        } catch (error) {
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error fetching roadmap details:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update step progress
router.post('/progress/:stepId', auth, async (req, res) => {
    try {
        const { stepId } = req.params;
        const { status } = req.body;

        if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Update or insert progress
            await connection.query(
                `INSERT INTO student_progress (student_id, step_id, status, completed_at)
                 VALUES (?, ?, ?, ${status === 'COMPLETED' ? 'NOW()' : 'NULL'})
                 ON DUPLICATE KEY UPDATE 
                 status = ?,
                 completed_at = ${status === 'COMPLETED' ? 'NOW()' : 'NULL'}`,
                [req.user.id, stepId, status, status]
            );

            await connection.commit();
            connection.release();

            res.json({ message: 'Progress updated successfully' });
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get student dashboard overview
router.get('/dashboard/overview', auth, async (req, res) => {
    try {
        const [overview] = await pool.query(
            `SELECT 
                c.id as category_id,
                c.name as category_name,
                r.id as roadmap_id,
                r.title as roadmap_title,
                COUNT(DISTINCT rs.id) as total_steps,
                COUNT(DISTINCT CASE WHEN sp.status = 'COMPLETED' THEN rs.id END) as completed_steps,
                COUNT(DISTINCT CASE WHEN sp.status = 'IN_PROGRESS' THEN rs.id END) as in_progress_steps
             FROM categories c
             JOIN roadmaps r ON c.id = r.category_id
             JOIN roadmap_steps rs ON r.id = rs.roadmap_id
             LEFT JOIN student_progress sp ON rs.id = sp.step_id AND sp.student_id = ?
             GROUP BY c.id, r.id
             ORDER BY c.name, r.title`,
            [req.user.id]
        );

        res.json(overview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 