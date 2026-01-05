import {
  getModelForClass,
  index,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export enum GameType {
  CS2 = 'CS2',
  DOTA2 = 'Dota 2',
  VALORANT = 'Valorant',
  LOL = 'League of Legends',
}

@index({ hostId: 1, isActive: 1 })
export class CloseGame extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop({ required: true, enum: GameType })
  public type!: GameType;

  @Prop({ required: true })
  public categoryId!: string;

  @Prop({ required: true })
  public settingsChannelId!: string;

  @Prop({ required: true })
  public registrationChannelId!: string;

  @Prop({ required: true })
  public waitingChannelId!: string;

  @Prop({ required: true })
  public waitingVoiceChannelId!: string;

  @Prop({ type: () => [String], default: [] })
  public teamA!: string[];

  @Prop({ type: () => [String], default: [] })
  public teamB!: string[];

  @Prop({ required: true })
  public hostId!: string;

  @Prop({ required: true })
  public guildId!: string;

  @Prop()
  public startedAt?: Date;

  @Prop()
  public completedAt?: Date;

  @Prop()
  public voiceAId?: string;

  @Prop()
  public voiceBId?: string;

  @Prop({ default: true })
  public isActive!: boolean;
}

export const CloseGameModel = getModelForClass(CloseGame, {
  options: { customName: 'closeGames' },
});
