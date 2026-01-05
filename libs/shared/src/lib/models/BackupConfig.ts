import { Schema, model, Document } from 'mongoose';

export interface IBackupConfig extends Document {
  guildId: string;
  targetGuildId: string;
  frequencyHours: number;
  logsChannelId: string;
  isEnabled: boolean;
  lastBackup?: Date;
  nextBackup?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BackupConfigSchema = new Schema<IBackupConfig>(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    targetGuildId: {
      type: String,
      required: true,
    },
    frequencyHours: {
      type: Number,
      required: true,
      default: 24,
      min: 1,
    },
    logsChannelId: {
      type: String,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    lastBackup: {
      type: Date,
    },
    nextBackup: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const BackupConfigModel = model<IBackupConfig>('BackupConfig', BackupConfigSchema);
