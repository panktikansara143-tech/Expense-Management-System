const express = require("express");

const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    changePassword
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);

module.exports = router;