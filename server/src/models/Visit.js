const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visitor',
      required: true,
    },
    passId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisitorPass',
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    durationMinutes: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

visitSchema.index({ visitorId: 1 });
visitSchema.index({ checkInTime: -1 });

module.exports = mongoose.model('Visit', visitSchema);
