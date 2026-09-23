const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const visitorPassSchema = new mongoose.Schema(
  {
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visitor',
      required: true,
    },
    passCode: {
      type: String,
      unique: true,
      default: () => `VIS-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    qrPayload: {
      type: String, // JSON string encoded in QR
    },
    qrCodeDataUrl: {
      type: String, // base64 PNG of the QR code
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'USED', 'EXPIRED', 'REVOKED'],
      default: 'ACTIVE',
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scannedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

visitorPassSchema.index({ visitorId: 1 });
visitorPassSchema.index({ validUntil: 1 });

module.exports = mongoose.model('VisitorPass', visitorPassSchema);
