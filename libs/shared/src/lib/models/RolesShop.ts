import {
  getModelForClass,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export class RolesShop extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  public owner!: string;

  @Prop({ required: true })
  public roleId!: string;

  @Prop({ required: true })
  public price!: number;

  @Prop({ default: 0 })
  public buiedNumber!: number;

  @Prop({ default: true })
  public isActive!: boolean;

  @Prop({ default: 0 })
  public totalEarnings!: number;

  @Prop()
  public extensionDate!: Date;

  @Prop({ default: false })
  public notificationSent!: boolean;
}

export const RolesShopModel = getModelForClass(RolesShop, {
  options: { customName: 'rolesShop' },
});