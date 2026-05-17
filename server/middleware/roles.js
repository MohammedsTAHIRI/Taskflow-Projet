const Project = require('../models/Project');

// يتحقق أن المستخدم الحالي هو owner للمشروع
const requireOwner = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId || req.body.project;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    if (project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Action réservée au créateur du projet' });
    }
    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// يتحقق أن المستخدم هو owner أو member
const requireMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const isOwner = project.owner.toString() === req.user.userId;
    const isMember = project.members.some(m => m.toString() === req.user.userId);
    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'Accès refusé: vous n\'êtes pas membre de ce projet' });
    }
    req.project = project;
    req.isOwner = isOwner;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { requireOwner, requireMember };
