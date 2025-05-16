require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const pool = require('../config/database');

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Send OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store OTP with expiry (15 minutes)
        otpStore.set(email, {
            otp,
            expiry: Date.now() + 15 * 60 * 1000
        });

        // Configure email transporter
        // Update the transporter configuration with more detailed settings
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            debug: true // Enable debug logs
        });

        // Add a verification step
        transporter.verify(function (error, success) {
            if (error) {
                console.log('SMTP Error:', error);
            } else {
                console.log('Server is ready to take our messages');
            }
        });

        // Send email
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. This OTP will expire in 15 minutes.`
        });
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Verify OTP
console.log("5")
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const storedOTPData = otpStore.get(email);
        
        if (!storedOTPData) {
            return res.status(400).json({ message: 'OTP expired or not found' });
        }

        if (Date.now() > storedOTPData.expiry) {
            otpStore.delete(email);
            return res.status(400).json({ message: 'OTP expired' });
        }

        if (storedOTPData.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error in OTP verification:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset Password
console.log("6")
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        // Verify OTP again
        const storedOTPData = otpStore.get(email);
        if (!storedOTPData || storedOTPData.otp !== otp || Date.now() > storedOTPData.expiry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await pool.query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        // Clear OTP
        otpStore.delete(email);

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error in password reset:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;