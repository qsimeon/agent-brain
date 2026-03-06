import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBrainMemory {
  lastSignalSummary?: string;
  lastDirectivesSent?: Array<{ to: string; instructions: string; at: Date }>;
  focus?: string;
  notes?: string;
  updatedAt?: Date;
}

export interface IBrainState extends Document {
  currentInterneuronId: Types.ObjectId;
  rotationCount: number;
  lastRotationAt: Date;
  nextRotationAt: Date;
  memory: IBrainMemory;
  history: Array<{
    agentId: Types.ObjectId;
    startedAt: Date;
    endedAt?: Date;
  }>;
}

const BrainStateSchema = new Schema<IBrainState>({
  currentInterneuronId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  rotationCount: { type: Number, default: 0 },
  lastRotationAt: { type: Date, default: Date.now },
  nextRotationAt: { type: Date, required: true },
  memory: { type: Schema.Types.Mixed, default: {} },
  history: [{
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent' },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
  }],
}, { timestamps: true });

export default mongoose.models.BrainState || mongoose.model<IBrainState>('BrainState', BrainStateSchema);
