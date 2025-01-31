// models/userModel.js
const pool = require('../config/db');

const createUser = async (username, hashedPassword, hospcode, hospname) => {
    const [result] = await pool.query(
        'INSERT INTO users (username, password, hospcode, hospname) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, hospcode, hospname]
    );
    return result.insertId;
};

const findUserByUsername = async (username) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
};

const updateUserRefreshToken = async (userId, refreshToken) => {
    await pool.query(
        'UPDATE users SET refresh_token = ? WHERE id = ?',
        [refreshToken, userId]
    );
};

module.exports = {
    createUser,
    findUserByUsername,
    updateUserRefreshToken
};
