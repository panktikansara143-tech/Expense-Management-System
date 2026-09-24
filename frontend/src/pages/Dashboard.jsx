import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const DEFAULT_CATEGORIES = [
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Entertainment",
    "College",
    "Transport",
    "Medical",
    "Personal",
    "Other"
];

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [budgetData, setBudgetData] = useState(null);

    const [formData, setFormData] = useState({
        title: "",
        amount: "",
        category: "",
        date: "",
        description: ""
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // =====================================================
    // NEW: EXPENSE CONFIGURATION / DELETE STATES
    // =====================================================

    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteExpense, setDeleteExpense] = useState(null);

    const currentMonthStr = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }, []);


    // ==========================================
    // GET USER AND EXPENSES
    // ==========================================

    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error("Invalid user data");
            }
        }

        fetchExpensesAndBudget();
    }, [navigate]);


    // ==========================================
    // FETCH EXPENSES & BUDGET
    // ==========================================

    const fetchExpensesAndBudget = async () => {
        try {
            const [expRes, budgetRes] = await Promise.all([
                API.get("/expenses"),
                API.get(`/budget?month=${currentMonthStr}`)
            ]);

            setExpenses(expRes.data.expenses || []);
            setBudgetData(budgetRes.data.budget || null);

        } catch (error) {
            console.error(error);

            if (error.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                navigate("/login");
            }
        }
    };


    // ==========================================
    // HANDLE INPUT
    // ==========================================

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };


    // ==========================================
    // ADD EXPENSE
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setError("");

        const trimmedTitle = formData.title.trim();
        const parsedAmount = Number(formData.amount);

        if (!trimmedTitle) {
            setError("Expense title is required");
            return;
        }

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        try {
            const response = await API.post(
                "/expenses/add",
                {
                    title: trimmedTitle,
                    amount: parsedAmount,
                    category: formData.category.trim() || "General",
                    date: formData.date || new Date().toISOString().split("T")[0],
                    description: formData.description.trim()
                }
            );

            setMessage(response.data.message || "Expense added successfully");

            setFormData({
                title: "",
                amount: "",
                category: "",
                date: "",
                description: ""
            });

            fetchExpensesAndBudget();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Failed to add expense"
            );
        }
    };


    // =====================================================
    // NEW: DELETE EXPENSE
    // =====================================================

    const handleDeleteExpense = async () => {
        if (!deleteExpense) return;

        try {
            setError("");
            setMessage("");

            await API.delete(`/expenses/${deleteExpense._id}`);

            // Close dialog
            setDeleteExpense(null);

            // Close configuration menu
            setOpenMenuId(null);

            // Show success message
            setMessage("Expense deleted successfully");

            // Refresh expenses and budget
            await fetchExpensesAndBudget();

        } catch (error) {
            console.error("Delete expense error:", error);

            setError(
                error.response?.data?.message ||
                "Failed to delete expense"
            );
        }
    };


    // ==========================================
    // LOGOUT
    // ==========================================

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/login");
    };


    // ==========================================
    // CALCULATIONS
    // ==========================================

    const totalExpense = expenses.reduce(
        (total, expense) =>
            total + Number(expense.amount),
        0
    );

    const expenseCount = expenses.length;

    const averageExpense =
        expenseCount > 0
            ? totalExpense / expenseCount
            : 0;

    const thisMonthExpenses = useMemo(() => {
        return expenses.filter((e) => {
            const d = new Date(e.date);

            if (isNaN(d.getTime())) return false;

            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === currentMonthStr;
        });
    }, [expenses, currentMonthStr]);

    const thisMonthTotal = useMemo(() => {
        return thisMonthExpenses.reduce(
            (sum, e) => sum + Number(e.amount || 0),
            0
        );
    }, [thisMonthExpenses]);

    const categorySuggestions = useMemo(() => {
        const existing = expenses
            .map((e) => e.category?.trim())
            .filter(Boolean);

        const combined = Array.from(
            new Set([
                ...DEFAULT_CATEGORIES,
                ...existing
            ])
        );

        return combined.sort();
    }, [expenses]);


    // ==========================================
    // PAGE
    // ==========================================

    return (
        <div className="dashboard">

            {/* ==================================
                SIDEBAR
            ================================== */}

            <aside className="sidebar light-sidebar">

                {/* LOGO */}

                <div className="logo">

                    <div className="logo-icon">
                        ₹
                    </div>

                    <div>
                        <h2>Expense</h2>
                        <span>Manager</span>
                    </div>

                </div>


                {/* SIDEBAR MENU */}

                <div className="sidebar-menu">

                    {/* DASHBOARD */}

                    <button
                        className="menu-item active"
                        onClick={() => navigate("/dashboard")}
                    >
                        <span>▣</span>
                        Dashboard
                    </button>


                    {/* TRANSACTIONS */}

                    <button
                        className="menu-item"
                        onClick={() => navigate("/transactions")}
                    >
                        <span>↔</span>
                        Transactions
                    </button>


                    {/* REPORTS */}

                    <button
                        className="menu-item"
                        onClick={() => navigate("/reports")}
                    >
                        <span>◉</span>
                        Reports
                    </button>


                    {/* BUDGET */}

                    <button
                        className="menu-item"
                        onClick={() => navigate("/budget")}
                    >
                        <span>⊞</span>
                        Budget
                    </button>


                    {/* SETTINGS */}

                    <button
                        className="menu-item"
                        onClick={() => navigate("/settings")}
                    >
                        <span>⚙</span>
                        Settings
                    </button>

                </div>


                {/* SIDEBAR BOTTOM */}

                <div className="sidebar-bottom">

                    <div className="profile-mini">

                        <div className="avatar">
                            {user?.name
                                ?.charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <strong>
                                {user?.name}
                            </strong>

                            <small>
                                Personal Account
                            </small>

                        </div>

                    </div>


                    {/* LOGOUT */}

                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </aside>


            {/* ==================================
                MAIN CONTENT
            ================================== */}

            <main className="dashboard-main">

                {/* TOP BAR */}

                <header className="topbar">

                    <div>

                        <h1>
                            Dashboard
                        </h1>

                        <p>
                            Welcome back, {user?.name}! 👋
                        </p>

                    </div>


                    <div className="topbar-user">

                        <div className="avatar">

                            {user?.name
                                ?.charAt(0)
                                .toUpperCase()}

                        </div>

                        <div>

                            <strong>
                                {user?.name}
                            </strong>

                            <small>
                                {user?.email}
                            </small>

                        </div>

                    </div>

                </header>


                {/* ==================================
                    SUMMARY CARDS
                ================================== */}

                <section className="summary-grid summary-grid-4">

                    {/* TOTAL EXPENSE */}

                    <div className="summary-card">

                        <div className="summary-icon">
                            ₹
                        </div>

                        <div>

                            <p>
                                Total Expenses
                            </p>

                            <h2>
                                ₹{totalExpense.toFixed(2)}
                            </h2>

                            <span className="summary-label">
                                All-time total
                            </span>

                        </div>

                    </div>


                    {/* THIS MONTH EXPENSE */}

                    <div className="summary-card">

                        <div className="summary-icon">
                            📅
                        </div>

                        <div>

                            <p>
                                This Month
                            </p>

                            <h2>
                                ₹{thisMonthTotal.toFixed(2)}
                            </h2>

                            <span className="summary-label">
                                Current month spending
                            </span>

                        </div>

                    </div>


                    {/* AVERAGE */}

                    <div className="summary-card">

                        <div className="summary-icon">
                            ↗
                        </div>

                        <div>

                            <p>
                                Average Expense
                            </p>

                            <h2>
                                ₹{averageExpense.toFixed(2)}
                            </h2>

                            <span className="summary-label">
                                Per transaction
                            </span>

                        </div>

                    </div>


                    {/* TRANSACTIONS */}

                    <div className="summary-card">

                        <div className="summary-icon">
                            #
                        </div>

                        <div>

                            <p>
                                Total Transactions
                            </p>

                            <h2>
                                {expenseCount}
                            </h2>

                            <span className="summary-label">
                                Recorded expenses
                            </span>

                        </div>

                    </div>

                </section>


                {/* ==================================
                    BUDGET OVERVIEW BANNER
                ================================== */}

                {budgetData && budgetData.totalBudget > 0 && (

                    <div
                        className="dashboard-budget-banner"
                        onClick={() => navigate("/budget")}
                    >

                        <div className="budget-banner-header">

                            <div className="budget-banner-title">

                                <span className="budget-banner-icon">
                                    ⊞
                                </span>

                                <div>

                                    <strong>
                                        Monthly Budget Progress
                                    </strong>

                                    <p>
                                        ₹{thisMonthTotal.toFixed(2)} spent of ₹{budgetData.totalBudget.toFixed(2)} limit ({((thisMonthTotal / budgetData.totalBudget) * 100).toFixed(1)}%)
                                    </p>

                                </div>

                            </div>


                            <div>

                                {(thisMonthTotal / budgetData.totalBudget) >= 1 ? (

                                    <span className="badge badge-danger">
                                        🚨 Budget Exceeded
                                    </span>

                                ) : (thisMonthTotal / budgetData.totalBudget) >= 0.8 ? (

                                    <span className="badge badge-warning">
                                        ⚠️ Approaching Limit (80%+)
                                    </span>

                                ) : (

                                    <span className="badge badge-success">
                                        ✓ On Track
                                    </span>

                                )}

                            </div>

                        </div>


                        <div className="budget-progress-bar-bg small-bar">

                            <div
                                className={`budget-progress-bar-fill ${
                                    (thisMonthTotal / budgetData.totalBudget) >= 1
                                        ? "fill-danger"
                                        : (thisMonthTotal / budgetData.totalBudget) >= 0.8
                                        ? "fill-warning"
                                        : "fill-success"
                                }`}
                                style={{
                                    width: `${Math.min(
                                        (thisMonthTotal / budgetData.totalBudget) * 100,
                                        100
                                    )}%`
                                }}
                            ></div>

                        </div>

                    </div>

                )}


                {/* ==================================
                    ADD EXPENSE + RECENT EXPENSES
                ================================== */}

                <section className="dashboard-grid">

                    {/* ==================================
                        ADD EXPENSE
                    ================================== */}

                    <div className="expense-form">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Add New Expense
                                </h2>

                                <p>
                                    Record a new transaction
                                </p>

                            </div>

                        </div>


                        <form onSubmit={handleSubmit}>

                            {/* TITLE */}

                            <div className="form-group">

                                <label>
                                    Expense Title
                                </label>

                                <input
                                    type="text"
                                    name="title"
                                    placeholder="e.g. Grocery Shopping"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />

                            </div>


                            {/* AMOUNT + CATEGORY */}

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Amount
                                    </label>

                                    <input
                                        type="number"
                                        name="amount"
                                        placeholder="₹ 0.00"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        min="0"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Category (Optional)
                                    </label>

                                    <input
                                        type="text"
                                        name="category"
                                        list="dashboard-category-suggestions"
                                        placeholder="e.g. Food, Transport, College"
                                        value={formData.category}
                                        onChange={handleChange}
                                    />

                                    <datalist id="dashboard-category-suggestions">

                                        {categorySuggestions.map((cat) => (
                                            <option
                                                key={cat}
                                                value={cat}
                                            />
                                        ))}

                                    </datalist>

                                </div>

                            </div>


                            {/* DATE */}

                            <div className="form-group">

                                <label>
                                    Date
                                </label>

                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                />

                            </div>


                            {/* DESCRIPTION */}

                            <div className="form-group">

                                <label>
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    placeholder="Add a note..."
                                    value={formData.description}
                                    onChange={handleChange}
                                />

                            </div>


                            {/* ADD BUTTON */}

                            <button
                                type="submit"
                                className="add-expense-btn"
                            >
                                + Add Expense
                            </button>

                        </form>


                        {/* SUCCESS MESSAGE */}

                        {message && (

                            <p className="success">
                                {message}
                            </p>

                        )}


                        {/* ERROR MESSAGE */}

                        {error && (

                            <p className="error">
                                {error}
                            </p>

                        )}

                    </div>


                    {/* ==================================
                        RECENT EXPENSES
                    ================================== */}

                    <div className="expense-list">

                        <div className="section-header">

                            <div>

                                <h2>
                                    Recent Expenses
                                </h2>

                                <p>
                                    Your latest transactions
                                </p>

                            </div>

                        </div>


                        {expenses.length === 0 ? (

                            /* NO EXPENSES */

                            <div className="empty-state">

                                <div className="empty-icon">
                                    ₹
                                </div>

                                <h3>
                                    No expenses yet
                                </h3>

                                <p>
                                    Add your first expense
                                    to get started.
                                </p>

                            </div>

                        ) : (

                            /* EXPENSE LIST */

                            <div className="expense-items">

                                {expenses
                                    .slice(0, 6)
                                    .map((expense) => (

                                        <div
                                            className="expense-card"
                                            key={expense._id}
                                        >

                                            {/* EXPENSE INFORMATION */}

                                            <div className="expense-info">

                                                <div className="expense-icon">

                                                    {expense.category
                                                        ?.charAt(0)
                                                        .toUpperCase()}

                                                </div>


                                                <div>

                                                    <h3>
                                                        {expense.title}
                                                    </h3>

                                                    <p>
                                                        {expense.category}
                                                    </p>

                                                    <small>

                                                        {new Date(
                                                            expense.date
                                                        ).toLocaleDateString()}

                                                    </small>

                                                </div>

                                            </div>


                                            {/* ==================================
                                                EXPENSE RIGHT SIDE
                                            ================================== */}

                                            <div className="expense-right">

                                                {/* AMOUNT */}

                                                <strong>

                                                    - ₹
                                                    {Number(
                                                        expense.amount
                                                    ).toFixed(2)}

                                                </strong>


                                                {/* ==================================
                                                    CONFIGURATION BUTTON
                                                ================================== */}

                                                <div className="expense-menu-container">

                                                    <button
                                                        type="button"
                                                        className="expense-menu-btn"
                                                        onClick={() =>
                                                            setOpenMenuId(
                                                                openMenuId === expense._id
                                                                    ? null
                                                                    : expense._id
                                                            )
                                                        }
                                                        title="Expense options"
                                                    >
                                                        ⋮
                                                    </button>


                                                    {/* ==================================
                                                        CONFIGURATION MENU
                                                    ================================== */}

                                                    {openMenuId === expense._id && (

                                                        <div className="expense-menu">

                                                            <button
                                                                type="button"
                                                                className="delete-menu-item"
                                                                onClick={() => {

                                                                    setDeleteExpense(
                                                                        expense
                                                                    );

                                                                    setOpenMenuId(
                                                                        null
                                                                    );

                                                                }}
                                                            >
                                                                🗑 Delete
                                                            </button>

                                                        </div>

                                                    )}

                                                </div>

                                            </div>

                                        </div>

                                    ))}

                            </div>

                        )}

                    </div>

                </section>

            </main>


            {/* ==========================================
                DELETE CONFIRMATION DIALOG
            ========================================== */}

            {deleteExpense && (

                <div
                    className="delete-dialog-overlay"
                    onClick={() => setDeleteExpense(null)}
                >

                    <div
                        className="delete-dialog"
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* DELETE ICON */}

                        <div className="delete-dialog-icon">
                            🗑
                        </div>


                        {/* TITLE */}

                        <h2>
                            Delete Expense?
                        </h2>


                        {/* MESSAGE */}

                        <p>
                            Are you sure you want to delete{" "}
                            <strong>
                                "{deleteExpense.title}"
                            </strong>
                            ?
                        </p>


                        <p className="delete-warning">
                            This action cannot be undone.
                        </p>


                        {/* BUTTONS */}

                        <div className="delete-dialog-actions">

                            <button
                                type="button"
                                className="cancel-delete-btn"
                                onClick={() => setDeleteExpense(null)}
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="confirm-delete-btn"
                                onClick={handleDeleteExpense}
                            >
                                Delete
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

export default Dashboard;