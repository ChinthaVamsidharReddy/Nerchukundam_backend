const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const auth = require('../../middleware/auth');
const isMentor = require('../../middleware/isMentor');
// const isAdmin = require('../../middleware/isAdmin');

// Get all roadmaps created by mentor
router.get('/my-roadmaps', [auth, isMentor], async (req, res) => {
    try {
        const [roadmaps] = await pool.query(
            `SELECT r.*, 
             COUNT(DISTINCT rs.id) as total_steps,
             COUNT(DISTINCT sp.id) as total_students,
             CASE 
                WHEN EXISTS (
                    SELECT 1 FROM student_progress sp 
                    JOIN roadmap_steps rs ON sp.step_id = rs.id 
                    WHERE rs.roadmap_id = r.id
                ) THEN true 
                ELSE false 
             END as has_student_progress
             FROM roadmaps r
             LEFT JOIN roadmap_steps rs ON r.id = rs.roadmap_id
             LEFT JOIN student_progress sp ON rs.id = sp.step_id
             WHERE r.created_by = ?
             GROUP BY r.id`,
            [req.user.id]
        );
        res.json(roadmaps);
    } catch (error) {
        console.error('Error fetching roadmaps:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new roadmap
router.post('/', [auth, isMentor], async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { 
            title, 
            description, 
            category,
            subcategory,
            difficulty_level, 
            estimated_hours, 
            steps 
        } = req.body;

        if (!title || !description || !category || !subcategory || !difficulty_level || !steps || steps.length === 0) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        await connection.beginTransaction();

        // Create roadmap
        const [roadmapResult] = await connection.query(
            `INSERT INTO roadmaps (
                title, 
                description, 
                category,
                subcategory,
                difficulty_level, 
                estimated_hours, 
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title,
                description,
                category,
                subcategory,
                difficulty_level,
                estimated_hours,
                req.user.id
            ]
        );

        const roadmapId = roadmapResult.insertId;

        // Create steps
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const [stepResult] = await connection.query(
                `INSERT INTO roadmap_steps (
                    roadmap_id, 
                    title, 
                    description, 
                    order_index
                ) VALUES (?, ?, ?, ?)`,
                [roadmapId, step.title, step.description, i + 1]
            );

            // Create resources for step
            if (step.resources && step.resources.length > 0) {
                const resourceValues = step.resources.map(resource => [
                    stepResult.insertId,
                    resource.title,
                    resource.type,
                    resource.url,
                    resource.description
                ]);

                await connection.query(
                    `INSERT INTO step_resources (
                        step_id, 
                        title, 
                        type, 
                        url, 
                        description
                    ) VALUES ?`,
                    [resourceValues]
                );
            }
        }

        await connection.commit();
        res.status(201).json({
            message: 'Roadmap created successfully',
            roadmapId: roadmapId
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating roadmap:', error);
        res.status(500).json({ message: 'Failed to create roadmap' });
    } finally {
        connection.release();
    }
});

// Check if roadmap can be edited
const canEditRoadmap = async (roadmapId, connection) => {
    const [progress] = await connection.query(
        `SELECT 1 FROM student_progress sp 
         JOIN roadmap_steps rs ON sp.step_id = rs.id 
         WHERE rs.roadmap_id = ? 
         LIMIT 1`,
        [roadmapId]
    );
    return progress.length === 0;
};

// Update roadmap (Admin only if has student progress)
router.put('/:roadmapId', [auth], async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Check roadmap existence and ownership
            const [roadmap] = await connection.query(
                'SELECT * FROM roadmaps WHERE id = ?',
                [roadmapId]
            );
            
            if (roadmap.length === 0) {
                return res.status(404).json({ message: 'Roadmap not found' });
            }

            // Check if roadmap has student progress
            const isEditable = await canEditRoadmap(roadmapId, connection);
            
            // Only allow edit if:
            // 1. User is admin, OR
            // 2. User is the creator AND no student has started the roadmap
            if (!isEditable && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    message: 'Cannot edit roadmap after students have started learning. Contact an admin for changes.' 
                });
            }

            if (!isEditable && req.user.role !== 'admin' && roadmap[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to update this roadmap' });
            }
            
            const { title, category, subcategory, description, difficulty_level, estimated_hours, steps } = req.body;
            
            // Update roadmap
            await connection.query(
                `UPDATE roadmaps SET 
                 title = ?, 
                 category = ?,
                 subcategory = ?,
                 description = ?,
                 difficulty_level = ?, 
                 estimated_hours = ? 
                 WHERE id = ?`,
                [title, category, subcategory, description, difficulty_level, estimated_hours, roadmapId]
            );
            
            // Only update steps and resources if no student progress or if admin
            if (isEditable || req.user.role === 'admin') {
                // Delete existing steps and resources
                await connection.query(
                    'DELETE FROM step_resources WHERE step_id IN (SELECT id FROM roadmap_steps WHERE roadmap_id = ?)', 
                    [roadmapId]
                );
                await connection.query('DELETE FROM roadmap_steps WHERE roadmap_id = ?', [roadmapId]);
                
                // Create new steps
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const [stepResult] = await connection.query(
                        `INSERT INTO roadmap_steps (roadmap_id, title, description, order_index)
                         VALUES (?, ?, ?, ?)`,
                        [roadmapId, step.title, step.description, i + 1]
                    );
                    
                    // Create resources for step
                    if (step.resources && step.resources.length > 0) {
                        const resourceValues = step.resources.map(resource => [
                            stepResult.insertId,
                            resource.title,
                            resource.type,
                            resource.url,
                            resource.description
                        ]);
                        
                        await connection.query(
                            `INSERT INTO step_resources (step_id, title, type, url, description)
                             VALUES ?`,
                            [resourceValues]
                        );
                    }
                }
            }
            
            await connection.commit();
            res.json({ message: 'Roadmap updated successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating roadmap:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete roadmap (Admin only if has student progress)
router.delete('/:roadmapId', [auth], async (req, res) => {
    try {
        const { roadmapId } = req.params;
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Check roadmap existence and ownership
            const [roadmap] = await connection.query(
                'SELECT * FROM roadmaps WHERE id = ?',
                [roadmapId]
            );
            
            if (roadmap.length === 0) {
                return res.status(404).json({ message: 'Roadmap not found' });
            }

            // Check if roadmap has student progress
            const isEditable = await canEditRoadmap(roadmapId, connection);
            
            // Only allow delete if:
            // 1. User is admin, OR
            // 2. User is the creator AND no student has started the roadmap
            if (!isEditable && req.user.role !== 'admin') {
                return res.status(403).json({ 
                    message: 'Cannot delete roadmap after students have started learning. Contact an admin for changes.' 
                });
            }

            if (!isEditable && req.user.role !== 'admin' && roadmap[0].created_by !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this roadmap' });
            }
            
            // Delete resources, steps, and roadmap
            await connection.query(
                'DELETE FROM step_resources WHERE step_id IN (SELECT id FROM roadmap_steps WHERE roadmap_id = ?)', 
                [roadmapId]
            );
            await connection.query('DELETE FROM roadmap_steps WHERE roadmap_id = ?', [roadmapId]);
            await connection.query('DELETE FROM roadmaps WHERE id = ?', [roadmapId]);
            
            await connection.commit();
            res.json({ message: 'Roadmap deleted successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error deleting roadmap:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 