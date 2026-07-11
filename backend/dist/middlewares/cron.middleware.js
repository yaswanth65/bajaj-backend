"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateCron = void 0;
const authenticateCron = (req, res, next) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return res.status(500).json({
            message: "Cron secret is not configured on the server"
        });
    }
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const querySecret = req.query.secret;
    if (token === cronSecret || querySecret === cronSecret) {
        return next();
    }
    return res.status(401).json({
        message: "Unauthorized: Invalid cron secret key"
    });
};
exports.authenticateCron = authenticateCron;
