const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  priority: {
    type: String,
    required: true,
    enum: ['basse', 'moyenne', 'haute'],
    default: 'moyenne'
  },
  status: {
    type: String,
    required: true,
    enum: ['à faire', 'en cours', 'terminé'],
    default: 'à faire'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
