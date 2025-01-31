// controllers/dashboardController.js
const { getDiseaseByHospital } = require("../models/dashboardModel");

const getDiseaseByHospitalController = async (req, res) => {
  // รับพารามิเตอร์ทั้งหมดจาก request body
  const { province, startDate, endDate, search } = req.body;

  try {
    const supplyList = await getDiseaseByHospital({
      province,
      startDate,
      endDate,
      search,
    });
    res.json(supplyList);
  } catch (error) {
    console.error("Error fetching supply list:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { getDiseaseByHospitalController };
