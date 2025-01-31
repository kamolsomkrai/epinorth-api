// config/db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST_RABAD || "localhost",
  user: process.env.DB_USER_RABAD,
  password: process.env.DB_PASSWORD_RABAD,
  database: process.env.DB_NAME_RABAD,
  port: process.env.DB_PORT_RABAD || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

module.exports = pool;
