import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IArtifact extends Document {
  directiveId: Types.ObjectId;
  agentId: Types.ObjectId;
  type: 'image' | 'text' | 'link' | 'file';
  title: string;
  description?: string;
  url?: string;
  content?: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

const ArtifactSchema = new Schema<IArtifact>({
  directiveId: { type: Schema.Types.ObjectId, ref: 'Directive', required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true, enum: ['image', 'text', 'link', 'file'] },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  url: String,
  content: String,
  thumbnail: String,
  metadata: { type: Schema.Types.Mixed },
}, {
  timestamps: true,
});

ArtifactSchema.index({ agentId: 1 });
ArtifactSchema.index({ directiveId: 1 });
ArtifactSchema.index({ createdAt: -1 });

export default mongoose.models.Artifact || mongoose.model<IArtifact>('Artifact', ArtifactSchema);
