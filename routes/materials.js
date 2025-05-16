const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Get mentor's materials
router.get('/mentor', auth, async (req, res) => {
    try {
        console.log('User from auth:', req.user);
        const [materials] = await db.execute(
            'SELECT * FROM materials WHERE mentor_id = ? ORDER BY upload_date DESC',
            [req.user.id]
        );
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ message: 'Failed to fetch materials' });
    }
});

// Add this new route for students to get all materials
router.get('/', auth, async (req, res) => {
    try {
        const [materials] = await db.execute(
            'SELECT m.*, u.username as mentor_name FROM materials m ' +
            'JOIN users u ON m.mentor_id = u.id ' +
            'WHERE m.status = "active" ' +
            'ORDER BY m.upload_date DESC'
        );
        res.json(materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        res.status(500).json({ message: 'Failed to fetch materials' });
    }
});

// Upload new material
// In your upload route, update the SQL query
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        // Log the entire request body and file
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);
        console.log('User from auth:', req.user);

        const { title, description, category, subcategory } = req.body;
        
        // Validate required fields with detailed logging
        if (!title || !description || !category || !req.file) {
            console.log('Missing fields:', {
                title: !title,
                description: !description,
                category: !category,
                file: !req.file
            });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Validate mentor ID
        if (!req.user || !req.user.id) {
            console.error('No user ID found in request');
            return res.status(401).json({ message: 'Unauthorized - No user ID found' });
        }

        // Define filePath and fileType
        const filePath = `/uploads/${req.file.filename}`;
        
        // Map file extension to database ENUM values
        const getFileType = (mimeType) => {
            if (!mimeType) return 'other';
            
            const type = mimeType.split('/')[0];
            const extension = mimeType.split('/')[1];
            
            if (type === 'application') {
                if (extension.includes('pdf')) return 'pdf';
                if (extension.includes('word') || extension.includes('document')) return 'document';
                if (extension.includes('powerpoint') || extension.includes('presentation')) return 'document';
                if (extension.includes('excel') || extension.includes('spreadsheet')) return 'document';
                return 'document';
            }
            if (type === 'image') return 'image';
            if (type === 'video') return 'video';
            if (type === 'audio') return 'audio';
            return 'other';
        };

        const fileType = getFileType(req.file.mimetype);
        const fileSize = req.file.size || 0;
        
        // Ensure all values are properly defined
        const params = {
            title: title || '',
            description: description || '',
            filePath: filePath || '',
            fileType: fileType || 'other',
            fileSize: fileSize || 0,
            category: category || '',
            subcategory: subcategory || null,
            mentorId: req.user.id
        };

        // Log the parameters being sent to the database
        console.log('Database parameters:', params);

        // Insert with proper null handling and file size
        await db.execute(
            'INSERT INTO materials (title, description, file_path, file_type, category, subcategory, mentor_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                params.title,
                params.description,
                params.filePath,
                params.fileType,
                params.category,
                params.subcategory,
                params.mentorId
            ]
        );
        
        res.status(201).json({ message: 'Material uploaded successfully' });
    } catch (error) {
        console.error('Error uploading material:', error);
        // Log more detailed error information
        if (error.sqlMessage) {
            console.error('SQL Error:', error.sqlMessage);
        }
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// Add download tracking route
router.post('/download/:id', auth, async (req, res) => {
    try {
        const materialId = req.params.id;
        const studentId = req.user.userId;
        
        await db.execute(
            'INSERT INTO downloads (material_id, student_id, ip_address) VALUES (?, ?, ?)',
            [materialId, studentId, req.ip]
        );
        
        res.json({ message: 'Download recorded successfully' });
    } catch (error) {
        console.error('Error recording download:', error);
        res.status(500).json({ message: 'Failed to record download' });
    }
});

module.exports = router;