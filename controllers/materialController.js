const db = require('../config/db');

exports.uploadMaterial = async (req, res) => {
    try {
        const { title, description } = req.body;
        const filePath = req.file.path;
        const mentorId = req.user.userId;

        await db.execute(
            'INSERT INTO materials (title, description, file_path, mentor_id) VALUES (?, ?, ?, ?)',
            [title, description, filePath, mentorId]
        );

        res.status(201).json({ message: 'Material uploaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Upload failed' });
    }
};

exports.getMaterials = async (req, res) => {
    try {
        const [materials] = await db.execute('SELECT * FROM materials');
        res.json(materials);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch materials' });
    }
};