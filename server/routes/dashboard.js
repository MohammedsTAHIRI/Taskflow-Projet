const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Dashboard — fonctionnalité 5 non implémentée dans cette version' });
});

module.exports = router;
