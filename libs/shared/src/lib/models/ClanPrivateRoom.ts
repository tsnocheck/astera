import {
  getModelForClass,
  modelOptions,
  Prop,
} from '@typegoose/typegoose';
import { Base, TimeStamps } from '@typegoose/typegoose/lib/defaultClasses';
import { Types } from 'mongoose';

export class ClanPrivateRoom extends TimeStamps implements Base {
  public _id!: Types.ObjectId;
  public id!: string;

  @Prop()
  public name?: string;

  @Prop()
  public roomId?: string;

  @Prop({ required: true })
  public ownerId!: string;

  @Prop({ required: true })
  public clanId!: string;
}

export const ClanPrivateRoomModel = getModelForClass(ClanPrivateRoom, {
  options: { customName: 'clanPrivateRooms' },
});
