const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = { owner: req.user.userId };
    const [projects, total] = await Promise.all([
      Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(filter)
    ]);
    res.json({ data: projects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const tasks = await Task.find({ project: req.params.id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, deadline, status } = req.body;
    const project = new Project({ title, description, deadline, status, owner: req.user.userId });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const { title, description, deadline, status } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (deadline !== undefined) project.deadline = deadline;
    if (status !== undefined) project.status = status;
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    await project.deleteOne();
    res.json({ message: 'Projet et tâches supprimés avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
