const express = require("express");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");
const requireRole = requireAuth.requireRole;

const router = express.Router();

router.get("/mine", requireAuth, requireRole("community"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                claims.id,
                claims.item_id,
                claims.explanation,
                claims.status,
                claims.admin_notes,
                claims.created_at,
                claims.reviewed_at,
                items.title AS item_title,
                items.item_type,
                items.location_text,
                items.event_date,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'file_path', claim_evidence.file_path,
                                'description', claim_evidence.description
                            )
                            ORDER BY claim_evidence.id
                        )
                        FROM claim_evidence
                        WHERE claim_evidence.claim_id = claims.id
                    ),
                    '[]'::json
                ) AS evidence
             FROM claims
             JOIN items ON items.id = claims.item_id
             WHERE claims.claimant_id = $1
             ORDER BY claims.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching user claims:", error.message);
        res.status(500).json({
            error: "Failed to retrieve claims."
        });
    }
});

router.get("/review", requireAuth, requireRole("security_staff"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                claims.id,
                claims.item_id,
                claims.claimant_id,
                claims.explanation,
                claims.status,
                claims.admin_notes,
                claims.created_at,
                claims.reviewed_at,
                claimant.name AS claimant_name,
                claimant.email AS claimant_email,
                items.title AS item_title,
                items.item_type,
                items.location_text,
                items.event_date,
                items.status AS item_status,
                items.deleted_at AS item_deleted_at,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'file_path', claim_evidence.file_path,
                                'description', claim_evidence.description
                            )
                            ORDER BY claim_evidence.id
                        )
                        FROM claim_evidence
                        WHERE claim_evidence.claim_id = claims.id
                    ),
                    '[]'::json
                ) AS evidence
             FROM claims
             JOIN users AS claimant ON claimant.id = claims.claimant_id
             JOIN items ON items.id = claims.item_id
             ORDER BY
                CASE WHEN claims.status = 'pending' THEN 0 ELSE 1 END,
                claims.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching claims for review:", error.message);
        res.status(500).json({ error: "Failed to retrieve claims for review." });
    }
});

router.patch("/:claimId/review", requireAuth, requireRole("security_staff"), async (req, res) => {
    const claimId = Number(req.params.claimId);
    const { status, admin_notes: adminNotes = null } = req.body || {};

    if (
        !Number.isInteger(claimId) ||
        claimId < 1 ||
        !["approved", "rejected"].includes(status) ||
        (adminNotes !== null &&
            (typeof adminNotes !== "string" || adminNotes.trim().length > 2000))
    ) {
        return res.status(400).json({
            error: "Provide a valid claim ID, an approved/rejected status, and optional review notes up to 2,000 characters."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const claimResult = await client.query(
            `SELECT id, item_id, status
             FROM claims
             WHERE id = $1`,
            [claimId]
        );
        let claim = claimResult.rows[0];

        if (!claim) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Claim not found." });
        }

        if (claim.status !== "pending") {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "This claim has already been reviewed." });
        }

        const itemResult = await client.query(
            `SELECT id, item_type, status, deleted_at
             FROM items
             WHERE id = $1
             FOR UPDATE`,
            [claim.item_id]
        );
        const item = itemResult.rows[0];

        const lockedClaimResult = await client.query(
            `SELECT id, item_id, status
             FROM claims
             WHERE id = $1
             FOR UPDATE`,
            [claimId]
        );
        claim = lockedClaimResult.rows[0];

        if (claim.status !== "pending") {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: "This claim has already been reviewed." });
        }

        if (
            status === "approved" &&
            (!item || item.item_type !== "found" || item.status !== "open" || item.deleted_at)
        ) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "Only an active, open found item can have a claim approved."
            });
        }

        const reviewed = await client.query(
            `UPDATE claims
             SET status = $1,
                 admin_notes = $2,
                 reviewed_by = $3,
                 reviewed_at = NOW()
             WHERE id = $4
             RETURNING id, item_id, claimant_id, status, admin_notes, reviewed_by, reviewed_at`,
            [status, adminNotes?.trim() || null, req.user.id, claimId]
        );

        if (status === "approved") {
            await client.query(
                "UPDATE items SET status = 'claimed' WHERE id = $1",
                [claim.item_id]
            );
            await client.query(
                `UPDATE claims
                 SET status = 'rejected',
                     admin_notes = 'Another claim for this item was approved.',
                     reviewed_by = $2,
                     reviewed_at = NOW()
                 WHERE item_id = $1 AND id <> $3 AND status = 'pending'`,
                [claim.item_id, req.user.id, claimId]
            );
        }

        await client.query("COMMIT");
        res.json(reviewed.rows[0]);
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Claim review rollback failed:", rollbackError.message);
            }
        }

        console.error("Error reviewing claim:", error.message);
        res.status(500).json({ error: "Failed to review claim." });
    } finally {
        client?.release();
    }
});

