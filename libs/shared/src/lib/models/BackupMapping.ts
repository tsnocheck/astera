import { Schema, model, Document } from 'mongoose';

export interface IPermissionOverwrite {
  id: string; // role ID or member ID
  type: 0 | 1; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

export interface IChannelMapping {
  sourceChannelId: string;
  targetChannelId: string;
  channelName: string;
  channelType: number;
  permissions: IPermissionOverwrite[];
}

export interface IRoleMapping {
  sourceRoleId: string;
  targetRoleId: string;
  roleName: string;
}

export interface IBackupMapping extends Document {
  sourceGuildId: string;
  targetGuildId: string;
  roles: IRoleMapping[];
  channels: IChannelMapping[];
  createdAt: Date;
  updatedAt: Date;
}

const PermissionOverwriteSchema = new Schema<IPermissionOverwrite>(
  {
    id: { type: String, required: true },
    type: { type: Number, required: true, enum: [0, 1] },
    allow: { type: String, required: true },
    deny: { type: String, required: true },
  },
  { _id: false }
);

const ChannelMappingSchema = new Schema<IChannelMapping>(
  {
    sourceChannelId: { type: String, required: true },
    targetChannelId: { type: String, required: true },
    channelName: { type: String, required: true },
    channelType: { type: Number, required: true },
    permissions: { type: [PermissionOverwriteSchema], default: [] },
  },
  { _id: false }
);

const RoleMappingSchema = new Schema<IRoleMapping>(
  {
    sourceRoleId: { type: String, required: true },
    targetRoleId: { type: String, required: true },
    roleName: { type: String, required: true },
  },
  { _id: false }
);

const BackupMappingSchema = new Schema<IBackupMapping>(
  {
    sourceGuildId: { type: String, required: true },
    targetGuildId: { type: String, required: true },
    roles: { type: [RoleMappingSchema], default: [] },
    channels: { type: [ChannelMappingSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Индекс для быстрого поиска по серверам
BackupMappingSchema.index({ sourceGuildId: 1, targetGuildId: 1 }, { unique: true });

export const BackupMappingModel = model<IBackupMapping>('BackupMapping', BackupMappingSchema);
