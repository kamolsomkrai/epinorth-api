// models/frontendModel.js
const pool = require("../config/db");

const getSuppliesList = async (search) => {
  let sql = `
    SELECT * FROM supplies_list
  `;
  let params = [];
  if (search) {
    sql += " AND sl.supplyname LIKE ? ";
    params.push(`%${search}%`);
  }
  const [rows] = await pool.query(sql, params);
  return rows;
};

const getSummary = async () => {
  let sql = `
    SELECT s.name AS supplyname, s.provcode, SUM(s.quantity) AS total_quantity 
    FROM supplies s
    GROUP BY s.name, s.provcode
  `;
  const [rows] = await pool.query(sql);
  return rows;
};

module.exports = {
  getSuppliesList,
  getSummary,
};
