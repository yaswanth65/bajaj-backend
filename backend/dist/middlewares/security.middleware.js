"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = exports.rateLimitLogin = void 0;
// 1. IP-Based Login Rate Limiter (Max 5 attempts per 15 minutes)
const loginAttempts = new Map();
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const rateLimitLogin = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && record.resetTime > now) {
        if (record.count >= RATE_LIMIT_MAX) {
            return res.status(429).json({ message: "Too many login attempts. Try again in 15 minutes." });
        }
        record.count++;
    }
    else {
        loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }
    next();
};
exports.rateLimitLogin = rateLimitLogin;
// 2. Custom Security Headers (Helmet-equivalent)
const securityHeaders = (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "0");
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
};
exports.securityHeaders = securityHeaders;
