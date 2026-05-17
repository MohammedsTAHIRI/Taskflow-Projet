const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/auth');

// GET /api/notifications — toutes les notifs de l'utilisateur
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/notifications/:id/read — marquer comme lue
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user.userId });
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    notif.read = true;
    await notif.save();
    res.json(notif);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
