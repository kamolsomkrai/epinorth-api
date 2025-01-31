// routes/dashboardRoutes.js
const express = require("express");
const {
  getDiseaseByHospitalController,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/diseasebyhospital", getDiseaseByHospitalController);
module.exports = router;
