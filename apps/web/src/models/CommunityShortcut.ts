import mongoose from 'mongoose';

const CommunityShortcutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The unique ID from the extension
  label: { type: String, required: true },
  domain: { type: String, required: true, index: true },
  path: { type: String },
  scope: { type: String, enum: ['domain', 'path'], default: 'domain' },
  selector: { type: String, required: true },
  innerText: { type: String },
  shortcut: {
    key: { type: String, required: true },
    ctrl: { type: Boolean, default: false },
    shift: { type: Boolean, default: false },
    alt: { type: Boolean, default: false },
    meta: { type: Boolean, default: false },
  },
  authorId: { type: String, required: true, index: true }, // Google User ID
  authorEmail: { type: String, index: true }, // Email of the publisher
  upvotes: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.CommunityShortcut || mongoose.model('CommunityShortcut', CommunityShortcutSchema);