router.post("/:itemId", requireAuth, requireRole("community"), async (req, res) => {
    const itemId = Number(req.params.itemId);
    const { explanation, evidence } = req.body || {};

    if (
        !Number.isInteger(itemId) ||
        itemId < 1 ||
        typeof explanation !== "string" ||
        !explanation.trim() ||
        explanation.trim().length > 2000 ||
        !Array.isArray(evidence) ||
        evidence.length < 1 ||
        evidence.length > 10 ||
        evidence.some((entry) => {
            if (
                !entry ||
                typeof entry.file_path !== "string" ||
                !entry.file_path.trim() ||
                entry.file_path.trim().length > 2048 ||
                (entry.description !== undefined &&
                    (typeof entry.description !== "string" ||
                        entry.description.length > 500))
            ) {
                return true;
            }

            try {
                return new URL(entry.file_path).protocol !== "https:";
            } catch {
                return true;
            }
        })
    ) {
        return res.status(400).json({
            error: "Provide an explanation and 1-10 HTTPS cloud-file links. Each description must be 500 characters or fewer."
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const itemResult = await client.query(
            `SELECT id, posted_by, item_type, status, deleted_at
             FROM items
             WHERE id = $1
             FOR UPDATE`,
            [itemId]
        );
        const item = itemResult.rows[0];

        if (!item) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Item not found."
            });
        }

        if (item.item_type !== "found" || item.status !== "open" || item.deleted_at) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "This item is not available to claim."
            });
        }

        if (Number(item.posted_by) === req.user.id) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                error: "You cannot claim an item that you posted."
            });
        }

        const existingClaim = await client.query(
            `SELECT id
             FROM claims
             WHERE item_id = $1 AND claimant_id = $2 AND status = 'pending'`,
            [itemId, req.user.id]
        );

        if (existingClaim.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                error: "You already have a pending claim for this item."
            });
        }

        const claimResult = await client.query(
            `INSERT INTO claims (item_id, claimant_id, explanation)
             VALUES ($1, $2, $3)
             RETURNING id, item_id, claimant_id, explanation, status, created_at`,
            [itemId, req.user.id, explanation.trim()]
        );
        const claim = claimResult.rows[0];

        for (const entry of evidence) {
            await client.query(
                `INSERT INTO claim_evidence (claim_id, file_path, description)
                 VALUES ($1, $2, $3)`,
                [
                    claim.id,
                    entry.file_path.trim(),
                    entry.description?.trim() || null
                ]
            );
        }

        await client.query("COMMIT");
        res.status(201).json({
            message: "Claim submitted successfully.",
            claim,
            evidence: evidence.map((entry) => ({
                file_path: entry.file_path.trim(),
                description: entry.description?.trim() || null
            }))
        });
    } catch (error) {
        if (client) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Claim transaction rollback failed:", rollbackError.message);
            }
        }

        console.error("Error submitting claim:", error.message);
        res.status(500).json({
            error: "Failed to submit claim."
        });
    } finally {
        client?.release();
    }
});

module.exports = router;
