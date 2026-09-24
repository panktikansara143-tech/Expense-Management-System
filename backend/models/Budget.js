const mongoose = require("mongoose");

const categoryBudgetSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        }
    },
    { _id: false }
);

const budgetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        month: {
            type: String, // Format: "YYYY-MM", e.g. "2026-09"
            required: true,
            trim: true
        },
        totalBudget: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },
        categoryBudgets: {
            type: [categoryBudgetSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure 1 budget document per user per month
budgetSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
