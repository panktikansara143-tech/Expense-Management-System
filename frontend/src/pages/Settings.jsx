import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Settings() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Profile form state
    const [nameInput, setNameInput] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState("");
    const [profileError, setProfileError] = useState("");

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: ""
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

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
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setNameInput(parsedUser.name || "");
            } catch (err) {
                console.error("Unable to read user information", err);
            }
        }

        fetchUserProfile();
    }, [navigate]);

    // Fetch user details (including createdAt date) from backend
    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const response = await API.get("/auth/profile");
            if (response.data?.user) {
                const updatedUser = response.data.user;
                setUser(updatedUser);
                setNameInput(updatedUser.name || "");
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
        } catch (err) {
            console.error("Error fetching user profile:", err);
            if (err.response?.status === 401) {
                handleLogout();
            }
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
    // UPDATE PROFILE (NAME)
    // ==========================================
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileSuccess("");
        setProfileError("");

        if (!nameInput.trim()) {
            setProfileError("Name cannot be empty");
            return;
        }

        try {
            setProfileLoading(true);

            const response = await API.put("/auth/profile", {
                name: nameInput.trim()
            });

            const updatedUser = response.data.user;
            setUser(updatedUser);
            setNameInput(updatedUser.name);

            // Update localStorage user data
            const existingLocalUser = JSON.parse(localStorage.getItem("user") || "{}");
            localStorage.setItem(
                "user",
                JSON.stringify({ ...existingLocalUser, name: updatedUser.name })
            );

            setProfileSuccess("Profile name updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            if (err.response?.status === 401) {
                handleLogout();
                return;
            }
            setProfileError(
                err.response?.data?.message || "Failed to update profile. Please try again."
            );
        } finally {
            setProfileLoading(false);
        }
    };

    // ==========================================
    // CHANGE PASSWORD
    // ==========================================
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordSuccess("");
        setPasswordError("");

        const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

        // Front-end validations
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError("All password fields are required");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters long");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPasswordError("New password and confirm password do not match");
            return;
        }

        try {
            setPasswordLoading(true);

            const response = await API.put("/auth/change-password", {
                currentPassword,
                newPassword,
                confirmNewPassword
            });

            setPasswordSuccess(response.data.message || "Password changed successfully!");
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmNewPassword: ""
            });
        } catch (err) {
            console.error("Error changing password:", err);
            if (err.response?.status === 401) {
                handleLogout();
                return;
            }
            setPasswordError(
                err.response?.data?.message || "Failed to change password. Please check current password."
            );
        } finally {
            setPasswordLoading(false);
        }
    };

    // Format date for Account Information
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
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

                    <button className="menu-item" onClick={() => navigate("/reports")}>
                        <span>◉</span>
                        Reports
                    </button>

                    <button className="menu-item" onClick={() => navigate("/budget")}>
                        <span>⊞</span>
                        Budget
                    </button>

                    <button className="menu-item active" onClick={() => navigate("/settings")}>
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
                        <h1>Account Settings</h1>
                        <p>Manage your profile, security, and account preferences</p>
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

                <div className="settings-container">
                    {/* ==================================
                        1. EDIT PROFILE SECTION
                    ================================== */}
                    <section className="settings-card">
                        <div className="settings-card-header">
                            <div>
                                <h2>Profile</h2>
                                <p>Update your personal information and public name</p>
                            </div>
                            <div className="profile-large-avatar">
                                {user?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                        </div>

                        {profileSuccess && (
                            <div className="alert alert-success">
                                <span>✓ {profileSuccess}</span>
                                <button onClick={() => setProfileSuccess("")}>✕</button>
                            </div>
                        )}

                        {profileError && (
                            <div className="alert alert-error">
                                <span>⚠️ {profileError}</span>
                                <button onClick={() => setProfileError("")}>✕</button>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="settings-form">
                            <div className="form-group">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Your Name"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    disabled
                                    value={user?.email || ""}
                                    className="input-disabled"
                                />
                                <small className="form-help-text">Email address cannot be changed.</small>
                            </div>

                            <div className="form-action-row">
                                <button
                                    type="submit"
                                    className="add-expense-btn"
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? "Saving Changes..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* ==================================
                        2. ACCOUNT INFORMATION SECTION
                    ================================== */}
                    <section className="settings-card">
                        <div className="settings-card-header">
                            <div>
                                <h2>Account Information</h2>
                                <p>Your registered account credentials and creation details</p>
                            </div>
                        </div>

                        <div className="account-info-grid">
                            <div className="account-info-item">
                                <span className="info-label">Full Name</span>
                                <strong>{user?.name || "N/A"}</strong>
                            </div>

                            <div className="account-info-item">
                                <span className="info-label">Email Address</span>
                                <strong>{user?.email || "N/A"}</strong>
                            </div>

                            <div className="account-info-item">
                                <span className="info-label">Account Created On</span>
                                <strong>{formatDate(user?.createdAt)}</strong>
                            </div>

                            <div className="account-info-item">
                                <span className="info-label">Account Status</span>
                                <span className="status-badge-active">● Active Member</span>
                            </div>
                        </div>
                    </section>

                    {/* ==================================
                        3. CHANGE PASSWORD SECTION
                    ================================== */}
                    <section className="settings-card">
                        <div className="settings-card-header">
                            <div>
                                <h2>Security & Password</h2>
                                <p>Ensure your account is using a strong, secure password</p>
                            </div>
                        </div>

                        {passwordSuccess && (
                            <div className="alert alert-success">
                                <span>✓ {passwordSuccess}</span>
                                <button onClick={() => setPasswordSuccess("")}>✕</button>
                            </div>
                        )}

                        {passwordError && (
                            <div className="alert alert-error">
                                <span>⚠️ {passwordError}</span>
                                <button onClick={() => setPasswordError("")}>✕</button>
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="settings-form">
                            <div className="form-group">
                                <label>Current Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter current password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            currentPassword: e.target.value
                                        })
                                    }
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        placeholder="Min 6 characters"
                                        value={passwordForm.newPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                newPassword: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        placeholder="Re-enter new password"
                                        value={passwordForm.confirmNewPassword}
                                        onChange={(e) =>
                                            setPasswordForm({
                                                ...passwordForm,
                                                confirmNewPassword: e.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="form-action-row">
                                <button
                                    type="submit"
                                    className="add-expense-btn"
                                    disabled={passwordLoading}
                                >
                                    {passwordLoading ? "Updating Password..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </section>

                    {/* ==================================
                        4. LOGOUT SECTION
                    ================================== */}
                    <section className="settings-card logout-card">
                        <div className="logout-card-content">
                            <div>
                                <h2>Session Management</h2>
                                <p>Sign out of your Expense Manager account on this device</p>
                            </div>

                            <button className="btn-danger-logout" onClick={handleLogout}>
                                🚪 Log Out of Account
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Settings;
