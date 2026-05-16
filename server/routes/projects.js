const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// GET /api/projects — pagination + filtre par owner ou member
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Afficher les projets dont l'utilisateur est owner OU membre
    const filter = {
      $or: [
        { owner: req.user.userId },
        { members: req.user.userId }
      ]
    };

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate('owner', 'fullName email')
        .populate('members', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter)
    ]);

    res.json({ data: projects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id — détails d'un projet
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'fullName email')
      .populate('members', 'fullName email');
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const isOwner = project.owner._id.toString() === req.user.userId;
    const isMember = project.members.some(m => m._id.toString() === req.user.userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Accès refusé' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id/tasks
router.get('/:id/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

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

// POST /api/projects
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

// PUT /api/projects/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé ou accès refusé' });

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

// DELETE /api/projects/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé ou accès refusé' });

    await project.deleteOne();
    res.json({ message: 'Projet et tâches associés supprimés avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// Fonctionnalité 4 — Gestion des membres
// ============================================================

// POST /api/projects/:id/members — inviter un membre par email
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé ou accès refusé' });

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email requis' });

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) return res.status(404).json({ message: 'Aucun compte trouvé avec cet email' });

    // Ne pas ajouter le owner
    if (userToAdd._id.toString() === req.user.userId) {
      return res.status(400).json({ message: 'Vous êtes déjà le créateur du projet' });
    }

    // Éviter les doublons
    const alreadyMember = project.members.some(m => m.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'Cet utilisateur est déjà membre' });

    project.members.push(userToAdd._id);
    await project.save();

    res.json({ message: `${userToAdd.fullName} ajouté au projet`, member: { id: userToAdd._id, fullName: userToAdd.fullName, email: userToAdd.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/projects/:id/members/:memberId — retirer un membre
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.userId });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé ou accès refusé' });

    const memberIndex = project.members.findIndex(m => m.toString() === req.params.memberId);
    if (memberIndex === -1) return res.status(404).json({ message: 'Membre non trouvé dans ce projet' });

    project.members.splice(memberIndex, 1);
    await project.save();

    // Désassigner les tâches de ce membre dans ce projet
    await Task.updateMany(
      { project: project._id, assignedTo: req.params.memberId },
      { $set: { assignedTo: null } }
    );

    res.json({ message: 'Membre retiré du projet' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/projects/:id/members — liste des membres
router.get('/:id/members', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'fullName email')
      .populate('members', 'fullName email');
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });

    const isOwner = project.owner._id.toString() === req.user.userId;
    const isMember = project.members.some(m => m._id.toString() === req.user.userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Accès refusé' });

    // Retourner owner + membres pour le menu déroulant d'assignation
    const allMembers = [
      { _id: project.owner._id, fullName: project.owner.fullName, email: project.owner.email, role: 'owner' },
      ...project.members.map(m => ({ _id: m._id, fullName: m.fullName, email: m.email, role: 'member' }))
    ];

    res.json(allMembers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
