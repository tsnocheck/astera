import {
  BotClient,
  IEvent,
  logger,
  UserModel,
  getXPForLevel,
  hasReachedMaxXP,
} from '@lolz-bots/shared';
import { VoiceState } from 'discord.js';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  async run(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    const init = async () => {
      const joinedAt = new Date().getTime();
      logger.info(`User ${newState.member!.id} joined voice at ${joinedAt}`);
      voiceMemory.set(newState.member!.id, joinedAt);
    };

    const save = async () => {
      try {
        const joinedAt = voiceMemory.get(oldState.member!.id);
        if (!joinedAt) return;

        const time = Math.round(Date.now() - joinedAt);
        logger.info(`User ${oldState.member!.id} left voice after ${time} ms`);
        let user = await UserModel.findOne({ discordID: oldState.member!.id }) || await UserModel.create({ discordID: oldState.member!.id });

        const minutesSpent = Math.floor(time / 60000);
        if (minutesSpent > 0) {
          user.coins += minutesSpent;

          if (!hasReachedMaxXP(user.xp, user.level)) {
            const xpPerMinute = 1 + (user.level - 1) * 0.1;
            const rawXP = minutesSpent * xpPerMinute;
            const xpEarned = Math.ceil(rawXP);
            
            const maxXP = getXPForLevel(user.level);
            const xpToAdd = Math.min(xpEarned, maxXP - user.xp);
            user.xp += xpToAdd;
          }
        }

        user.online = time;
        await user.save();

        logger.info(`User ${user}.`);
      } catch (error) {
        logger.error('Error saving user data:', error);
      }
    };

    const clear = () => {
      voiceMemory.delete(oldState.member!.id);
    };

    if (!oldState.channel && newState.channel) {
      await init();
    } else if (oldState.channel && !newState.channel) {
      await save();
      clear();
    } else if (oldState.channel && !oldState.selfDeaf && newState.selfDeaf) {
      await save();
      clear();
    } else if (oldState.channel && oldState.selfDeaf && !newState.selfDeaf) {
      await init();
    } else if (oldState.channel && !oldState.selfMute && newState.selfMute) {
      await save();
      await init();
    } else if (oldState.channel && oldState.selfMute && !newState.selfMute) {
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
  }
}
