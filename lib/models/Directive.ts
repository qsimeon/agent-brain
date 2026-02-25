import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDirective extends Document {
  fromBrainId: Types.ObjectId;
  toAgentId: Types.ObjectId;
  type: string;
  payload: Record<string, any>;
  status: 'pending' | 'accepted' | 'completed' | 'failed';
  result?: Record<string, any>;
  acceptedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

const DirectiveSchema = new Schema<IDirective>({
  fromBrainId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  toAgentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'accepted', 'completed', 'failed'] },
  result: { type: Schema.Types.Mixed },
  acceptedAt: Date,
  completedAt: Date,
}, { timestamps: true });

DirectiveSchema.index({ toAgentId: 1, status: 1 });
DirectiveSchema.index({ fromBrainId: 1 });

export default mongoose.models.Directive || mongoose.model<IDirective>('Directive', DirectiveSchema);
