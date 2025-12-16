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

@modelOptions({ schemaOptions: { _id: false } })
export class UserInventoryItem {
  @Prop({ ref: () => ItemModel.modelName, required: true })
  public item!: Ref<Item>;

  @Prop({ required: true, default: 1 })
  public quantity!: number;
}

@index({ discordID: 1 }, { unique: true })
export class User extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;
  @Prop({ required: true })
  discordID!: string;

  @Prop()
  lolzID?: string;

  @Prop({ default: 0 })
  coins!: number;

  @Prop({ default: 0 })
  xp!: number;

  @Prop({ default: false, required: true })
  verified!: boolean;

  @Prop({ default: null })
  timelyBonusClaimedAt!: Date | null;

  @Prop({ default: 0 })
  level!: number;

  @Prop({ default: 0 })
  online!: number;

  @Prop({ default: 0 })
  prestige!: number;

  @Prop({ type: () => [UserInventoryItem], default: [] })
  inventory!: UserInventoryItem[];
}

export const UserModel = getModelForClass(User, {
  options: { customName: 'users' },
});
