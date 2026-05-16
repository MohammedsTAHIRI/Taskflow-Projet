const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const { validateTask, validateStatusUpdate } = require('../middleware/validation');

// GET /api/projects/:id/tasks — toutes les tâches d'un projet (avec populate assignedTo)
router.get('/project/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    // Vérifier que l'utilisateur est owner ou member
    const isOwner = project.owner.toString() === req.user.userId;
    const isMember = project.members.some(m => m.toString() === req.user.userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Accès refusé' });

    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks — tâches assignées à l'utilisateur connecté (dashboard)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.userId })
      .populate('project', 'title')
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks
router.post('/', authMiddleware, validateTask, async (req, res) => {
  try {
    const { title, description, priority, status, project, assignedTo } = req.body;

    const projectExists = await Project.findById(project);
    if (!projectExists) return res.status(404).json({ message: 'Projet non trouvé' });

    // Seul le owner peut créer des tâches
    if (projectExists.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul le créateur du projet peut créer des tâches' });
    }

    // Vérifier que assignedTo est bien un membre ou le owner
    if (assignedTo) {
      const isOwner = projectExists.owner.toString() === assignedTo;
      const isMember = projectExists.members.some(m => m.toString() === assignedTo);
      if (!isOwner && !isMember) {
        return res.status(400).json({ message: 'L\'utilisateur assigné n\'est pas membre du projet' });
      }
    }

    const task = new Task({ title, description, priority, status, project, assignedTo: assignedTo || null });
    await task.save();

    const populated = await task.populate('assignedTo', 'fullName email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', authMiddleware, validateTask, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });

    if (task.project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { title, description, priority, status, assignedTo } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;

    // Mise à jour de assignedTo avec vérification membre
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const isOwner = task.project.owner.toString() === assignedTo;
        const isMember = task.project.members.some(m => m.toString() === assignedTo);
        if (!isOwner && !isMember) {
          return res.status(400).json({ message: 'L\'utilisateur assigné n\'est pas membre du projet' });
        }
      }
      task.assignedTo = assignedTo || null;
    }

    await task.save();
    const populated = await task.populate('assignedTo', 'fullName email');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });

    if (task.project.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await task.deleteOne();
    res.json({ message: 'Tâche supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/status — mise à jour UNIQUEMENT du statut
router.patch('/:id/status', authMiddleware, validateStatusUpdate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });

    const isOwner = task.project.owner.toString() === req.user.userId;
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.userId;

    if (!isOwner && !isAssigned) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    task.status = req.body.status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
