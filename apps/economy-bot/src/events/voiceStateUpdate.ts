import {
  BotClient,
  IEvent,
  logger,
  RoomUserModel,
} from '@lolz-bots/shared';
import { VoiceState } from 'discord.js';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  async run(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    const userId = newState.member?.id || oldState.member?.id;
    if (!userId) return;

    const startTracking = () => {
      const joinedAt = new Date().getTime();
      voiceMemory.set(userId, joinedAt);
    };

    const saveOnline = async () => {
      try {
        const joinedAt = voiceMemory.get(userId);
        if (!joinedAt) return;

        const roomUser = await RoomUserModel.findOne({ userId: userId });
        if (!roomUser) return;

        const time = Math.round(Date.now() - joinedAt);
        roomUser.online = (roomUser.online || 0) + time;
        await roomUser.save();
      } catch (error) {
        logger.error('Error saving user data:', error);
      }
    };

    const clearTracking = () => {
      voiceMemory.delete(userId);
    };

    if (!oldState.channel && newState.channel) {
      startTracking();
    }

    else if (oldState.channel && !newState.channel) {
      await saveOnline();
      clearTracking();
    }

    else if (oldState.channel && !oldState.selfDeaf && newState.selfDeaf) {
      await saveOnline();
      clearTracking();
    }

    else if (oldState.channel && oldState.selfDeaf && !newState.selfDeaf) {
      startTracking();
    }
    else if (
      oldState.channel &&
      newState.channel &&
      oldState.channel.id !== newState.channel.id
    ) {
      await saveOnline();
      startTracking();
    }
  }
}
