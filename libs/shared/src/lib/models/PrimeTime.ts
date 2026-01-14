import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

@index({ guild: 1, userId: 1 }, { unique: true })
export class PrimeTime extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  guild!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  startPrimeTime!: string;

  @Prop({ required: true })
  endPrimeTime!: string;
}

export const PrimeTimeModel = getModelForClass(PrimeTime, {
  options: { customName: 'primetimes' },
});
