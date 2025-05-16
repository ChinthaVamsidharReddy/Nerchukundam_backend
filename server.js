const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');
const auth = require('./middleware/auth');
const profileRouter = require('./routes/profile');
const doubtsRouter = require('./routes/doubts');
const roadmapsRouter = require('./routes/roadmaps');
const mentorRoadmapsRouter = require('./routes/mentor/roadmaps'); // Add this line
const leaderboardRoutes = require('./routes/leaderboard');
const plannerRoutes = require('./routes/planner');
const forgotPasswordRouter = require('./router/forgotPassword');
const app = express();

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
});

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/announcements', require('./routes/announcements')); // Uncomment this line
app.use('/api/mentor/roadmaps', mentorRoadmapsRouter); // Update this line
app.use('/api/mentor', require('./routes/mentor')); // Add mentor routes
app.use('/api/doubts', require('./routes/doubts')); // Updated path to doubts route
app.use('/api/quizzes', require('./routes/quizzes')); // Add quiz routes
app.use('/api/roadmaps', roadmapsRouter);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/profile', profileRouter);
app.use('/api/auth', forgotPasswordRouter);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});