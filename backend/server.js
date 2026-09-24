const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Database connection
const connectDB = require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const budgetRoutes = require("./routes/budgetRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Authentication routes
app.use("/api/auth", authRoutes);

// Expense routes
app.use("/api/expenses", expenseRoutes);

// Budget routes
app.use("/api/budget", budgetRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Expense Management System API is running");
});

// Server port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});