const Expense = require("../models/Expense");

// ==========================================
// ADD EXPENSE
// ==========================================
const addExpense = async (req, res) => {
    try {
        const { title, amount, category, date, description } = req.body;

        // Check required title
        if (!title || !title.trim()) {
            return res.status(400).json({
                message: "Expense title is required"
            });
        }

        // Check required and positive amount
        const parsedAmount = Number(amount);
        if (amount === undefined || amount === null || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                message: "Amount is required and must be greater than 0"
            });
        }

        // Category can be optional / custom
        const finalCategory = category && category.trim() ? category.trim() : "General";

        // Date defaults to current date if missing
        let finalDate = new Date();
        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                finalDate = parsedDate;
            }
        }

        // Create expense
        const expense = await Expense.create({
            user: req.user.userId,
            title: title.trim(),
            amount: parsedAmount,
            category: finalCategory,
            date: finalDate,
            description: description ? description.trim() : ""
        });

        res.status(201).json({
            message: "Expense added successfully",
            expense
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


// (WITH PAGINATION)
const getExpenses = async (req, res) => {
    try {
        const DEFAULT_PAGE = 1;
        const DEFAULT_LIMIT = 10;

       
        if (req.query.all === "true") {
            const expenses = await Expense.find({
                user: req.user.userId
            }).sort({ date: -1 });

            const totalRecords = expenses.length;
            return res.status(200).json({
                message: "Expenses fetched successfully",
                expenses,
                page: 1,
                currentPage: 1,
                limit: totalRecords,
                totalPages: 1,
                totalRecords
            });
        }

        let page = parseInt(req.query.page, 10);
        let limit = parseInt(req.query.limit, 10);

        if (isNaN(page) || page < 1) {
            page = DEFAULT_PAGE;
        }

        if (isNaN(limit) || limit < 1 || limit > 50) {
            limit = DEFAULT_LIMIT;
        }

        const totalRecords = await Expense.countDocuments({
            user: req.user.userId
        });

        const totalPages = Math.max(1, Math.ceil(totalRecords / limit));

        const skip = (page - 1) * limit;

        const expenses = await Expense.find({
            user: req.user.userId
        })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            message: "Expenses fetched successfully",
            expenses,
            page,
            currentPage: page,
            limit,
            totalPages,
            totalRecords
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


// ==========================================
// UPDATE EXPENSE
// ==========================================
const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, category, date, description } = req.body;

        // Find expense belonging to logged-in user
        const expense = await Expense.findOne({
            _id: id,
            user: req.user.userId
        });

        if (!expense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        // Update fields if provided
        if (title !== undefined) {
            if (!title || !title.trim()) {
                return res.status(400).json({
                    message: "Expense title cannot be empty"
                });
            }
            expense.title = title.trim();
        }

        if (amount !== undefined) {
            const parsedAmount = Number(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                return res.status(400).json({
                    message: "Amount must be greater than 0"
                });
            }
            expense.amount = parsedAmount;
        }

        if (category !== undefined) {
            expense.category = category && category.trim() ? category.trim() : "General";
        }

        if (date !== undefined) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                expense.date = parsedDate;
            }
        }

        if (description !== undefined) {
            expense.description = description ? description.trim() : "";
        }

        await expense.save();

        res.status(200).json({
            message: "Expense updated successfully",
            expense
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


// ==========================================
// DELETE EXPENSE
// ==========================================
const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete expense belonging to logged-in user
        const expense = await Expense.findOneAndDelete({
            _id: id,
            user: req.user.userId
        });

        if (!expense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json({
            message: "Expense deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

module.exports = {
    addExpense,
    getExpenses,
    updateExpense,
    deleteExpense
};