import mongoose, { Schema, Document } from 'mongoose';

export interface ISkill {
  name: string;
  description: string;
}

export interface IWebhookConfig {
  type: 'openclaw' | 'webhook';
  // OpenClaw: the gateway URL (e.g. https://xyz.ngrok.io) + hook token
  gatewayUrl?: string;
  hookToken?: string;
  agentId?: string;    // optional OpenClaw agentId if multi-agent setup
  // Generic webhook: any URL that accepts POST
  url?: string;
  secret?: string;     // optional Authorization secret for generic webhooks
}

export interface IAgent extends Document {
  name: string;
  description: string;
  apiKey: string;
  claimToken: string;
  claimStatus: 'pending_claim' | 'claimed';
  role: 'sensor' | 'actuator' | 'interneuron';
  ownerEmail?: string;
  metadata?: Record<string, any>;
  webhookConfig?: IWebhookConfig;
  skills: {
    sensing: ISkill[];
    acting: ISkill[];
  };
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
  skills: {
    type: {
      sensing: [{
        name: { type: String, required: true },
        description: { type: String, default: '' },
      }],
      acting: [{
        name: { type: String, required: true },
        description: { type: String, default: '' },
      }],
    },
    required: true,
  },
  webhookConfig: {
    type: { type: String, enum: ['openclaw', 'webhook'] },
    gatewayUrl: String,
    hookToken: String,
    agentId: String,
    url: String,
    secret: String,
  },
  lastActive: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      // Strip sensitive fields: apiKey, webhookConfig (contains tokens)
      const { apiKey, webhookConfig, __v, ...rest } = ret;
      return rest;
    },
  },
});

AgentSchema.index({ apiKey: 1 });
AgentSchema.index({ claimToken: 1 });
AgentSchema.index({ role: 1 });

export default mongoose.models.Agent || mongoose.model<IAgent>('Agent', AgentSchema);
