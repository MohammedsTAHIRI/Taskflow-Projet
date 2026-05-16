const validateTask = (req, res, next) => {
  const { priority, status } = req.body;
  const validPriorities = ['basse', 'moyenne', 'haute'];
  const validStatuses = ['à faire', 'en cours', 'terminé'];

  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ message: 'Priorité invalide. Valeurs autorisées: basse, moyenne, haute' });
  }

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide. Valeurs autorisées: à faire, en cours, terminé' });
  }

  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['à faire', 'en cours', 'terminé'];

  if (!status) {
    return res.status(400).json({ message: 'Le champ status est requis' });
  }

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide. Valeurs autorisées: à faire, en cours, terminé' });
  }

  next();
};

module.exports = { validateTask, validateStatusUpdate };
