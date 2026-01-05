import { Schema, model, Document } from 'mongoose';

export interface IBackupLog extends Document {
  guildId: string;
  targetGuildId: string;
  status: 'success' | 'failed' | 'in-progress';
  rolesCreated: number;
  categoriesCreated: number;
  channelsCreated: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  duration?: number;
}

const BackupLogSchema = new Schema<IBackupLog>(
  {
    guildId: {
      type: String,
      required: true,
    },
    targetGuildId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'in-progress'],
      default: 'in-progress',
    },
    rolesCreated: {
      type: Number,
      default: 0,
    },
    categoriesCreated: {
      type: Number,
      default: 0,
    },
    channelsCreated: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

export const BackupLogModel = model<IBackupLog>('BackupLog', BackupLogSchema);
