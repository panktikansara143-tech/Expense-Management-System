import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from "recharts";

function Reports() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState("all");

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

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await API.get("/expenses?all=true");
            setExpenses(response.data.expenses || []);
        } catch (err) {
            console.error("Error fetching expenses:", err);

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }

            setError(err.response?.data?.message || "Failed to fetch reports data");
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
    // DATE FORMATTER
    // ==========================================
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    // ==========================================
    // TIME RANGE FILTER LOGIC
    // ==========================================
    const filteredExpenses = useMemo(() => {
        if (timeRange === "all") return expenses;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        return expenses.filter((exp) => {
            const expDate = new Date(exp.date);
            if (isNaN(expDate.getTime())) return false;

            const expYear = expDate.getFullYear();
            const expMonth = expDate.getMonth();

            if (timeRange === "this_month") {
                return expYear === currentYear && expMonth === currentMonth;
            }

            if (timeRange === "last_month") {
                const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                return expYear === targetYear && expMonth === targetMonth;
            }

            if (timeRange === "last_3_months") {
                const threeMonthsAgo = new Date(now);
                threeMonthsAgo.setMonth(now.getMonth() - 3);
                threeMonthsAgo.setHours(0, 0, 0, 0);
                return expDate >= threeMonthsAgo && expDate <= now;
            }

            if (timeRange === "this_year") {
                return expYear === currentYear;
            }

            return true;
        });
    }, [expenses, timeRange]);

    // ==========================================
    // SUMMARY METRICS
    // ==========================================
    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    }, [filteredExpenses]);

    const totalTransactions = filteredExpenses.length;

    const averageExpense = useMemo(() => {
        return totalTransactions > 0 ? totalExpenses / totalTransactions : 0;
    }, [totalExpenses, totalTransactions]);

    const highestExpense = useMemo(() => {
        if (totalTransactions === 0) return 0;
        return Math.max(...filteredExpenses.map((e) => Number(e.amount || 0)));
    }, [filteredExpenses, totalTransactions]);

    // ==========================================
    // CATEGORY ANALYSIS
    // ==========================================
    const categoryData = useMemo(() => {
        const map = {};
        filteredExpenses.forEach((exp) => {
            const cat = exp.category?.trim() || "Other";
            map[cat] = (map[cat] || 0) + Number(exp.amount || 0);
        });

        const total = Object.values(map).reduce((a, b) => a + b, 0);

        const colorPalette = [
            "#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
            "#EC4899", "#06B6D4", "#64748B", "#F97316", "#14B8A6"
        ];

        return Object.keys(map)
            .map((cat, idx) => ({
                name: cat,
                value: map[cat],
                percentage: total > 0 ? Number(((map[cat] / total) * 100).toFixed(1)) : 0,
                color: colorPalette[idx % colorPalette.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [filteredExpenses]);

    // ==========================================
    // MONTHLY EXPENSE ANALYSIS
    // ==========================================
    const monthlyData = useMemo(() => {
        const map = {};
        const sorted = [...filteredExpenses].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        sorted.forEach((exp) => {
            const d = new Date(exp.date);
            if (!isNaN(d.getTime())) {
                const monthKey = d.toLocaleDateString("en-US", {
                    month: "short",
                    year: "2-digit"
                });
                map[monthKey] = (map[monthKey] || 0) + Number(exp.amount || 0);
            }
        });

        return Object.keys(map).map((month) => ({
            month,
            amount: map[month]
        }));
    }, [filteredExpenses]);

    // ==========================================
    // TOP EXPENSES (Highest 5)
    // ==========================================
    const topExpenses = useMemo(() => {
        return [...filteredExpenses]
            .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
            .slice(0, 5);
    }, [filteredExpenses]);

    // ==========================================
    // RECENT EXPENSES (Latest 5)
    // ==========================================
    const recentExpenses = useMemo(() => {
        return [...filteredExpenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
    }, [filteredExpenses]);

    // Custom Tooltip for Category Donut Chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="chart-tooltip">
                    <strong>{data.name}</strong>
                    <p>Amount: ₹{data.value.toFixed(2)}</p>
                    <small>Share: {data.percentage}%</small>
                </div>
            );
        }
        return null;
    };

    // Custom Tooltip for Monthly Bar Chart
    const CustomBarTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="chart-tooltip">
                    <strong>{label}</strong>
                    <p className="text-primary">Total: ₹{payload[0].value.toFixed(2)}</p>
                </div>
            );
        }
        return null;
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

                    <button className="menu-item" onClick={() => navigate("/transactions")}>
                        <span>↔</span>
                        Transactions
                    </button>

                    <button className="menu-item active" onClick={() => navigate("/reports")}>
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
                        <h1>Reports & Analytics</h1>
                        <p>Comprehensive overview and breakdown of your spending</p>
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

                {/* ==================================
                    FILTER BAR & HEADER
                ================================== */}
                <div className="reports-filter-header">
                    <div className="filter-title-group">
                        <h2>Spending Summary</h2>
                        <p>Real-time analysis derived from your recorded expenses</p>
                    </div>

                    <div className="time-range-selector">
                        <label>Filter Period:</label>
                        <select
                            className="filter-select"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="last_3_months">Last 3 Months</option>
                            <option value="this_year">This Year</option>
                        </select>
                    </div>
                </div>

                {/* ERROR STATE */}
                {error && !loading && (
                    <div className="alert alert-error">
                        <span>⚠️ {error}</span>
                        <button onClick={fetchExpenses}>Retry</button>
                    </div>
                )}

                {/* LOADING STATE */}
                {loading && (
                    <div className="reports-loading-box">
                        <div className="loading-spinner"></div>
                        <h3>Generating Reports...</h3>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* ==================================
                            1. SUMMARY CARDS
                        ================================== */}
                        <section className="reports-summary-grid">
                            {/* TOTAL EXPENSES */}
                            <div className="summary-card">
                                <div className="summary-icon">₹</div>
                                <div>
                                    <p>Total Expenses</p>
                                    <h2>₹{totalExpenses.toFixed(2)}</h2>
                                    <span className="summary-label">
                                        {timeRange === "all" ? "Lifetime Total" : "Filtered Total"}
                                    </span>
                                </div>
                            </div>

                            {/* TRANSACTIONS COUNT */}
                            <div className="summary-card">
                                <div className="summary-icon">📊</div>
                                <div>
                                    <p>Number of Transactions</p>
                                    <h2>{totalTransactions}</h2>
                                    <span className="summary-label">Recorded Purchases</span>
                                </div>
                            </div>

                            {/* AVERAGE EXPENSE */}
                            <div className="summary-card">
                                <div className="summary-icon">⚖️</div>
                                <div>
                                    <p>Average Expense</p>
                                    <h2>₹{averageExpense.toFixed(2)}</h2>
                                    <span className="summary-label">Per Transaction</span>
                                </div>
                            </div>

                            {/* HIGHEST EXPENSE */}
                            <div className="summary-card">
                                <div className="summary-icon">🏆</div>
                                <div>
                                    <p>Highest Expense</p>
                                    <h2>₹{highestExpense.toFixed(2)}</h2>
                                    <span className="summary-label">Single Peak Expense</span>
                                </div>
                            </div>
                        </section>

                        {/* EMPTY STATE IF 0 TRANSACTIONS */}
                        {totalTransactions === 0 ? (
                            <div className="transaction-empty" style={{ background: "white", borderRadius: "14px", border: "1px solid #e5e7eb" }}>
                                <div className="empty-icon">📈</div>
                                <h3>No expense data available</h3>
                                <p>
                                    {expenses.length === 0
                                        ? "You haven't recorded any expenses yet."
                                        : "No expenses match the selected time filter."}
                                </p>
                                <button className="add-expense-btn" onClick={() => navigate("/dashboard")}>
                                    Add Expense
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* ==================================
                                    2 & 3. CHARTS GRID (CATEGORY & MONTHLY)
                                ================================== */}
                                <section className="reports-charts-grid">
                                    {/* CATEGORY ANALYSIS CHART & BREAKDOWN */}
                                    <div className="report-card">
                                        <div className="card-header">
                                            <h3>Category Analysis</h3>
                                            <small>Expense distribution by category</small>
                                        </div>

                                        <div className="pie-chart-wrapper">
                                            <ResponsiveContainer width="100%" height={240}>
                                                <PieChart>
                                                    <Pie
                                                        data={categoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={85}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {categoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomPieTooltip />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* CATEGORY LIST BREAKDOWN */}
                                        <div className="category-breakdown-list">
                                            {categoryData.map((item) => (
                                                <div key={item.name} className="category-breakdown-item">
                                                    <div className="category-item-header">
                                                        <div className="category-name-group">
                                                            <span
                                                                className="category-color-dot"
                                                                style={{ backgroundColor: item.color }}
                                                            ></span>
                                                            <strong>{item.name}</strong>
                                                        </div>
                                                        <div className="category-amount-group">
                                                            <strong>₹{item.value.toFixed(2)}</strong>
                                                            <span className="category-percentage-badge">
                                                                {item.percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="category-progress-bar">
                                                        <div
                                                            className="category-progress-fill"
                                                            style={{
                                                                width: `${item.percentage}%`,
                                                                backgroundColor: item.color
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* MONTHLY EXPENSE BAR CHART */}
                                    <div className="report-card">
                                        <div className="card-header">
                                            <h3>Monthly Expense Analysis</h3>
                                            <small>Spending trend over time</small>
                                        </div>

                                        {monthlyData.length === 0 ? (
                                            <div className="no-data-placeholder">
                                                <p>No monthly timeline data for this filter period.</p>
                                            </div>
                                        ) : (
                                            <div className="bar-chart-wrapper">
                                                <ResponsiveContainer width="100%" height={320}>
                                                    <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                                        <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} />
                                                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                                                        <Tooltip content={<CustomBarTooltip />} />
                                                        <Bar dataKey="amount" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={45} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* ==================================
                                    4 & 5. TOP EXPENSES & RECENT EXPENSES
                                ================================== */}
                                <section className="reports-tables-grid">
                                    {/* TOP EXPENSES */}
                                    <div className="report-card">
                                        <div className="card-header">
                                            <h3>Highest Expenses</h3>
                                            <small>Top 5 largest transactions</small>
                                        </div>

                                        <div className="reports-list">
                                            {topExpenses.map((exp, idx) => (
                                                <div key={exp._id} className="report-list-item">
                                                    <div className="rank-badge">#{idx + 1}</div>
                                                    <div className="report-item-info">
                                                        <strong>{exp.title}</strong>
                                                        <small>{formatDate(exp.date)}</small>
                                                    </div>
                                                    <span className="category-badge">{exp.category}</span>
                                                    <strong className="expense-amount">
                                                        ₹{Number(exp.amount).toFixed(2)}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* RECENT EXPENSES */}
                                    <div className="report-card">
                                        <div className="card-header">
                                            <h3>Recent Expenses</h3>
                                            <small>Latest 5 transactions recorded</small>
                                        </div>

                                        <div className="reports-list">
                                            {recentExpenses.map((exp) => (
                                                <div key={exp._id} className="report-list-item">
                                                    <div className="expense-icon">
                                                        {exp.category?.charAt(0).toUpperCase() || "E"}
                                                    </div>
                                                    <div className="report-item-info">
                                                        <strong>{exp.title}</strong>
                                                        <small>{formatDate(exp.date)}</small>
                                                    </div>
                                                    <span className="category-badge">{exp.category}</span>
                                                    <strong className="expense-amount">
                                                        ₹{Number(exp.amount).toFixed(2)}
                                                    </strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default Reports;