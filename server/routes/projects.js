const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

// GET /api/projects — pagination + filtre par owner
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { owner: req.user.userId };

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter)
    ]);

    res.json({
      data: projects,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/projects
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, deadline, status } = req.body;
    const project = new Project({
      title,
      description,
      deadline,
      status,
      owner: req.user.userId
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id, 
      owner: req.user.userId 
    });
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

// DELETE /api/projects/:id — déclenche le cascade delete via pre('deleteOne')
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id, 
      owner: req.user.userId 
    });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    await project.deleteOne(); // middleware pre('deleteOne') supprime les tâches
    res.json({ message: 'Projet et tâches associés supprimés avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
