const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // جلب كل مشاريع المستخدم (owner أو member)
    const userProjects = await Project.find({
      $or: [{ owner: userId }, { members: userId }]
    }).select('_id status');

    const projectIds = userProjects.map(p => p._id);
    const activeProjectIds = userProjects.filter(p => p.status === 'actif').map(p => p._id);

    // 1. عدد المشاريع النشطة
    const activeProjects = activeProjectIds.length;

    // 2+3+4: تاسكات تخص المستخدم — إما assignedTo هو، أو هو owner المشروع وما في أحد assigned
    const taskFilter = {
      project: { $in: projectIds },
      $or: [
        { assignedTo: userId },
        { assignedTo: null }
      ]
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

    // 5. تاسكات جارية — مرتبة بالأولوية ثم dueDate
    const ongoingTasks = await Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          status: { $in: ['à faire', 'en cours'] },
          $or: [{ assignedTo: userId }, { assignedTo: null }]
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
      { $sort: { priorityNum: -1, dueDate: 1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: 'project'
        }
      },
      { $unwind: { path: '$project', preserveNullAndEmpty: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedToUser'
        }
      },
      {
        $unwind: { path: '$assignedToUser', preserveNullAndEmpty: true }
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
