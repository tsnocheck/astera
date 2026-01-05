import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

@index({ user1: 1 }, { unique: false })
@index({ user2: 1 }, { unique: false })
export class Marry extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  user1!: string;

  @Prop({ required: true })
  user2!: string;

  @Prop({ required: true, default: Date.now })
  dateRegistered!: Date;

  @Prop({ default: 0 })
  balance!: number;

  @Prop({ default: 0 })
  online!: number

  @Prop({ required: true })
  paymentDate!: Date;

  @Prop({ default: false })
  notificationSent!: boolean;
}

export const MarryModel = getModelForClass(Marry, {
  options: { customName: 'marry' },
});
