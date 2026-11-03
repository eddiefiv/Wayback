
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const itemRoutes = require("./routes/items");
const authRoutes = require("./routes/auth");
const claimRoutes = require("./routes/claims");

const app = express();
const PORT = 3000;

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

// Item API routes
app.use("/api/items", itemRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/claims", claimRoutes);

// Test
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database"
        );

        res.json({
            message: "WayBack API is running!",
            database: result.rows[0].database
        });
    } catch (error) {
        console.error("Database connection failed:", error.message);

        res.status(500).json({
            error: "Could not connect to the database."
        });
    }
});

app.listen(PORT, () => {
    console.log(`WayBack API running at http://localhost:${PORT}`);
});
