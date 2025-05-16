const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const isMentor = require('../middleware/isMentor');

// Get all quizzes (Student view)
router.get('/student', auth, async (req, res) => {
    try {
        const [quizzes] = await pool.query(
            `SELECT q.*, 
                u.full_name as mentor_name,
                COUNT(DISTINCT qq.id) as total_questions,
                (
                    SELECT COUNT(*) 
                    FROM quiz_attempts 
                    WHERE quiz_id = q.id AND student_id = ?
                ) as attempts,
                (
                    SELECT MAX(score) 
                    FROM quiz_attempts 
                    WHERE quiz_id = q.id AND student_id = ?
                ) as best_score
            FROM quizzes q
            JOIN users u ON q.mentor_id = u.id
            LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
            WHERE q.status = 'active'
            GROUP BY q.id
            ORDER BY q.created_at DESC`,
            [req.user.id, req.user.id]
        );
        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get mentor's quizzes
router.get('/mentor', [auth, isMentor], async (req, res) => {
    try {
        const [quizzes] = await pool.query(
            `SELECT 
                q.*,
                COUNT(DISTINCT qa.id) as total_attempts,
                AVG(qa.score) as avg_score
            FROM quizzes q
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
            WHERE q.mentor_id = ?
            GROUP BY q.id
            ORDER BY q.created_at DESC`,
            [req.user.id]
        );

        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching mentor quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create quiz (Mentor only)
router.post('/', [auth, isMentor], async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            title,
            description,
            category,
            subcategory,
            difficulty,
            duration_minutes,
            questions
        } = req.body;

        // Input validation
        if (!title || !description || !category || !subcategory || !difficulty || !duration_minutes || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate duration_minutes
        const duration = parseInt(duration_minutes);
        if (isNaN(duration) || duration < 5 || duration > 180) {
            return res.status(400).json({ message: 'Invalid duration. Must be between 5 and 180 minutes.' });
        }

        // Validate questions
        if (questions.length === 0) {
            return res.status(400).json({ message: 'Quiz must have at least one question' });
        }

        for (const question of questions) {
            if (!question.question_text || !Array.isArray(question.options) || 
                question.options.length !== 4 || 
                typeof question.correct_answer !== 'number' ||
                question.correct_answer < 0 || 
                question.correct_answer > 3) {
                return res.status(400).json({ message: 'Invalid question format' });
            }
        }

        await connection.beginTransaction();

        // Create quiz
        const [quiz] = await connection.query(
            `INSERT INTO quizzes (
                title,
                description,
                category,
                subcategory,
                difficulty,
                duration_minutes,
                mentor_id,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [title, description, category, subcategory, difficulty, duration, req.user.id]
        );

        // Add questions
        for (const question of questions) {
            await connection.query(
                `INSERT INTO quiz_questions (
                    quiz_id,
                    question_text,
                    options,
                    correct_answer,
                    explanation
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    quiz.insertId,
                    question.question_text,
                    JSON.stringify(question.options),
                    question.correct_answer,
                    question.explanation || ''
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Quiz created successfully', quizId: quiz.insertId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});

// Get quiz details (Student view)
router.get('/:quizId', auth, async (req, res) => {
    try {
        const { quizId } = req.params;
        console.log('Fetching quiz details for ID:', quizId);
        const connection = await pool.getConnection();

        try {
            // Get quiz details
            const [quiz] = await connection.query(
                `SELECT q.*, u.full_name as mentor_name
                FROM quizzes q
                JOIN users u ON q.mentor_id = u.id
                WHERE q.id = ?`,
                [quizId]
            );

            console.log('Quiz query result:', quiz);

            if (quiz.length === 0) {
                connection.release();
                return res.status(404).json({ message: 'Quiz not found' });
            }

            // Get questions
            const [questions] = await connection.query(
                `SELECT id, question_text, options
                FROM quiz_questions
                WHERE quiz_id = ?
                ORDER BY id`,
                [quizId]
            );

            console.log('Questions found:', questions.length);
            console.log('Raw questions data:', questions);

            // Safely parse options
            const parsedQuestions = questions.map(q => {
                try {
                    const options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    return {
                        ...q,
                        options: Array.isArray(options) ? options : []
                    };
                } catch (error) {
                    console.error('Error parsing options for question:', q.id, error);
                    return {
                        ...q,
                        options: []
                    };
                }
            });

            connection.release();

            res.json({
                ...quiz[0],
                questions: parsedQuestions
            });
        } catch (error) {
            connection.release();
            throw error;
        }
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit quiz attempt
router.post('/:quizId/submit', auth, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { quizId } = req.params;
        const { answers, time_taken } = req.body;

        await connection.beginTransaction();

        // Get quiz questions with correct answers
        const [questions] = await connection.query(
            'SELECT id, correct_answer, explanation FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );

        // Calculate score
        let correctCount = 0;
        const gradedAnswers = answers.map(answer => {
            const question = questions.find(q => q.id === answer.question_id);
            const isCorrect = question && question.correct_answer === answer.selected_option;
            if (isCorrect) correctCount++;
            return {
                ...answer,
                is_correct: isCorrect,
                explanation: question?.explanation
            };
        });

        const score = (correctCount / questions.length) * 100;

        // Save attempt
        const [attempt] = await connection.query(
            `INSERT INTO quiz_attempts (
                quiz_id, 
                student_id, 
                score, 
                total_questions,
                correct_answers,
                time_taken
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [quizId, req.user.id, score, questions.length, correctCount, time_taken]
        );

        // Save answers
        for (const answer of gradedAnswers) {
            await connection.query(
                `INSERT INTO quiz_answers (
                    attempt_id,
                    question_id,
                    selected_option,
                    is_correct
                ) VALUES (?, ?, ?, ?)`,
                [attempt.insertId, answer.question_id, answer.selected_option, answer.is_correct]
            );
        }

        await connection.commit();

        res.json({
            score,
            total_questions: questions.length,
            correct_answers: correctCount,
            time_taken,
            answers: gradedAnswers
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error submitting quiz:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});

// Create quiz (Mentor only)
router.post('/', [auth, isMentor], async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            title,
            description,
            category,
            subcategory,
            difficulty,
            duration_minutes,
            questions
        } = req.body;

        // Input validation
        if (!title || !description || !category || !subcategory || !difficulty || !duration_minutes || !questions || !Array.isArray(questions)) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate duration_minutes
        const duration = parseInt(duration_minutes);
        if (isNaN(duration) || duration < 5 || duration > 180) {
            return res.status(400).json({ message: 'Invalid duration. Must be between 5 and 180 minutes.' });
        }

        // Validate questions
        if (questions.length === 0) {
            return res.status(400).json({ message: 'Quiz must have at least one question' });
        }

        for (const question of questions) {
            if (!question.question_text || !Array.isArray(question.options) || 
                question.options.length !== 4 || 
                typeof question.correct_answer !== 'number' ||
                question.correct_answer < 0 || 
                question.correct_answer > 3) {
                return res.status(400).json({ message: 'Invalid question format' });
            }
        }

        await connection.beginTransaction();

        // Create quiz
        const [quiz] = await connection.query(
            `INSERT INTO quizzes (
                title,
                description,
                category,
                subcategory,
                difficulty,
                duration_minutes,
                mentor_id,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
            [title, description, category, subcategory, difficulty, duration, req.user.id]
        );

        // Add questions
        for (const question of questions) {
            await connection.query(
                `INSERT INTO quiz_questions (
                    quiz_id,
                    question_text,
                    options,
                    correct_answer,
                    explanation
                ) VALUES (?, ?, ?, ?, ?)`,
                [
                    quiz.insertId,
                    question.question_text,
                    JSON.stringify(question.options),
                    question.correct_answer,
                    question.explanation || ''
                ]
            );
        }

        await connection.commit();
        res.json({ message: 'Quiz created successfully', quizId: quiz.insertId });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
});

// Get mentor's quizzes
router.get('/mentor', [auth, isMentor], async (req, res) => {
    try {
        const [quizzes] = await pool.query(
            `SELECT 
                q.*,
                COUNT(DISTINCT qa.id) as total_attempts,
                AVG(qa.score) as avg_score
            FROM quizzes q
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
            WHERE q.mentor_id = ?
            GROUP BY q.id
            ORDER BY q.created_at DESC`,
            [req.user.id]
        );

        res.json(quizzes);
    } catch (error) {
        console.error('Error fetching mentor quizzes:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 