import {
  getModelForClass,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export class VerifRoles extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  public roleId!: string;

  @Prop({ required: true })
  public groupId!: number;
}

export const VerifRolesModel = getModelForClass(VerifRoles, {
  options: { customName: 'verifRoles' },
});