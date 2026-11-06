import mongoose from 'mongoose';

const ShortcutItemSchema = new mongoose.Schema({
  id: { type: String, required: true }, // Unique ID from extension
  label: { type: String, required: true },
  path: { type: String },
  frameOrigin: { type: String },
  scope: { type: String, enum: ['domain', 'path'], default: 'domain' },
  selector: { type: String, required: true, maxlength: 1000 },
  innerText: { type: String },
  shortcut: {
    key: { type: String, required: true },
    ctrl: { type: Boolean, default: false },
    shift: { type: Boolean, default: false },
    alt: { type: Boolean, default: false },
    meta: { type: Boolean, default: false },
  }
});

const CommunityPackSchema = new mongoose.Schema({
  domain: { type: String, required: true, index: true, maxlength: 253 },
  name: { type: String, required: true },
  authorId: { type: String, required: true, index: true }, // Google User ID
  authorEmail: { type: String, index: true },
  shortcuts: [ShortcutItemSchema],
  upvotes: { type: Number, default: 0 },
  upvotedBy: { type: [String], default: [] },
  downloads: { type: Number, default: 0 },
  downloadedBy: { type: [String], default: [] },
  reports: { type: Number, default: 0 },
  reportedBy: { type: [String], default: [] },
  createdAt: { type: Number, required: true },
}, { timestamps: true });

// Compound index to ensure a user has at most one pack per domain
CommunityPackSchema.index({ domain: 1, authorId: 1 }, { unique: true });

export default mongoose.models.CommunityPack || mongoose.model('CommunityPack', CommunityPackSchema);
