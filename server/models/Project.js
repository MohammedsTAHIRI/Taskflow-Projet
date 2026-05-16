const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  deadline: { type: Date },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['actif', 'en pause', 'archivé'],
    default: 'actif'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Cascade delete: supprime les tâches liées avant suppression du projet
projectSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  await mongoose.model('Task').deleteMany({ project: this._id });
  next();
});

module.exports = mongoose.model('Project', projectSchema);
