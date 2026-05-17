const Notification = require('../models/Notification');

async function sendNotification(userId, type, message, projectId = null) {
  try {
    await Notification.create({ user: userId, type, message, project: projectId });
  } catch (err) {
    console.error('sendNotification error:', err.message);
  }
}

module.exports = sendNotification;
