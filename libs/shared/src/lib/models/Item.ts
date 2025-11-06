import { getModelForClass, index, Prop } from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export enum ItemType {
  ROLE = 'role',
  CUSTOM_ROOM = 'custom_room',
  DISCORD_NITRO = 'discord_nitro',
}

@index({ name: 1 }, { unique: true })
export class Item extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, enum: ItemType })
  type!: ItemType;

  @Prop({ required: false })
  roleID?: string;
}

export const ItemModel = getModelForClass(Item, {
  options: { customName: 'items' },
});
