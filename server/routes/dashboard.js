const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    //les projets (owner ou member)
    const userProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id status');

    const projectIds = userProjects.map(p => p._id);
    const activeProjectIds = userProjects.filter(p => p.status === 'actif').map(p => p._id);

    const activeProjects = activeProjectIds.length;

    // 2+3+4: tâches assignées à l'utilisateur connecté uniquement
    const taskFilter = {
      project: { $in: projectIds },
      assignedTo: userId
    };

    const [assignedTasks, completedTasks, lateTasks] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: 'terminé' }),
      Task.countDocuments({
        ...taskFilter,
        status: { $ne: 'terminé' },
        dueDate: { $ne: null, $lt: new Date() }
      })
    ]);

    // 5. Tâches en cours — triées par priorité décroissante puis dueDate croissante
    const ongoingTasks = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          status: { $in: ['à faire', 'en cours'] },
          assignedTo: userId
        }
      },
      {
        $addFields: {
          priorityNum: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'haute'] }, then: 3 },
                { case: { $eq: ['$priority', 'moyenne'] }, then: 2 },
                { case: { $eq: ['$priority', 'basse'] }, then: 1 }
              ],
              default: 0
            }
          }
        }
      },
      {
        $addFields: {
          dueDateSorted: {
            $ifNull: ['$dueDate', new Date('9999-12-31')]
          }
        }
      },
      { $sort: { dueDateSorted: 1, priorityNum: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedToUser'
        }
      },
      {
        $unwind: { path: '$assignedToUser', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          title: 1,
          priority: 1,
          status: 1,
          dueDate: 1,
          'project._id': 1,
          'project.title': 1,
          'assignedToUser.fullName': 1,
          'assignedToUser.email': 1
        }
      }
    ]);

    res.json({
      metrics: { activeProjects, assignedTasks, completedTasks, lateTasks },
      ongoingTasks
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
