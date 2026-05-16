const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const { validateTask, validateStatusUpdate } = require('../middleware/validation');

router.get('/project/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const tasks = await Task.find({ project: req.params.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find().populate('project', 'title').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, validateTask, async (req, res) => {
  try {
    const { title, description, priority, status, project } = req.body;
    const projectExists = await Project.findOne({ _id: project, owner: req.user.userId });
    if (!projectExists) return res.status(404).json({ message: 'Projet non trouvé' });
    const task = new Task({ title, description, priority, status, project });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, validateTask, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    if (task.project.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Accès refusé' });
    const { title, description, priority, status } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

router.patch('/:id/status', authMiddleware, validateStatusUpdate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    if (task.project.owner.toString() !== req.user.userId) return res.status(403).json({ message: 'Accès refusé' });
    task.status = req.body.status;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
