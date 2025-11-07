import {
  getModelForClass,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';
import { Item, ItemModel } from './Item';
import { User } from 'discord.js';

@modelOptions({ schemaOptions: { _id: false } })

export class RoomUser extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  public roomId!: Types.ObjectId;

  @Prop({ required: true })
  public userId!: string;

  @Prop({ default: 0 })
  public online?: number;
}

export const RoomUserModel = getModelForClass(RoomUser, {
  options: { customName: 'roomUsers' },
});

export class Room extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true, unique: true })
  public name!: string;

  @Prop()
  public roomId?: string;

  @Prop({ required: true })
  public ownerId!: string;

  @Prop({
    ref: () => RoomUserModel.modelName,
    type: () => [Types.ObjectId],
    default: [],
  })
  public users!: Ref<RoomUser>[];

  @Prop({ default: [] })
  public coOwners!: string[];
}

export const RoomModel = getModelForClass(Room, {
  options: { customName: 'rooms' },
});
