const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    const authorization = req.get("authorization");
    const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({
            error: "Authentication is required."
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("Authentication error: JWT_SECRET is not configured.");
        return res.status(500).json({
            error: "Authentication is unavailable."
        });
    }

    try {
        const payload = jwt.verify(match[1], process.env.JWT_SECRET);

        if (!payload || typeof payload !== "object") {
            return res.status(401).json({
                error: "Invalid or expired authentication token."
            });
        }

        const userId = Number(payload.sub);

        if (!Number.isInteger(userId) || userId < 1) {
            return res.status(401).json({
                error: "Invalid or expired authentication token."
            });
        }

        req.user = {
            id: userId,
            role: payload.role
        };
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                error: "Invalid or expired authentication token."
            });
        }

        next(error);
    }
}

module.exports = requireAuth;
