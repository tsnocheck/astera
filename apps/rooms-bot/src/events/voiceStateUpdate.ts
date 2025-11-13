import {
  BotClient,
  IEvent,
  logger,
  RoomModel,
  RoomUserModel,
} from '@lolz-bots/shared';
import { VoiceState, VoiceChannel } from 'discord.js';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  async run(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    const parentRoomId = process.env.PARENT_ROOM_ID;

    if (oldState.channel?.parentId === parentRoomId && oldState.channel) {
      const channel = oldState.guild.channels.cache.get(
        oldState.channel.id,
      ) as VoiceChannel;
      if (channel && channel.members && channel.members.size === 0) {
        await channel
          .delete()
          .catch((err) => logger.error('Failed to delete empty room:', err));
      }
    }

    const init = async () => {
      const joinedAt = new Date().getTime();
      const room = await RoomModel.findOne({ roomId: newState.channel!.id });
      if (!room) return;
      voiceMemory.set(newState.member!.id, joinedAt);
    };

    const save = async () => {
      try {
        const joinedAt = voiceMemory.get(newState.member!.id);
        if (!joinedAt) return;

        const room = await RoomModel.findOne({ roomId: oldState.channel!.id });
        if (!room) return;

        const roomUser = await RoomUserModel.findOne({
          userId: oldState.member!.id,
          _id: { $in: room.users },
        });

        if (!roomUser) return;

        const time = Math.round(Date.now() - joinedAt);

        roomUser.online = (roomUser.online || 0) + time;
        await roomUser.save();
      } catch (error) {
        logger.error('Error saving user data:', error);
      }
    };

    const clear = () => {
      voiceMemory.delete(newState.member!.id);
    };

    if (newState.channel?.parentId === parentRoomId) {
      if (oldState.channel && !newState.channel) {
        await save();
        clear();
      } else if (!oldState.channel && newState.channel) {
        await init();
      } else if (!oldState.selfDeaf && newState.selfDeaf) {
        await save();
        clear();
      } else if (oldState.selfDeaf && !newState.selfDeaf) {
        await init();
      } else if (!oldState.selfMute && newState.selfMute) {
        await save();
        await init();
      } else if (oldState.selfMute && !newState.selfMute) {
        await save();
        await init();
      } else if (
        oldState.channel &&
        newState.channel &&
        oldState.channel.id !== newState.channel.id
      ) {
        await save();
        await init();
      }
    } else {
      if (oldState.channel?.parentId === parentRoomId) {
        await save();
        clear();
      }
    }
  }
}
