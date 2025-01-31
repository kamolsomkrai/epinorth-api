// models/dashboardModel.js
const pool = require("../config/dbrabad");

const getDiseaseByHospital = async ({
  province,
  startDate,
  endDate,
  search,
}) => {
  let sql = "SELECT * FROM summary_disease_hospital";
  let conditions = [];
  let params = [];

  if (province) {
    conditions.push("province = ?");
    params.push(province);
  }

  if (startDate && endDate) {
    conditions.push("service_date BETWEEN ? AND ?");
    params.push(startDate, endDate);
  } else if (startDate) {
    conditions.push("service_date >= ?");
    params.push(startDate);
  } else if (endDate) {
    conditions.push("service_date <= ?");
    params.push(endDate);
  }

  if (search) {
    conditions.push("disease_name LIKE ?");
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

module.exports = { getDiseaseByHospital };
