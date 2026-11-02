
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

// community account
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        password.length < 8 ||
        password.length > 128
    ) {
        return res.status(400).json({
            error: "Enter a name, valid email, and password of 8-128 characters."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({
            error: "Enter a valid email address."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role, created_at`,
            [name.trim(), normalizedEmail, passwordHash]
        );

        res.status(201).json({
            message: "Account created successfully.",
            user: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "An account with that email already exists."
            });
        }

        console.error("Registration error:", error.message);
        res.status(500).json({
            error: "Could not create account."
        });
    }
});

// Log in
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            error: "Email and password are required."
        });
    }

    try {
        const result = await pool.query(
            `SELECT id, name, email, password_hash, role
             FROM users
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (
            !user ||
            !(await bcrypt.compare(password, user.password_hash))
        ) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const token = jwt.sign(
            {
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                subject: String(user.id),
                expiresIn: "2h"
            }
        );

        res.json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({
            error: "Could not log in."
        });
    }
});

module.exports = router;
