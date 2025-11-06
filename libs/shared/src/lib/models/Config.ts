import { getModelForClass, Prop } from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';
import { PunishmentType } from './Punishments';

export class PunishmentsPenalty {
  @Prop({ required: true, enum: PunishmentType, unique: true })
  type!: PunishmentType;

  @Prop({ required: true, default: 0 })
  penalty!: number;
}

export class Config extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ type: () => [PunishmentsPenalty], default: [] })
  penalties!: PunishmentsPenalty[];
}

export const ConfigModel = getModelForClass(Config, {
  options: { customName: 'config' },
});
