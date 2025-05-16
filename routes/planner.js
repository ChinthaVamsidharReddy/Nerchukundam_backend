const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../config/database');

// Get all tasks for a user
router.get('/tasks', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM study_planner_tasks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows); // Return the rows directly
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/tasks', auth, async (req, res) => {
  const { title, description } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO study_planner_tasks (user_id, title, description) VALUES (?, ?, ?)',
      [req.user.id, title, description]
    );
    
    // Fetch the newly created task
    const [newTask] = await pool.query(
      'SELECT * FROM study_planner_tasks WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newTask[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task status
router.put('/tasks/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query(
      'UPDATE study_planner_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, id, req.user.id]
    );
    
    // Fetch the updated task
    const [updatedTask] = await pool.query(
      'SELECT * FROM study_planner_tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (updatedTask.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(updatedTask[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

module.exports = router;