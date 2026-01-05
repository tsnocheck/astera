import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';
import { Item, ItemModel } from './Item';
import { RolesShop } from './RolesShop';

@index({ discordID: 1 }, { unique: true })
export class User extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;
  @Prop({ required: true })
  discordID!: string;

  @Prop({ default: 0 })
  coins!: number;

  @Prop({ default: 0 })
  xp!: number;

  @Prop({ default: null })
  timelyBonusClaimedAt!: Date | null;

  @Prop({ default: 1 })
  level!: number;

  @Prop({ default: 0 })
  online!: number;

  @Prop({ default: 0 })
  message!: number;

  @Prop({ type: () => [RolesShop], default: [] })
  roles!: RolesShop[];
}

export const UserModel = getModelForClass(User, {
  options: { customName: 'users' },
});
