const express = require('express');
const { requireAdmin } = require('../services/authMiddleware');
const {
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
} = require('../services/leadService');
const { isValidStatus } = require('../services/validators');

const router = express.Router();

router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getLeadStats();
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, error: 'Could not load stats.' });
  }
});

// GET /api/admin/leads?search=&status=&page=&pageSize=
router.get('/leads', async (req, res) => {
  try {
    const { search, status } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 25, 1), 100);

    const { leads, total } = await getLeads({ search, status, page, pageSize });
    return res.json({ success: true, leads, total, page, pageSize });
  } catch (err) {
    console.error('Get leads error:', err);
    return res.status(500).json({ success: false, error: 'Could not load leads.' });
  }
});

// GET /api/admin/leads/:id
router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });
    return res.json({ success: true, lead });
  } catch (err) {
    console.error('Get lead error:', err);
    return res.status(500).json({ success: false, error: 'Could not load lead.' });
  }
});

// PATCH /api/admin/leads/:id/status  { status }
router.patch('/leads/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!isValidStatus(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const lead = await updateLeadStatus(req.params.id, status);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found.' });
    return res.json({ success: true, lead });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: 'Could not update lead.' });
  }
});

// DELETE /api/admin/leads/:id
router.delete('/leads/:id', async (req, res) => {
  try {
    await deleteLead(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete lead error:', err);
    return res.status(500).json({ success: false, error: 'Could not delete lead.' });
  }
});

module.exports = router;
