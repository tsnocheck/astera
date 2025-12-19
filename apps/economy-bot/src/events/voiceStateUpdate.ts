import {
  BotClient,
  IEvent,
  logger,
  UserModel,
  getXPForLevel,
  getCoinBonus,
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
          const coinBonus = getCoinBonus(user.level);
          const coinsEarned = Math.floor(minutesSpent * coinBonus);
          user.coins += coinsEarned;
          
          user.xp += minutesSpent;

          while (user.level < 50) {
            const requiredXP = getXPForLevel(user.level);
            if (user.xp >= requiredXP) {
              user.xp -= requiredXP;
              user.level += 1;
            } else {
              break;
            }
          }

          if (user.level >= 50) {
            user.xp = Math.min(user.xp, getXPForLevel(50));
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
