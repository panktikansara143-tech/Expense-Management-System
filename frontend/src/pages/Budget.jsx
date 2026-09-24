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

function Budget() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Current month string "YYYY-MM"
    const currentMonthString = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
    }, []);

    const [selectedMonth, setSelectedMonth] = useState(currentMonthString);
    const [budgetData, setBudgetData] = useState({
        month: currentMonthString,
        totalBudget: 0,
        categoryBudgets: []
    });

    // Modal state for setting/editing budget
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalForm, setModalForm] = useState({
        totalBudget: "",
        categoryBudgets: []
    });
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState("");

    // Auto-dismiss success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // ==========================================
    // AUTH CHECK & LOAD DATA
    // ==========================================
    useEffect(() => {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");

        if (!token) {
            navigate("/login");
            return;
        }

        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (err) {
                console.error("Unable to read user information", err);
            }
        }

        fetchData(selectedMonth);
    }, [navigate, selectedMonth]);

    const fetchData = async (month) => {
        try {
            setLoading(true);
            setError("");

            const [expRes, budgetRes] = await Promise.all([
                API.get("/expenses"),
                API.get(`/budget?month=${month}`)
            ]);

            setExpenses(expRes.data.expenses || []);
            setBudgetData(
                budgetRes.data.budget || {
                    month,
                    totalBudget: 0,
                    categoryBudgets: []
                }
            );
        } catch (err) {
            console.error("Error fetching budget/expense data:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }
            setError(err.response?.data?.message || "Failed to load budget data");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    // ==========================================
    // CALCULATIONS FOR SELECTED MONTH
    // ==========================================
    const monthExpenses = useMemo(() => {
        return expenses.filter((exp) => {
            const d = new Date(exp.date);
            if (isNaN(d.getTime())) return false;
            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            return mStr === selectedMonth;
        });
    }, [expenses, selectedMonth]);

    const totalSpent = useMemo(() => {
        return monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [monthExpenses]);

    const totalBudget = budgetData.totalBudget || 0;
    const remainingBudget = totalBudget - totalSpent;
    const progressPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    // Available categories suggestions
    const categorySuggestions = useMemo(() => {
        const existing = expenses.map((e) => e.category?.trim()).filter(Boolean);
        const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]));
        return combined.sort();
    }, [expenses]);

    // Category budget breakdown calculations
    const categoryBudgetAnalysis = useMemo(() => {
        if (!budgetData.categoryBudgets || budgetData.categoryBudgets.length === 0) {
            return [];
        }

        return budgetData.categoryBudgets.map((item) => {
            const catName = item.category;
            const allotted = Number(item.amount || 0);

            const spent = monthExpenses
                .filter((e) => e.category?.toLowerCase() === catName.toLowerCase())
                .reduce((sum, e) => sum + Number(e.amount || 0), 0);

            const remaining = allotted - spent;
            const progress = allotted > 0 ? (spent / allotted) * 100 : 0;

            let status = "normal";
            if (progress >= 100) {
                status = "exceeded";
            } else if (progress >= 80) {
                status = "warning";
            }

            return {
                category: catName,
                allotted,
                spent,
                remaining,
                progress,
                status
            };
        });
    }, [budgetData.categoryBudgets, monthExpenses]);

    // Human-readable formatted month name, e.g. "September 2026"
    const formattedMonthName = useMemo(() => {
        if (!selectedMonth) return "";
        const [y, m] = selectedMonth.split("-");
        const date = new Date(Number(y), Number(m) - 1, 1);
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }, [selectedMonth]);

    // Month Navigation
    const handlePrevMonth = () => {
        const [y, m] = selectedMonth.split("-").map(Number);
        const prev = new Date(y, m - 2, 1);
        const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
        setSelectedMonth(prevStr);
    };

    const handleNextMonth = () => {
        const [y, m] = selectedMonth.split("-").map(Number);
        const next = new Date(y, m, 1);
        const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
        setSelectedMonth(nextStr);
    };

    // ==========================================
    // MODAL HANDLERS
    // ==========================================
    const handleOpenModal = () => {
        setModalForm({
            totalBudget: budgetData.totalBudget ? String(budgetData.totalBudget) : "",
            categoryBudgets: budgetData.categoryBudgets && budgetData.categoryBudgets.length > 0
                ? budgetData.categoryBudgets.map((cb) => ({ category: cb.category, amount: String(cb.amount) }))
                : [{ category: "", amount: "" }]
        });
        setModalError("");
        setIsModalOpen(true);
    };

    const handleAddCategoryRow = () => {
        setModalForm({
            ...modalForm,
            categoryBudgets: [...modalForm.categoryBudgets, { category: "", amount: "" }]
        });
    };

    const handleRemoveCategoryRow = (index) => {
        const updated = modalForm.categoryBudgets.filter((_, idx) => idx !== index);
        setModalForm({ ...modalForm, categoryBudgets: updated });
    };

    const handleCategoryChange = (index, field, value) => {
        const updated = [...modalForm.categoryBudgets];
        updated[index][field] = value;
        setModalForm({ ...modalForm, categoryBudgets: updated });
    };

    const handleSaveBudget = async (e) => {
        e.preventDefault();
        setModalError("");

        const parsedTotal = Number(modalForm.totalBudget);
        if (isNaN(parsedTotal) || parsedTotal < 0) {
            setModalError("Please enter a valid monthly budget amount (0 or more)");
            return;
        }

        const cleanedCategoryBudgets = modalForm.categoryBudgets
            .filter((row) => row.category && row.category.trim() && !isNaN(Number(row.amount)) && Number(row.amount) > 0)
            .map((row) => ({
                category: row.category.trim(),
                amount: Number(row.amount)
            }));

        try {
            setModalLoading(true);

            const response = await API.post("/budget", {
                month: selectedMonth,
                totalBudget: parsedTotal,
                categoryBudgets: cleanedCategoryBudgets
            });

            setBudgetData(response.data.budget);
            setIsModalOpen(false);
            setSuccessMessage("Budget updated successfully!");
        } catch (err) {
            console.error("Error saving budget:", err);
            setModalError(err.response?.data?.message || "Failed to save budget");
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <div className="dashboard">
            {/* ==================================
                SIDEBAR (LIGHT THEME)
            ================================== */}
            <aside className="sidebar light-sidebar">
                <div className="logo">
                    <div className="logo-icon">₹</div>
                    <div>
                        <h2>Expense</h2>
                        <span>Manager</span>
                    </div>
                </div>

                <div className="sidebar-menu">
                    <button className="menu-item" onClick={() => navigate("/dashboard")}>
                        <span>▣</span>
                        Dashboard
                    </button>

                    <button className="menu-item" onClick={() => navigate("/transactions")}>
                        <span>↔</span>
                        Transactions
                    </button>

                    <button className="menu-item" onClick={() => navigate("/reports")}>
                        <span>◉</span>
                        Reports
                    </button>

                    <button className="menu-item active" onClick={() => navigate("/budget")}>
                        <span>⊞</span>
                        Budget
                    </button>

                    <button className="menu-item" onClick={() => navigate("/settings")}>
                        <span>⚙</span>
                        Settings
                    </button>
                </div>

                <div className="sidebar-bottom">
                    <div className="profile-mini">
                        <div className="avatar">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                            <strong>{user?.name || "User"}</strong>
                            <small>Personal Account</small>
                        </div>
                    </div>

                    <button className="logout-btn" onClick={handleLogout}>
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
                        <h1>Monthly Budget</h1>
                        <p>Set spending goals, monitor progress, and prevent overspending</p>
                    </div>

                    <div className="topbar-user">
                        <div className="avatar">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                            <strong>{user?.name || "User"}</strong>
                            <small>{user?.email}</small>
                        </div>
                    </div>
                </header>

                {/* NOTIFICATIONS */}
                {successMessage && (
                    <div className="alert alert-success">
                        <span>✓ {successMessage}</span>
                        <button onClick={() => setSuccessMessage("")}>✕</button>
                    </div>
                )}

                {error && !loading && (
                    <div className="alert alert-error">
                        <span>⚠️ {error}</span>
                        <button onClick={() => fetchData(selectedMonth)}>Retry</button>
                    </div>
                )}

                {/* ==================================
                    MONTH SELECTOR & ACTION BAR
                ================================== */}
                <div className="budget-controls-bar">
                    <div className="month-navigator">
                        <button className="btn-month-nav" onClick={handlePrevMonth} title="Previous Month">
                            ◀
                        </button>
                        <h2 className="current-month-label">{formattedMonthName}</h2>
                        <button className="btn-month-nav" onClick={handleNextMonth} title="Next Month">
                            ▶
                        </button>
                    </div>

                    <div className="budget-actions">
                        <input
                            type="month"
                            className="filter-date-input"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />

                        <button className="add-expense-btn" onClick={handleOpenModal}>
                            ⚙ Set / Edit Budget
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="transaction-empty">
                        <div className="loading-spinner"></div>
                        <h3>Loading budget overview...</h3>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* ==================================
                            OVERALL BUDGET SUMMARY CARD
                        ================================== */}
                        <section className="budget-overview-card">
                            <div className="budget-overview-header">
                                <div>
                                    <span className="budget-tag">Monthly Overview</span>
                                    <h2>{formattedMonthName} Spending Limit</h2>
                                </div>

                                <div className="budget-badge-wrapper">
                                    {totalBudget === 0 ? (
                                        <span className="badge badge-neutral">No Budget Configured</span>
                                    ) : progressPercent >= 100 ? (
                                        <span className="badge badge-danger">🚨 Budget Exceeded</span>
                                    ) : progressPercent >= 80 ? (
                                        <span className="badge badge-warning">⚠️ Approaching Limit (80%+)</span>
                                    ) : (
                                        <span className="badge badge-success">✓ On Track</span>
                                    )}
                                </div>
                            </div>

                            {/* PROGRESS BAR */}
                            <div className="budget-progress-container">
                                <div className="budget-progress-bar-bg">
                                    <div
                                        className={`budget-progress-bar-fill ${
                                            progressPercent >= 100
                                                ? "fill-danger"
                                                : progressPercent >= 80
                                                ? "fill-warning"
                                                : "fill-success"
                                        }`}
                                        style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                    ></div>
                                </div>
                                <div className="budget-progress-labels">
                                    <span>
                                        Spent: <strong>₹{totalSpent.toFixed(2)}</strong>
                                    </span>
                                    <span>
                                        {progressPercent.toFixed(1)}% used of ₹{totalBudget.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* METRIC GRID */}
                            <div className="budget-metrics-grid">
                                <div className="budget-metric-item">
                                    <span className="metric-label">Monthly Limit</span>
                                    <strong className="metric-value">
                                        ₹{totalBudget.toFixed(2)}
                                    </strong>
                                </div>

                                <div className="budget-metric-item">
                                    <span className="metric-label">Total Spent</span>
                                    <strong className="metric-value text-danger">
                                        ₹{totalSpent.toFixed(2)}
                                    </strong>
                                </div>

                                <div className="budget-metric-item">
                                    <span className="metric-label">
                                        {remainingBudget >= 0 ? "Remaining Balance" : "Over Budget"}
                                    </span>
                                    <strong
                                        className={`metric-value ${
                                            remainingBudget >= 0 ? "text-success" : "text-danger"
                                        }`}
                                    >
                                        ₹{Math.abs(remainingBudget).toFixed(2)}
                                    </strong>
                                </div>

                                <div className="budget-metric-item">
                                    <span className="metric-label">Transactions</span>
                                    <strong className="metric-value">
                                        {monthExpenses.length} recorded
                                    </strong>
                                </div>
                            </div>
                        </section>

                        {/* ==================================
                            CATEGORY BUDGETS SECTION
                        ================================== */}
                        <section className="category-budgets-section">
                            <div className="section-header">
                                <div>
                                    <h2>Category Budgets</h2>
                                    <p>Track spending limits across individual expense categories</p>
                                </div>
                            </div>

                            {categoryBudgetAnalysis.length === 0 ? (
                                <div className="empty-category-budgets">
                                    <p>
                                        No category-specific budgets configured for this month.
                                    </p>
                                    <button className="btn-secondary" onClick={handleOpenModal}>
                                        + Add Category Limits
                                    </button>
                                </div>
                            ) : (
                                <div className="category-budget-cards-grid">
                                    {categoryBudgetAnalysis.map((cat) => (
                                        <div key={cat.category} className="cat-budget-card">
                                            <div className="cat-budget-header">
                                                <div className="cat-icon-name">
                                                    <span className="category-icon-pill">
                                                        {cat.category.charAt(0).toUpperCase()}
                                                    </span>
                                                    <strong>{cat.category}</strong>
                                                </div>

                                                <span
                                                    className={`status-pill ${
                                                        cat.status === "exceeded"
                                                            ? "pill-danger"
                                                            : cat.status === "warning"
                                                            ? "pill-warning"
                                                            : "pill-success"
                                                    }`}
                                                >
                                                    {cat.status === "exceeded"
                                                        ? "Exceeded"
                                                        : cat.status === "warning"
                                                        ? "80%+ Limit"
                                                        : "On Track"}
                                                </span>
                                            </div>

                                            <div className="cat-budget-amounts">
                                                <div>
                                                    <small>Spent</small>
                                                    <strong>₹{cat.spent.toFixed(2)}</strong>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <small>Limit</small>
                                                    <strong>₹{cat.allotted.toFixed(2)}</strong>
                                                </div>
                                            </div>

                                            <div className="budget-progress-bar-bg small-bar">
                                                <div
                                                    className={`budget-progress-bar-fill ${
                                                        cat.status === "exceeded"
                                                            ? "fill-danger"
                                                            : cat.status === "warning"
                                                            ? "fill-warning"
                                                            : "fill-success"
                                                    }`}
                                                    style={{ width: `${Math.min(cat.progress, 100)}%` }}
                                                ></div>
                                            </div>

                                            <div className="cat-budget-footer">
                                                <small>
                                                    {cat.remaining >= 0
                                                        ? `₹${cat.remaining.toFixed(2)} left`
                                                        : `₹${Math.abs(cat.remaining).toFixed(2)} over limit`}
                                                </small>
                                                <small>{cat.progress.toFixed(1)}%</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            {/* ==================================
                SET / EDIT BUDGET MODAL
            ================================== */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Configure Budget ({formattedMonthName})</h2>
                            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
                                <span>⚠️ {modalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveBudget} className="modal-form">
                            <div className="form-group">
                                <label>Total Monthly Budget (₹) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    placeholder="e.g. 25000"
                                    value={modalForm.totalBudget}
                                    onChange={(e) =>
                                        setModalForm({ ...modalForm, totalBudget: e.target.value })
                                    }
                                />
                                <small className="form-help-text">
                                    Overall spending cap for the entire month
                                </small>
                            </div>

                            <div className="category-budget-modal-section">
                                <div className="cat-modal-header">
                                    <label>Category Limits (Optional)</label>
                                    <button
                                        type="button"
                                        className="btn-add-category-row"
                                        onClick={handleAddCategoryRow}
                                    >
                                        + Add Category Limit
                                    </button>
                                </div>

                                {modalForm.categoryBudgets.map((row, idx) => (
                                    <div key={idx} className="category-budget-row">
                                        <input
                                            type="text"
                                            list="budget-category-suggestions"
                                            placeholder="Category (e.g. Food)"
                                            value={row.category}
                                            onChange={(e) =>
                                                handleCategoryChange(idx, "category", e.target.value)
                                            }
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Limit (₹)"
                                            value={row.amount}
                                            onChange={(e) =>
                                                handleCategoryChange(idx, "amount", e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="btn-remove-row"
                                            onClick={() => handleRemoveCategoryRow(idx)}
                                            title="Remove category limit"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}

                                <datalist id="budget-category-suggestions">
                                    {categorySuggestions.map((cat) => (
                                        <option key={cat} value={cat} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={modalLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="add-expense-btn"
                                    disabled={modalLoading}
                                >
                                    {modalLoading ? "Saving..." : "Save Budget"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Budget;
