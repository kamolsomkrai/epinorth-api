// models/supplyModel.js
const pool = require("../config/db");

const getSupplies = async (hospcode, limit, offset, search) => {
  let sql =
    "SELECT supplies.*, cchangwat.provname FROM supplies JOIN cchangwat ON supplies.provcode = cchangwat.provcode WHERE hospcode = ?";
  let params = [hospcode];

  if (search) {
    sql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  return rows;
};

const getSupplyById = async (id, hospcode) => {
  const [rows] = await pool.query(
    "SELECT * FROM supplies WHERE id = ? AND hospcode = ?",
    [id, hospcode]
  );
  return rows[0];
};

const createSupply = async (
  hospcode,
  provcode,
  name,
  description,
  quantity,
  unit,
  category,
  year
) => {
  const [result] = await pool.query(
    "INSERT INTO supplies (hospcode, provcode, name, description, quantity, unit, category, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [hospcode, provcode, name, description, quantity, unit, category, year]
  );
  return result.insertId;
};

const updateSupply = async (id, hospcode, name, quantity, unit) => {
  await pool.query(
    "UPDATE supplies SET name = ?, quantity = ?, unit = ? WHERE id = ? AND hospcode = ?",
    [name, quantity, unit, id, hospcode]
  );
};

const deleteSupply = async (id, hospcode) => {
  await pool.query("DELETE FROM supplies WHERE id = ? AND hospcode = ?", [
    id,
    hospcode,
  ]);
};

const countSupplies = async (hospcode, search) => {
  let sql = "SELECT COUNT(*) as count FROM supplies WHERE hospcode = ?";
  let params = [hospcode];

  if (search) {
    sql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0].count;
};

module.exports = {
  getSupplies,
  getSupplyById,
  createSupply,
  updateSupply,
  deleteSupply,
  countSupplies,
};
