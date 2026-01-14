import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

@index({ guild: 1 }, { unique: true })
export class Guild extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  guild!: string;

  @Prop({ default: '?' })
  prefix!: string;

  @Prop({ type: () => [String], default: [] })
  banList!: string[];
}

export const GuildModel = getModelForClass(Guild, {
  options: { customName: 'guilds' },
});
