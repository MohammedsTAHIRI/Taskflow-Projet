const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  },
  priority: {
    type: String,
    enum: ['basse', 'moyenne', 'haute'],
    default: 'moyenne'
  },
  status: {
    type: String,
    enum: ['à faire', 'en cours', 'terminé'],
    default: 'à faire'
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
