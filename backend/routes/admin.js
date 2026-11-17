const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const requireRole = requireAuth.requireRole;

const router = express.Router();
const allowedRoles = ["community", "security_staff", "system_administrator"];

router.use(requireAuth, requireRole("system_administrator"));

router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, role, can_post, can_claim, created_at
             FROM users
             ORDER BY name, id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching users for administration:", error.message);
        res.status(500).json({ error: "Failed to retrieve users." });
    }
});

router.get("/users/:userId", async (req, res) => {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId < 1) {
        return res.status(404).json({ error: "User not found." });
    }

    try {
        const result = await pool.query(
            `SELECT id, name, email, role, can_post, can_claim, created_at
             FROM users
             WHERE id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching user for administration:", error.message);
        res.status(500).json({ error: "Failed to retrieve user." });
    }
});

router.patch("/users/:userId", async (req, res) => {
    const userId = Number(req.params.userId);
    const body = req.body || {};
    const fields = ["role", "can_post", "can_claim"].filter((field) =>
        Object.prototype.hasOwnProperty.call(body, field)
    );

    if (
        !Number.isInteger(userId) ||
        userId < 1 ||
        fields.length === 0 ||
        Object.keys(body).some((field) => !fields.includes(field)) ||
        (Object.prototype.hasOwnProperty.call(body, "role") &&
            !allowedRoles.includes(body.role)) ||
        (Object.prototype.hasOwnProperty.call(body, "can_post") &&
            typeof body.can_post !== "boolean") ||
        (Object.prototype.hasOwnProperty.call(body, "can_claim") &&
            typeof body.can_claim !== "boolean")
    ) {
        return res.status(400).json({
            error: "Provide a valid role and/or boolean posting and claiming permissions."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");
        const existing = await client.query(
            "SELECT id, role FROM users WHERE id = $1 FOR UPDATE",
            [userId]
        );
        const user = existing.rows[0];

        if (!user) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "User not found." });
        }

        if (
            userId === req.user.id &&
            Object.prototype.hasOwnProperty.call(body, "role") &&
            body.role !== "system_administrator"
        ) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "You cannot remove your own system administrator role."
            });
        }

        if (
            user.role === "system_administrator" &&
            body.role &&
            body.role !== "system_administrator"
        ) {
            await client.query("SELECT pg_advisory_xact_lock(74123)");
            const administrators = await client.query(
                "SELECT COUNT(*)::INTEGER AS count FROM users WHERE role = 'system_administrator'"
            );

            if (administrators.rows[0].count <= 1) {
                await client.query("ROLLBACK");
                return res.status(409).json({
                    error: "The last system administrator cannot be demoted."
                });
            }
        }

        const values = fields.map((field) => body[field]);
        values.push(userId);
        const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
        const result = await client.query(
            `UPDATE users
             SET ${assignments.join(", ")}
             WHERE id = $${values.length}
             RETURNING id, name, email, role, can_post, can_claim, created_at`,
            values
        );

        await client.query("COMMIT");
        res.json(result.rows[0]);
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("User permission rollback failed:", rollbackError.message);
            }
        }

        console.error("Error updating user permissions:", error.message);
        res.status(500).json({ error: "Failed to update user permissions." });
    } finally {
        client?.release();
    }
});

router.get("/reports", async (req, res) => {
    const { type } = req.query;

    if (!["lost", "found", "all"].includes(type)) {
        return res.status(400).json({
            error: "Select a report type: lost, found, or all."
        });
    }

    const values = type === "all" ? [] : [type];
    const whereClause = type === "all" ? "" : "WHERE item_type = $1";

    try {
        const result = await pool.query(
            `SELECT
                item_type,
                status,
                COALESCE(location_text, 'Not specified') AS location_text,
                COUNT(*)::INTEGER AS listing_count
             FROM items
             ${whereClause ? `${whereClause} AND deleted_at IS NULL` : "WHERE deleted_at IS NULL"}
             GROUP BY item_type, status, COALESCE(location_text, 'Not specified')
             ORDER BY item_type, status, location_text`,
            values
        );

        res.json({
            type,
            generated_at: new Date().toISOString(),
            rows: result.rows
        });
    } catch (error) {
        console.error("Error generating item report:", error.message);
        res.status(500).json({ error: "Failed to generate report." });
    }
});

module.exports = router;
