const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const { validateTask, validateStatusUpdate } = require('../middleware/validation');

// GET /api/tasks/project/:id — avec filtrage, recherche, pagination
router.get('/project/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const isOwner = project.owner.toString() === req.user.userId;
    const isMember = project.members.some(m => m.toString() === req.user.userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Accès refusé' });

    // Construction filtre conditionnel
    const filter = { project: req.params.id };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    res.json({ data: tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tasks — tâches de l'utilisateur connecté
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
    if (projectExists.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Seul le créateur peut créer des tâches' });
    }
    if (assignedTo) {
      const isOwner = projectExists.owner.toString() === assignedTo;
      const isMember = projectExists.members.some(m => m.toString() === assignedTo);
      if (!isOwner && !isMember) return res.status(400).json({ message: 'Utilisateur non membre du projet' });
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
    if (task.project.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Accès refusé' });
    const { title, description, priority, status, assignedTo } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const isOwner = task.project.owner.toString() === assignedTo;
        const isMember = task.project.members.some(m => m.toString() === assignedTo);
        if (!isOwner && !isMember) return res.status(400).json({ message: 'Utilisateur non membre du projet' });
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
    if (task.project.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Accès refusé' });
    await task.deleteOne();
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/tasks/:id/status
router.patch('/:id/status', authMiddleware, validateStatusUpdate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    const isOwner = task.project.owner.toString() === req.user.userId;
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.userId;
    if (!isOwner && !isAssigned) return res.status(403).json({ message: 'Accès refusé' });
    task.status = req.body.status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
