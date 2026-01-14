import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

@modelOptions({ schemaOptions: { _id: false } })
export class ClanMember {

  @Prop({ required: true })
  userID!: string;

  @Prop({ default: 0 })
  online!: number;

  @Prop({ default: 0 })
  voiceTime!: number;
  
  @Prop({ default: 'member' }) // 'owner', 'co-owner', 'member'
  role!: string;
}

@index({ owner: 1 }, { unique: false })
export class Clan extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  owner!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: () => [ClanMember], default: [] })
  users!: ClanMember[];

  @Prop({ default: 0 })
  balance!: number;

  @Prop({ default: Date.now })
  dateCreate!: Date;

  @Prop({ required: true })
  payDate!: Date;

  @Prop()
  avatarURL?: string;
  
  @Prop()
  description?: string;
  
  @Prop({ type: () => [String], default: [] })
  coOwners!: string[];

  @Prop()
  lastEmbedSentAt?: Date;

  @Prop()
  categoryId?: string;

  @Prop()
  textChannelId?: string;

  @Prop()
  generalVoiceChannelId?: string;

  @Prop()
  createVoiceChannelId?: string;
}

export const ClanModel = getModelForClass(Clan, {
  options: { customName: 'clan' },
});
