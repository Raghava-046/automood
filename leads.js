const express = require('express');
const rateLimit = require('express-rate-limit');
const { validateLeadInput } = require('../services/validators');
const { createLead } = require('../services/leadService');

const router = express.Router();

// Basic spam/abuse protection: cap submissions per IP.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

// POST /api/leads
router.post('/', submitLimiter, async (req, res) => {
  try {
    // Honeypot field: real users never fill this hidden input, bots often do.
    if (req.body.website_url) {
      // Silently pretend success so bots don't learn the honeypot exists.
      return res.status(201).json({ success: true, duplicate: false });
    }

    const { valid, errors, data } = validateLeadInput(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await createLead(data);

    if (result.duplicate) {
      return res.status(409).json({
        success: false,
        duplicate: true,
        message: "You're already on the AutoMood early-access list.",
      });
    }

    return res.status(201).json({ success: true, duplicate: false });
  } catch (err) {
    // Never leak DB internals to the client.
    console.error('Lead submission error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
