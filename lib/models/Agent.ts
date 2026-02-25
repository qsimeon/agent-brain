import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  name: string;
  description: string;
  apiKey: string;
  claimToken: string;
  claimStatus: 'pending_claim' | 'claimed';
  role: 'sensor' | 'actuator' | 'interneuron';
  ownerEmail?: string;
  metadata?: Record<string, any>;
  lastActive: Date;
}

const AgentSchema = new Schema<IAgent>({
  name: { type: String, required: true, unique: true, maxlength: 30 },
  description: { type: String, required: true, maxlength: 500 },
  apiKey: { type: String, required: true, unique: true },
  claimToken: { type: String, required: true, unique: true },
  claimStatus: { type: String, default: 'pending_claim', enum: ['pending_claim', 'claimed'] },
  role: { type: String, required: true, enum: ['sensor', 'actuator', 'interneuron'] },
  ownerEmail: String,
  metadata: { type: Schema.Types.Mixed, default: {} },
  lastActive: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      const { apiKey, __v, ...rest } = ret;
      return rest;
    },
  },
});

AgentSchema.index({ apiKey: 1 });
AgentSchema.index({ claimToken: 1 });
AgentSchema.index({ role: 1 });

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
