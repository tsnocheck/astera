import { getModelForClass, index, Prop } from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export enum PunishmentType {
  BAN = 'ban',
  MUTE = 'mute',
  WARN = 'warn',
}

@index({ userID: 1, moderatorID: 1 }, { unique: false })
export class Punishment extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;
  @Prop({ required: true })
  userID!: string;

  @Prop({ required: true })
  type!: PunishmentType;

  @Prop({ required: true })
  moderatorID!: string;

  @Prop({ default: 'N/A' })
  reason: string;

  @Prop()
  expiresAt?: Date;
}

export const PunishmentModel = getModelForClass(Punishment, {
  options: { customName: 'punishments' },
});
