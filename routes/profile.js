const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/profile - Fetch user profile
router.get('/', auth, async (req, res) => {
  try {
    // First get user info
    const [userResult] = await pool.execute(
      'SELECT u.id, u.username, u.email FROM users u WHERE u.id = ?',
      [req.user.id]
    );

    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Then get profile info
    const [profileResult] = await pool.execute(
      'SELECT * FROM profiles WHERE user_id = ?',
      [req.user.id]
    );

    const user = userResult[0];
    const profile = profileResult[0] || {};

    // Combine user and profile data
    res.json({
      name: user.username || '',
      email: user.email || '',
      phone: profile.phone || '',
      dateOfBirth: profile.date_of_birth || '',
      education: {
        level: profile.education_level || '',
        institution: profile.institution || '',
        branch: profile.branch || '',
        yearOfStudy: profile.year_of_study || '',
        rollNumber: profile.roll_number || '',
        admissionYear: profile.admission_year || ''
      },
      languages: {
        english: profile.english_level || '',
        hindi: profile.hindi_level || '',
        telugu: profile.telugu_level || ''
      },
      academicAchievements: profile.academic_achievements || '',
      extracurricularActivities: profile.extracurricular_activities || '',
      careerGoals: {
        primaryRole: profile.primary_role || '',
        secondaryRole: profile.secondary_role || '',
        specialization: profile.specialization || '',
        description: profile.career_description || ''
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/profile - Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const {
      name,
      phone,
      dateOfBirth,
      education,
      languages,
      academicAchievements,
      extracurricularActivities,
      careerGoals
    } = req.body;

    // Update username in users table
    await pool.execute(
      'UPDATE users SET username = ? WHERE id = ?',
      [name, req.user.id]
    );

    // Check if profile exists
    const [profileExists] = await pool.execute(
      'SELECT 1 FROM profiles WHERE user_id = ?',
      [req.user.id]
    );

    const profileData = [
      phone,
      dateOfBirth,
      education.level,
      education.institution,
      education.branch,
      education.yearOfStudy,
      education.rollNumber,
      education.admissionYear,
      languages.english,
      languages.hindi,
      languages.telugu,
      academicAchievements,
      extracurricularActivities,
      careerGoals.primaryRole,
      careerGoals.secondaryRole,
      careerGoals.specialization,
      careerGoals.description,
      req.user.id
    ];

    if (profileExists.length > 0) {
      // Update existing profile
      await pool.execute(
        `UPDATE profiles SET 
          phone = ?,
          date_of_birth = ?,
          education_level = ?,
          institution = ?,
          branch = ?,
          year_of_study = ?,
          roll_number = ?,
          admission_year = ?,
          english_level = ?,
          hindi_level = ?,
          telugu_level = ?,
          academic_achievements = ?,
          extracurricular_activities = ?,
          primary_role = ?,
          secondary_role = ?,
          specialization = ?,
          career_description = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
        profileData
      );
    } else {
      // Insert new profile
      await pool.execute(
        `INSERT INTO profiles (
          user_id, phone, date_of_birth, education_level, institution,
          branch, year_of_study, roll_number, admission_year,
          english_level, hindi_level, telugu_level,
          academic_achievements, extracurricular_activities,
          primary_role, secondary_role, specialization, career_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        profileData
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;