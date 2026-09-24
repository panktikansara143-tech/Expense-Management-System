const express = require("express");

const {
    addExpense,
    getExpenses,
    updateExpense,
    deleteExpense
} = require("../controllers/expenseController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Add expense
router.post("/add", protect, addExpense);

// Get all expenses of logged-in user
router.get("/", protect, getExpenses);

// Update expense
router.put("/:id", protect, updateExpense);

// Delete expense
router.delete("/:id", protect, deleteExpense);

module.exports = router;