
const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

const router = express.Router();

// GET /api/items
// Retrieves the listings.
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                posted_by,
                item_type,
                title,
                description,
                category,
                color,
                brand,
                location_text,
                event_date,
                status,
                created_at
            FROM items
            ORDER BY created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching items:", error.message);
        res.status(500).json({
            error: "Failed to retrieve items."
        });
    }
});

// GET /api/items/:id
// Retrieve Listing with ID
router.get("/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            error: "Invalid item ID."
        });
    }

    try {
        const result = await pool.query(
            "SELECT * FROM items WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Item not found."
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching item:", error.message);
        res.status(500).json({
            error: "Failed to retrieve item."
        });
    }
});


router.post("/", requireAuth, async (req, res) => {
    console.log("POST");
    const { title, description, type, date, location } = req.body || {};

    if (
        typeof title !== "string" ||
        typeof description !== "string" ||
        typeof type !== "string" ||
        typeof date !== "string" ||
        typeof location !== "string" ||
        !title.trim() ||
        !description.trim() ||
        !location.trim() ||
        !["Lost", "Found"].includes(type) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    ) {
        return res.status(400).json({
            error: "Please provide valid item details."
        });
    }

    try {
        const result = await pool.query(
            `INSERT INTO items (
                posted_by,
                item_type,
                title,
                description,
                location_text,
                event_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.id,
                type.toLowerCase(),
                title.trim(),
                description.trim(),
                location.trim(),
                date
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating item:", error.message);
        res.status(500).json({
            error: "Failed to create item."
        });
    }
});



module.exports = router;
