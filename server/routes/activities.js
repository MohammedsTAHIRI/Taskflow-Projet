const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const { requireMember } = require('../middleware/roles');

// GET /api/projects/:id/activities — fil chronologique
router.get('/projects/:id/activities', authMiddleware, requireMember, async (req, res) => {
  try {
    const activities = await Activity.find({ project: req.params.id })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
