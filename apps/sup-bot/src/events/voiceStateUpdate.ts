import { VoiceState } from 'discord.js';
import { BotClient, IEvent, logger, SupUserModel } from '@lolz-bots/shared';
import { supConfig } from '../config';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  run = async (client: BotClient, oldState: VoiceState, newState: VoiceState) => {
    try {
      let member = newState.member;
      if (!member) member = oldState.member;
      if (!member) return;

      // Проверяем, является ли пользователь саппортом
      if (!member.roles.cache.has(supConfig.roles.support)) return;

      let support = await SupUserModel.findOne({
        userId: member.id,
        guild: newState.guild.id,
      }) || await SupUserModel.create({
        userId: member.id,
        guild: newState.guild.id,
      });

      // Пользователь зашел в войс
      if (!oldState.channelId && newState.channelId) {
        await this.handleJoin(member.id, support);
      }
      // Пользователь вышел из войса
      else if (oldState.channelId && !newState.channelId) {
        await this.handleLeave(member.id, support);
      }
      // Пользователь переключился между каналами
      else if (oldState.channelId !== newState.channelId) {
        await this.handleLeave(member.id, support);
        await this.handleJoin(member.id, support);
      }
    } catch (error) {
      logger.error('Error in voiceStateUpdate:', error);
    }
  };

  private async handleJoin(userId: string, support: any) {
    const joinedAt = Date.now();
    voiceMemory.set(userId, joinedAt);

    const formattedDate = new Date().toDateString();

    // Инициализация массивов если их нет
    if (!support.online) {
      support.online = {
        onlineForPt: [],
        onlineForDays: [],
      };
    }
    support.online.onlineForPt = support.online.onlineForPt || [];
    support.online.onlineForDays = support.online.onlineForDays || [];

    let existingPtDate = support.online.onlineForPt.find(
      (item: any) => new Date(item.date).toDateString() === formattedDate
    );
    let existingDayDate = support.online.onlineForDays.find(
      (item: any) => new Date(item.date).toDateString() === formattedDate
    );

    if (!existingPtDate) {
      support.online.onlineForPt.push({
        date: new Date(),
        actions: [{
          reason: 'Вошел',
          time: Date.now(),
        }],
      });
    } else {
      existingPtDate.actions.push({
        reason: 'Вошел',
        time: Date.now(),
      });
    }

    if (!existingDayDate) {
      support.online.onlineForDays.push({
        date: new Date(),
        time: 0,
      });
    }

    await support.save();
  }

  private async handleLeave(userId: string, support: any) {
    const joinedAt = voiceMemory.get(userId);
    if (!joinedAt) return;

    const formattedDate = new Date().toDateString();

    // Инициализация массивов если их нет
    if (!support.online) {
      support.online = {
        onlineForPt: [],
        onlineForDays: [],
      };
    }
    support.online.onlineForPt = support.online.onlineForPt || [];
    support.online.onlineForDays = support.online.onlineForDays || [];

    let existingDate = support.online.onlineForPt.find(
      (item: any) => new Date(item.date).toDateString() === formattedDate
    );
    let onlineOnDay = support.online.onlineForDays.find(
      (item: any) => new Date(item.date).toDateString() === formattedDate
    );

    const timeSpent = Date.now() - joinedAt;

    if (!existingDate) {
      support.online.onlineForPt.push({
        date: new Date(),
        time: timeSpent,
        actions: [{
          reason: 'Вышел',
          time: Date.now(),
        }],
      });
    } else {
      existingDate.time = (existingDate.time || 0) + timeSpent;
      existingDate.actions.push({
        reason: 'Вышел',
        time: Date.now(),
      });
    }

    if (!onlineOnDay) {
      support.online.onlineForDays.push({
        date: new Date(),
        time: timeSpent,
      });
    } else {
      onlineOnDay.time = (onlineOnDay.time || 0) + timeSpent;
    }

    await support.save();
    voiceMemory.delete(userId);
  }
}
