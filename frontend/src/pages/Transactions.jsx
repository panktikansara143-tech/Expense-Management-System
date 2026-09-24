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

function Transactions() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [dateFilter, setDateFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal states
    const [editingExpense, setEditingExpense] = useState(null);
    const [editForm, setEditForm] = useState({
        title: "",
        amount: "",
        category: "",
        date: "",
        description: ""
    });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");

    const [deletingExpense, setDeletingExpense] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Auto-dismiss success messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // ==========================================
    // PAGE LOAD & AUTH CHECK
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

        fetchExpenses();
    }, [navigate]);

    // ==========================================
    // FETCH EXPENSES
    // ==========================================
    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await API.get("/expenses");
            setExpenses(response.data.expenses || []);
        } catch (err) {
            console.error("Error fetching expenses:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }

            setError(
                err.response?.data?.message || "Failed to fetch expenses"
            );
        } finally {
            setLoading(false);
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
    // DATE FORMATTERS
    // ==========================================
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
    };

    // ==========================================
    // DYNAMIC CATEGORIES
    // ==========================================
    const uniqueCategories = useMemo(() => {
        const categoriesSet = new Set(
            expenses.map((e) => e.category?.trim()).filter(Boolean)
        );
        return Array.from(categoriesSet).sort();
    }, [expenses]);

    const categorySuggestions = useMemo(() => {
        const existing = expenses.map((e) => e.category?.trim()).filter(Boolean);
        const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...existing]));
        return combined.sort();
    }, [expenses]);

    // ==========================================
    // COMBINED FILTERING LOGIC
    // ==========================================
    const filteredExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            // 1. Search filter (Title, Category, Description)
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase().trim();
                const titleMatch = expense.title?.toLowerCase().includes(query);
                const categoryMatch = expense.category?.toLowerCase().includes(query);
                const descMatch = expense.description?.toLowerCase().includes(query);

                if (!titleMatch && !categoryMatch && !descMatch) {
                    return false;
                }
            }

            // 2. Category filter
            if (selectedCategory !== "All") {
                if (expense.category !== selectedCategory) {
                    return false;
                }
            }

            // 3. Date filter
            if (dateFilter !== "all") {
                const expDate = new Date(expense.date);
                const now = new Date();

                if (dateFilter === "today") {
                    const isToday =
                        expDate.getFullYear() === now.getFullYear() &&
                        expDate.getMonth() === now.getMonth() &&
                        expDate.getDate() === now.getDate();
                    if (!isToday) return false;
                } else if (dateFilter === "this_week") {
                    const startOfWeek = new Date(now);
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
                    startOfWeek.setDate(diff);
                    startOfWeek.setHours(0, 0, 0, 0);

                    const endOfWeek = new Date(startOfWeek);
                    endOfWeek.setDate(startOfWeek.getDate() + 6);
                    endOfWeek.setHours(23, 59, 59, 999);

                    if (expDate < startOfWeek || expDate > endOfWeek) return false;
                } else if (dateFilter === "this_month") {
                    const isThisMonth =
                        expDate.getFullYear() === now.getFullYear() &&
                        expDate.getMonth() === now.getMonth();
                    if (!isThisMonth) return false;
                } else if (dateFilter === "custom") {
                    if (startDate) {
                        const start = new Date(startDate);
                        start.setHours(0, 0, 0, 0);
                        if (expDate < start) return false;
                    }
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (expDate > end) return false;
                    }
                }
            }

            return true;
        });
    }, [expenses, searchQuery, selectedCategory, dateFilter, startDate, endDate]);

    // Summary calculations
    const totalOverallAmount = useMemo(() => {
        return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [expenses]);

    const filteredTotalAmount = useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [filteredExpenses]);

    const isFilterActive =
        searchQuery !== "" ||
        selectedCategory !== "All" ||
        dateFilter !== "all" ||
        startDate !== "" ||
        endDate !== "";

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("All");
        setDateFilter("all");
        setStartDate("");
        setEndDate("");
    };

    // ==========================================
    // EDIT EXPENSE
    // ==========================================
    const handleOpenEdit = (expense) => {
        setEditingExpense(expense);
        setEditForm({
            title: expense.title || "",
            amount: expense.amount || "",
            category: expense.category || "",
            date: formatDateForInput(expense.date),
            description: expense.description || ""
        });
        setEditError("");
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        const trimmedTitle = editForm.title?.trim();
        const parsedAmount = Number(editForm.amount);

        if (!trimmedTitle) {
            setEditError("Expense title is required");
            return;
        }

        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setEditError("Amount is required and must be greater than 0");
            return;
        }

        try {
            setEditLoading(true);
            setEditError("");

            const response = await API.put(`/expenses/${editingExpense._id}`, {
                title: trimmedTitle,
                amount: parsedAmount,
                category: editForm.category?.trim() || "General",
                date: editForm.date ? new Date(editForm.date) : new Date(),
                description: editForm.description?.trim() || ""
            });

            const updatedExpense = response.data.expense;

            setExpenses((prev) =>
                prev.map((exp) => (exp._id === updatedExpense._id ? updatedExpense : exp))
            );

            setEditingExpense(null);
            setSuccessMessage("Expense updated successfully!");
        } catch (err) {
            console.error("Error updating expense:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }
            setEditError(
                err.response?.data?.message || "Failed to update expense. Please try again."
            );
        } finally {
            setEditLoading(false);
        }
    };

    // ==========================================
    // DELETE EXPENSE
    // ==========================================
    const handleOpenDelete = (expense) => {
        setDeletingExpense(expense);
    };

    const handleConfirmDelete = async () => {
        if (!deletingExpense) return;

        try {
            setDeleteLoading(true);

            await API.delete(`/expenses/${deletingExpense._id}`);

            setExpenses((prev) => prev.filter((exp) => exp._id !== deletingExpense._id));
            setDeletingExpense(null);
            setSuccessMessage("Expense deleted successfully!");
        } catch (err) {
            console.error("Error deleting expense:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }
            setError(err.response?.data?.message || "Failed to delete expense");
            setDeletingExpense(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="dashboard">
            {/* ==================================
                SIDEBAR (LIGHT MODE)
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

                    <button className="menu-item active" onClick={() => navigate("/transactions")}>
                        <span>↔</span>
                        Transactions
                    </button>

                    <button className="menu-item" onClick={() => navigate("/reports")}>
                        <span>◉</span>
                        Reports
                    </button>

                    <button className="menu-item" onClick={() => navigate("/budget")}>
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
                        <h1>Transactions</h1>
                        <p>Search, filter, edit, and manage all your expenses</p>
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

                {/* NOTIFICATION ALERTS */}
                {successMessage && (
                    <div className="alert alert-success">
                        <span>✓ {successMessage}</span>
                        <button onClick={() => setSuccessMessage("")}>✕</button>
                    </div>
                )}

                {error && !loading && (
                    <div className="alert alert-error">
                        <span>⚠️ {error}</span>
                        <button onClick={() => setError("")}>✕</button>
                    </div>
                )}

                {/* ==================================
                    SUMMARY CARDS
                ================================== */}
                <section className="transaction-summary">
                    <div className="transaction-summary-card">
                        <div className="summary-card-header">
                            <span>Total Transactions</span>
                            <div className="card-badge">
                                {isFilterActive ? `${filteredExpenses.length} Filtered` : "Total"}
                            </div>
                        </div>
                        <strong>{filteredExpenses.length}</strong>
                        {isFilterActive && (
                            <small className="summary-subtext">out of {expenses.length} total</small>
                        )}
                    </div>

                    <div className="transaction-summary-card">
                        <div className="summary-card-header">
                            <span>Total Amount</span>
                            <div className="card-badge">
                                {isFilterActive ? "Filtered Sum" : "Overall Sum"}
                            </div>
                        </div>
                        <strong className="text-primary">
                            ₹{filteredTotalAmount.toFixed(2)}
                        </strong>
                        {isFilterActive && (
                            <small className="summary-subtext">
                                Total: ₹{totalOverallAmount.toFixed(2)}
                            </small>
                        )}
                    </div>
                </section>

                {/* ==================================
                    TRANSACTIONS CONTAINER & FILTERS
                ================================== */}
                <section className="transaction-container">
                    <div className="transaction-header-row">
                        <div>
                            <h2>All Transactions</h2>
                            <p>Manage and filter your recorded expenses</p>
                        </div>

                        {isFilterActive && (
                            <button className="clear-filters-btn" onClick={handleClearFilters}>
                                ✕ Clear Filters
                            </button>
                        )}
                    </div>

                    {/* FILTER CONTROL BAR */}
                    <div className="filter-bar">
                        {/* 1. SEARCH BOX */}
                        <div className="filter-group search-input-wrapper">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by title, category, description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    className="clear-search-btn"
                                    onClick={() => setSearchQuery("")}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* 2. CATEGORY FILTER */}
                        <div className="filter-group">
                            <label className="filter-label">Category</label>
                            <select
                                className="filter-select"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {uniqueCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 3. DATE FILTER */}
                        <div className="filter-group">
                            <label className="filter-label">Date Range</label>
                            <select
                                className="filter-select"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                            >
                                <option value="all">All Dates</option>
                                <option value="today">Today</option>
                                <option value="this_week">This Week</option>
                                <option value="this_month">This Month</option>
                                <option value="custom">Custom Date Range</option>
                            </select>
                        </div>

                        {/* CUSTOM DATE RANGE INPUTS */}
                        {dateFilter === "custom" && (
                            <div className="custom-date-group">
                                <div className="filter-group">
                                    <label className="filter-label">From</label>
                                    <input
                                        type="date"
                                        className="filter-date-input"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="filter-group">
                                    <label className="filter-label">To</label>
                                    <input
                                        type="date"
                                        className="filter-date-input"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ==================================
                        LOADING STATE
                    ================================== */}
                    {loading && (
                        <div className="transaction-empty">
                            <div className="loading-spinner"></div>
                            <h3>Loading transactions...</h3>
                        </div>
                    )}

                    {/* ==================================
                        ERROR STATE
                    ================================== */}
                    {!loading && error && expenses.length === 0 && (
                        <div className="transaction-empty">
                            <h3>Something went wrong</h3>
                            <p>{error}</p>
                            <button className="add-expense-btn" onClick={fetchExpenses}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* ==================================
                        EMPTY STATE: NO EXPENSES AT ALL
                    ================================== */}
                    {!loading && !error && expenses.length === 0 && (
                        <div className="transaction-empty">
                            <div className="empty-icon">₹</div>
                            <h3>No expenses recorded yet</h3>
                            <p>Add your first expense from the Dashboard to get started.</p>
                            <button
                                className="add-expense-btn"
                                onClick={() => navigate("/dashboard")}
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    )}

                    {/* ==================================
                        EMPTY STATE: NO FILTER MATCHES
                    ================================== */}
                    {!loading && !error && expenses.length > 0 && filteredExpenses.length === 0 && (
                        <div className="transaction-empty">
                            <div className="empty-icon">🔍</div>
                            <h3>No transactions found</h3>
                            <p>No expenses match your active search or filter criteria.</p>
                            <button className="add-expense-btn" onClick={handleClearFilters}>
                                Clear All Filters
                            </button>
                        </div>
                    )}

                    {/* ==================================
                        TRANSACTIONS TABLE
                    ================================== */}
                    {!loading && !error && filteredExpenses.length > 0 && (
                        <div className="transaction-table-wrapper">
                            <table className="transaction-table">
                                <thead>
                                    <tr>
                                        <th>Expense</th>
                                        <th>Category</th>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th style={{ textAlign: "right" }}>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredExpenses.map((expense) => (
                                        <tr key={expense._id}>
                                            {/* EXPENSE TITLE & ICON */}
                                            <td>
                                                <div className="transaction-expense">
                                                    <div className="expense-icon">
                                                        {expense.category?.charAt(0).toUpperCase() || "E"}
                                                    </div>
                                                    <strong>{expense.title}</strong>
                                                </div>
                                            </td>

                                            {/* CATEGORY BADGE */}
                                            <td>
                                                <span className="category-badge">
                                                    {expense.category}
                                                </span>
                                            </td>

                                            {/* DATE */}
                                            <td>{formatDate(expense.date)}</td>

                                            {/* DESCRIPTION */}
                                            <td>
                                                <span
                                                    className="description-text"
                                                    title={expense.description}
                                                >
                                                    {expense.description || "No description"}
                                                </span>
                                            </td>

                                            {/* AMOUNT */}
                                            <td>
                                                <strong className="expense-amount">
                                                    - ₹{Number(expense.amount).toFixed(2)}
                                                </strong>
                                            </td>

                                            {/* ACTIONS */}
                                            <td style={{ textAlign: "right" }}>
                                                <div className="action-buttons">
                                                    <button
                                                        className="action-btn edit-btn"
                                                        onClick={() => handleOpenEdit(expense)}
                                                        title="Edit Expense"
                                                    >
                                                        ✏️ Edit
                                                    </button>

                                                    <button
                                                        className="action-btn delete-btn"
                                                        onClick={() => handleOpenDelete(expense)}
                                                        title="Delete Expense"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>

            {/* ==================================
                EDIT EXPENSE MODAL
            ================================== */}
            {editingExpense && (
                <div className="modal-overlay" onClick={() => setEditingExpense(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Expense</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setEditingExpense(null)}
                            >
                                ✕
                            </button>
                        </div>

                        {editError && (
                            <div className="alert alert-error" style={{ marginBottom: "15px" }}>
                                <span>⚠️ {editError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveEdit} className="modal-form">
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Expense title"
                                    value={editForm.title}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, title: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Amount (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        value={editForm.amount}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, amount: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Category (Optional)</label>
                                    <input
                                        type="text"
                                        list="category-suggestions"
                                        placeholder="e.g. Food, Transport, College"
                                        value={editForm.category}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, category: e.target.value })
                                        }
                                    />
                                    <datalist id="category-suggestions">
                                        {categorySuggestions.map((cat) => (
                                            <option key={cat} value={cat} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, date: e.target.value })
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    placeholder="Optional notes or details"
                                    value={editForm.description}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, description: e.target.value })
                                    }
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setEditingExpense(null)}
                                    disabled={editLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="add-expense-btn"
                                    disabled={editLoading}
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================================
                DELETE CONFIRMATION MODAL
            ================================== */}
            {deletingExpense && (
                <div className="modal-overlay" onClick={() => setDeletingExpense(null)}>
                    <div className="modal-card modal-delete" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Delete Expense</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setDeletingExpense(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="delete-modal-body">
                            <div className="delete-warning-icon">⚠️</div>
                            <h3>Are you sure you want to delete this expense?</h3>
                            <p>This action cannot be undone.</p>

                            <div className="delete-details-card">
                                <strong>{deletingExpense.title}</strong>
                                <div className="delete-details-row">
                                    <span>Category: {deletingExpense.category}</span>
                                    <span className="text-danger">
                                        ₹{Number(deletingExpense.amount).toFixed(2)}
                                    </span>
                                </div>
                                <small>Date: {formatDate(deletingExpense.date)}</small>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setDeletingExpense(null)}
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                onClick={handleConfirmDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Deleting..." : "Yes, Delete Expense"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;