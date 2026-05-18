const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const { validateTask, validateStatusUpdate } = require('../middleware/validation');
const logActivity = require('../utils/logActivity');
const sendNotification = require('../utils/sendNotification');

router.get('/project/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const isOwner = project.owner.toString() === req.user.userId;
    const isMember = project.members.some(m => m.toString() === req.user.userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Accès refusé' });
    const filter = { project: req.params.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.search) filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const [tasks, total] = await Promise.all([
      Task.find(filter).populate('assignedTo', 'fullName email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Task.countDocuments(filter)
    ]);
    res.json({ data: tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.userId })
      .populate('project', 'title').populate('assignedTo', 'fullName email').sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — notification si tâche assignée (F10)
router.post('/', authMiddleware, validateTask, async (req, res) => {
  try {
    const { title, description, priority, status, project, assignedTo, dueDate } = req.body;
    const proj = await Project.findById(project);
    if (!proj) return res.status(404).json({ message: 'Projet non trouvé' });
    if (proj.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: 'Seul le créateur peut créer des tâches' });
    if (assignedTo) {
      const ok = proj.owner.toString() === assignedTo || proj.members.some(m => m.toString() === assignedTo);
      if (!ok) return res.status(400).json({ message: 'Utilisateur non membre du projet' });
    }
    const task = new Task({ title, description, priority, status, project, assignedTo: assignedTo || null, dueDate: dueDate || null });
    await task.save();
    await logActivity('task_created', project, req.user.userId, { taskTitle: title });

    // Notifier le membre assigné (F10)
    if (assignedTo && assignedTo !== req.user.userId) {
      await sendNotification(
        assignedTo,
        'task_assigned',
        `Une tâche vous a été assignée : "${title}"`,
        project
      );
    }

    res.status(201).json(await task.populate('assignedTo', 'fullName email'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, validateTask, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    if (task.project.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: 'Seul le créateur peut modifier les tâches' });
    const { title, description, priority, status, assignedTo } = req.body;
    const oldAssigned = task.assignedTo?.toString();
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    await task.save();

    // Notifier si assignation changée (F10)
    if (assignedTo && assignedTo !== oldAssigned && assignedTo !== req.user.userId) {
      await sendNotification(
        assignedTo,
        'task_assigned',
        `Une tâche vous a été assignée : "${task.title}"`,
        task.project._id
      );
    }

    res.json(await task.populate('assignedTo', 'fullName email'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    if (task.project.owner.toString() !== req.user.userId)
      return res.status(403).json({ message: 'Seul le créateur peut supprimer des tâches' });
    const projectId = task.project._id;
    const taskTitle = task.title;
    await task.deleteOne();
    await logActivity('task_deleted', projectId, req.user.userId, { taskTitle });
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH status — notification au membre (F10)
router.patch('/:id/status', authMiddleware, validateStatusUpdate, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Tâche non trouvée' });
    const isOwner = task.project.owner.toString() === req.user.userId;
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user.userId;
    if (!isOwner && !isAssigned)
      return res.status(403).json({ message: 'Vous ne pouvez modifier que le statut de vos tâches assignées' });
    const oldStatus = task.status;
    task.status = req.body.status;
    await task.save();
    await logActivity('task_status_changed', task.project._id, req.user.userId, {
      taskTitle: task.title, from: oldStatus, to: req.body.status
    });

    // Notifier le owner si c'est un membre qui change le statut (F10)
    if (!isOwner && task.assignedTo) {
      await sendNotification(
        task.project.owner,
        'status_changed',
        `Statut de "${task.title}" changé : ${oldStatus} → ${req.body.status}`,
        task.project._id
      );
    }

    res.json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
