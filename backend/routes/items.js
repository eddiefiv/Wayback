
const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const requireRole = requireAuth.requireRole;

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
            WHERE deleted_at IS NULL
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

router.get("/mine", requireAuth, requireRole("community"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
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
                created_at,
                deleted_at
             FROM items
             WHERE posted_by = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching user's item submissions:", error.message);
        res.status(500).json({
            error: "Failed to retrieve your submissions."
        });
    }
});

router.get("/staff", requireAuth, requireRole("security_staff"), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                items.*,
                users.name AS poster_name,
                users.email AS poster_email
            FROM items
            JOIN users ON users.id = items.posted_by
            ORDER BY items.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching staff item listings:", error.message);
        res.status(500).json({
            error: "Failed to retrieve item listings."
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
            "SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL",
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


router.post("/", requireAuth, requireRole("community"), async (req, res) => {
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

router.patch("/:id", requireAuth, requireRole("security_staff"), async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body || {};
    const fieldMap = {
        title: "title",
        description: "description",
        item_type: "item_type",
        category: "category",
        color: "color",
        brand: "brand",
        location_text: "location_text",
        event_date: "event_date",
        status: "status"
    };
    const updates = Object.keys(fieldMap).filter((field) =>
        Object.prototype.hasOwnProperty.call(body, field)
    );

    if (!Number.isInteger(id) || id < 1 || updates.length === 0) {
        return res.status(400).json({
            error: "Provide a valid item ID and at least one editable item field."
        });
    }

    const maxLengths = {
        title: 150,
        description: null,
        category: 80,
        color: 60,
        brand: 100,
        location_text: 255
    };

    for (const field of updates) {
        const value = body[field];

        if (field === "item_type" && !["lost", "found"].includes(value)) {
            return res.status(400).json({ error: "Item type must be lost or found." });
        }

        if (field === "status" && !["open", "claimed", "returned", "closed"].includes(value)) {
            return res.status(400).json({ error: "Invalid item status." });
        }

        if (field === "event_date" && value !== null &&
            (typeof value !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
                Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) {
            return res.status(400).json({ error: "Event date must be a valid YYYY-MM-DD date or null." });
        }

        if (field === "description" || field === "title") {
            if (typeof value !== "string" || !value.trim() ||
                (maxLengths[field] && value.trim().length > maxLengths[field])) {
                return res.status(400).json({ error: `Invalid ${field}.` });
            }
        } else if (field in maxLengths && field !== "description") {
            if (value !== null &&
                (typeof value !== "string" || value.length > maxLengths[field])) {
                return res.status(400).json({ error: `Invalid ${field}.` });
            }
        }
    }

    const values = updates.map((field) =>
        typeof body[field] === "string" && ["title", "description"].includes(field)
            ? body[field].trim()
            : body[field]
    );
    values.push(id);
    const assignments = updates.map((field, index) =>
        `${fieldMap[field]} = $${index + 1}`
    );

    try {
        const result = await pool.query(
            `UPDATE items
             SET ${assignments.join(", ")}
             WHERE id = $${values.length} AND deleted_at IS NULL
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active item not found." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error editing item:", error.message);
        res.status(500).json({ error: "Failed to edit item." });
    }
});

router.delete("/:id", requireAuth, requireRole("security_staff"), async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: "Invalid item ID." });
    }

    try {
        const result = await pool.query(
            `UPDATE items
             SET deleted_at = NOW(), deleted_by = $1
             WHERE id = $2 AND deleted_at IS NULL
             RETURNING id`,
            [req.user.id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Active item not found." });
        }

        res.json({ message: "Item removed from public listings." });
    } catch (error) {
        console.error("Error removing item:", error.message);
        res.status(500).json({ error: "Failed to remove item." });
    }
});

module.exports = router;
