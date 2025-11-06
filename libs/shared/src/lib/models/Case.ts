import {
  getModelForClass,
  modelOptions,
  Prop,
  Ref,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';
import { Item, ItemModel } from './Item';

@modelOptions({ schemaOptions: { _id: false } })
export class CaseItem {
  @Prop({ ref: () => ItemModel.modelName, required: true })
  public item!: Ref<Item>;

  @Prop({ required: true, min: 0, max: 100 })
  public chance!: number;
}

export class Case extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true, unique: true })
  public name!: string;

  @Prop({ required: true })
  public description!: string;

  @Prop({ required: true, default: 0 })
  public price!: number;

  @Prop({ type: () => [CaseItem], default: [] })
  public items!: CaseItem[];
}

export const CaseModel = getModelForClass(Case, {
  options: { customName: 'cases' },
});
