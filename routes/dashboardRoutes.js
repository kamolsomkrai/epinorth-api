// routes/frontendRoutes.js
const express = require("express");
const { getDiseaseByHospital } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/diseasebyhospital", getDiseaseByHospital);
module.exports = router;
