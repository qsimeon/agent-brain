import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISignal extends Document {
  fromAgentId: Types.ObjectId;
  type: string;
  payload: Record<string, any>;
  status: 'pending' | 'processed' | 'expired';
  processedByBrainId?: Types.ObjectId;
  createdAt: Date;
}

const SignalSchema = new Schema<ISignal>({
  fromAgentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'processed', 'expired'] },
  processedByBrainId: { type: Schema.Types.ObjectId, ref: 'Agent' },
}, { timestamps: true });

SignalSchema.index({ status: 1, createdAt: -1 });
SignalSchema.index({ fromAgentId: 1 });

export default mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema);
