const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { requireOwner, requireMember } = require('../middleware/roles');
const logActivity = require('../utils/logActivity');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = { $or: [{ owner: req.user.userId }, { members: req.user.userId }] };
    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('owner', 'fullName email')
        .populate('members', 'fullName email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Project.countDocuments(filter)
    ]);
    res.json({ data: projects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, requireMember, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'fullName email')
      .populate('members', 'fullName email');
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/tasks', authMiddleware, requireMember, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignedTo', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, deadline, status } = req.body;
    const project = new Project({ title, description, deadline, status, owner: req.user.userId, members: [] });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — enregistre project_updated (F9)
router.put('/:id', authMiddleware, requireOwner, async (req, res) => {
  try {
    const project = req.project;
    const { title, description, deadline, status } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (deadline !== undefined) project.deadline = deadline;
    if (status !== undefined) project.status = status;
    await project.save();

    await logActivity('project_updated', project._id, req.user.userId, { projectTitle: project.title });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, requireOwner, async (req, res) => {
  try {
    await req.project.deleteOne();
    res.json({ message: 'Projet et tâches associés supprimés avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---- Membres ----

router.get('/:id/members', authMiddleware, requireMember, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'fullName email')
      .populate('members', 'fullName email');
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    const allMembers = [
      { _id: project.owner._id, fullName: project.owner.fullName, email: project.owner.email, role: 'owner' },
      ...project.members.map(m => ({ _id: m._id, fullName: m.fullName, email: m.email, role: 'member' }))
    ];
    res.json(allMembers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST membre — enregistre member_added (F9)
router.post('/:id/members', authMiddleware, requireOwner, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requis' });
    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) return res.status(404).json({ message: 'Aucun compte trouvé avec cet email' });
    if (userToAdd._id.toString() === req.user.userId)
      return res.status(400).json({ message: 'Vous êtes déjà le créateur du projet' });
    const project = req.project;
    if (project.members.some(m => m.toString() === userToAdd._id.toString()))
      return res.status(400).json({ message: 'Cet utilisateur est déjà membre' });
    project.members.push(userToAdd._id);
    await project.save();

    await logActivity('member_added', project._id, req.user.userId, {
      memberName: userToAdd.fullName,
      memberEmail: userToAdd.email
    });

    res.json({ message: `${userToAdd.fullName} ajouté au projet`, member: { _id: userToAdd._id, fullName: userToAdd.fullName, email: userToAdd.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE membre — enregistre member_removed (F9)
router.delete('/:id/members/:memberId', authMiddleware, requireOwner, async (req, res) => {
  try {
    const project = req.project;
    const idx = project.members.findIndex(m => m.toString() === req.params.memberId);
    if (idx === -1) return res.status(404).json({ message: 'Membre non trouvé dans ce projet' });

    const removedId = project.members[idx];
    const removedUser = await User.findById(removedId).select('fullName email');
    project.members.splice(idx, 1);
    await project.save();

    await Task.updateMany(
      { project: project._id, assignedTo: removedId },
      { $set: { assignedTo: null } }
    );

    await logActivity('member_removed', project._id, req.user.userId, {
      memberName: removedUser?.fullName,
      memberEmail: removedUser?.email
    });

    res.json({ message: 'Membre retiré du projet' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
