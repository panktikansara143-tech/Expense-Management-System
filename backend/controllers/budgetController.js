const Budget = require("../models/Budget");

// ==========================================
// GET BUDGET FOR A GIVEN MONTH
// ==========================================
const getBudget = async (req, res) => {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
        const month = req.query.month || currentMonth;

        const budget = await Budget.findOne({
            user: req.user.userId,
            month
        });

        res.status(200).json({
            message: "Budget fetched successfully",
            budget: budget || {
                month,
                totalBudget: 0,
                categoryBudgets: []
            }
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// ==========================================
// SET / UPDATE BUDGET FOR A MONTH
// ==========================================
const setBudget = async (req, res) => {
    try {
        const { month, totalBudget, categoryBudgets } = req.body;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                message: "Valid month in YYYY-MM format is required"
            });
        }

        const parsedTotal = Number(totalBudget);
        if (isNaN(parsedTotal) || parsedTotal < 0) {
            return res.status(400).json({
                message: "Total budget must be a non-negative number"
            });
        }

        // Clean category budgets if provided
        const cleanedCategoryBudgets = Array.isArray(categoryBudgets)
            ? categoryBudgets
                  .filter((item) => item && item.category && !isNaN(Number(item.amount)))
                  .map((item) => ({
                      category: item.category.trim(),
                      amount: Math.max(0, Number(item.amount))
                  }))
            : [];

        const budget = await Budget.findOneAndUpdate(
            {
                user: req.user.userId,
                month
            },
            {
                totalBudget: parsedTotal,
                categoryBudgets: cleanedCategoryBudgets
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(200).json({
            message: "Budget saved successfully",
            budget
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

module.exports = {
    getBudget,
    setBudget
};
