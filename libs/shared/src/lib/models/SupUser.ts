import {
  getModelForClass,
  index,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

class HistoryReInvite {
  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true })
  reason!: string;
}

class Action {
  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  time!: number;
}

class OnlineEntry {
  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true })
  time!: number;

  @Prop({ type: () => [Action], default: [] })
  actions?: Action[];
}

class OnlineData {
  @Prop({ type: () => [OnlineEntry], default: [] })
  onlineForPt!: OnlineEntry[];

  @Prop({ type: () => [OnlineEntry], default: [] })
  onlineForDays!: OnlineEntry[];
}

@index({ guild: 1, userId: 1 }, { unique: true })
export class SupUser extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true })
  guild!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ default: 0 })
  reInvite!: number;

  @Prop({ type: () => [HistoryReInvite], default: [] })
  historyReInvite!: HistoryReInvite[];

  @Prop({ default: null })
  sex!: boolean | null;

  @Prop({ default: false })
  ban!: boolean;

  @Prop({ type: () => OnlineData, default: () => ({ onlineForPt: [], onlineForDays: [] }) })
  online!: OnlineData;
}

export const SupUserModel = getModelForClass(SupUser, {
  options: { customName: 'supusers' },
});
