import {
  getModelForClass,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export class Private extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop()
  public name?: string;

  @Prop()
  public roomId?: string;

  @Prop({ required: true })
  public ownerId!: string;
}

export const PrivateModel = getModelForClass(Private, {
  options: { customName: 'privates' },
});
