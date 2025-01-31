// app.js
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const {
  authenticateTokenFromHeader,
  authenticateTokenFromCookies,
} = require("./middlewares/authenticateToken");
const { generalApiLimiter } = require("./middlewares/rateLimiter");
const diseaseRoutes = require("./routes/dashboardRoutes");

const app = express();

app.set("trust proxy", 1);

// Middleware
app.use(helmet());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use(cookieParser());
app.use(morgan("combined"));

// CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate Limiting สำหรับทุกเส้นทาง
app.use("/api/", generalApiLimiter);

// Routes
app.use("/api/dashboardsmog", diseaseRoutes);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "API is running." });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  res.status(500).json({ message: "Internal server error." });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Express API running on port ${PORT}`);
});
