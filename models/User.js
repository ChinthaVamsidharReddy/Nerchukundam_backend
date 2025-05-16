const pool = require('../config/database');

class User {
    static async findOne({ email }) {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return users.length > 0 ? users[0] : null;
    }

    static async findOneAndUpdate({ email }, { password }) {
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [password, email]);
        return true;
    }
}

module.exports = User;