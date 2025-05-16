const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

// Get leaderboard data
router.get('/', auth, async (req, res) => {
    try {
        const searchQuery = req.query.search;
        
        const query = `
            SELECT 
                u.id,
                u.username,
                COALESCE(AVG(qa.score), 0) as score
            FROM 
                users u
                LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
            WHERE 
                u.role = 'student'
                ${searchQuery ? 'AND u.username LIKE ?' : ''}
            GROUP BY 
                u.id, u.username
            ORDER BY 
                score DESC
        `;

        const params = searchQuery ? [`%${searchQuery}%`] : [];
        const [results] = await db.execute(query, params);

        // Add rank to each student
        const studentsWithRank = results.map((student, index) => ({
            ...student,
            rank: index + 1,
            score: parseFloat(student.score).toFixed(2)
        }));

        res.json(studentsWithRank);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get individual student's ranking details
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const query = `
            WITH StudentRanks AS (
                SELECT 
                    u.id,
                    u.username,
                    COALESCE(AVG(qa.score), 0) as avg_score,
                    COUNT(DISTINCT qa.quiz_id) as quizzes_taken,
                    MAX(qa.score) as best_score,
                    ROW_NUMBER() OVER (ORDER BY AVG(qa.score) DESC) as rank
                FROM 
                    users u
                    LEFT JOIN quiz_attempts qa ON u.id = qa.student_id
                WHERE 
                    u.role = 'student'
                GROUP BY 
                    u.id, u.username
            )
            SELECT *
            FROM StudentRanks
            WHERE id = ?
        `;

        const [results] = await db.execute(query, [studentId]);
        
        if (!results.length) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching student ranking:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;