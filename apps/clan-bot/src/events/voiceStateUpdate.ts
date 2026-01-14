import {
  BotClient,
  IEvent,
  logger,
  ClanModel,
  ClanPrivateRoomModel,
  constructEmbed,
} from '@lolz-bots/shared';
import { VoiceState, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const voiceMemory = new Map<string, number>();

export default class VoiceStateUpdateEvent implements IEvent {
  name = 'voiceStateUpdate';

  async run(client: BotClient, oldState: VoiceState, newState: VoiceState) {
    // Обработка входа в канал "Создать"
    if (newState.channelId) {
      const clan = await ClanModel.findOne({ createVoiceChannelId: newState.channelId });
      
      if (clan) {
        try {
          const guild = newState.guild;
          const member = newState.member;
          
          if (!member || !guild) return;

          // Проверяем что пользователь в этом клане
          const isMember = clan.users.some((u: any) => u.userID === member.id);
          if (!isMember) {
            await member.voice.disconnect('Не состоите в клане');
            return;
          }

          // Ищем существующую комнату пользователя в этом клане
          let privateRoom = await ClanPrivateRoomModel.findOne({ 
            ownerId: member.id,
            clanId: clan.id,
          });

          if (!privateRoom) {
            privateRoom = await ClanPrivateRoomModel.create({
              ownerId: member.id,
              clanId: clan.id,
              name: `${member.user.username}'s room`,
            });
          }

          const channel = guild.channels.cache.get(privateRoom.roomId!);

          if (!channel) {
            // Создаем приватную комнату
            const privateChannel = await guild.channels.create({
              name: privateRoom.name || `${member.user.username}'s room`,
              type: ChannelType.GuildVoice,
              parent: clan.categoryId,
              permissionOverwrites: [
                {
                  id: member.id,
                  allow: [
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers,
                    PermissionFlagsBits.MuteMembers,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.ViewChannel,
                  ],
                },
                {
                  id: guild.id,
                  deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
                },
              ],
            });

            await member.voice.setChannel(privateChannel.id);
            privateRoom.roomId = privateChannel.id;
            await privateRoom.save();

            // Отправляем меню управления в текстовый чат голосового канала
            const embed = constructEmbed({
              title: '🎤 Приватные комнаты',
              description: 'Изменяйте конфигурацию вашей комнаты с помощью панели управления.',
              customType: 'custom',
            });

            const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId('clanRoomAddUser')
                .setLabel('👥 Добавить участника')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('clanRoomKickUser')
                .setLabel('➖ Выгнать участника')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('clanRoomRename')
                .setLabel('✏️ Переименовать')
                .setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId('clanRoomLock')
                .setLabel('🔒 Закрыть комнату')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId('clanRoomSetLimit')
                .setLabel('👤 Установить лимит')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId('clanRoomMute')
                .setLabel('🔇 Заглушить/Разглушить')
                .setStyle(ButtonStyle.Secondary)
            );

            await privateChannel.send({
              content: `<@${member.id}>`,
              embeds: [embed],
              components: [row1, row2],
            });
          } else if (channel.type === ChannelType.GuildVoice) {
            await member.voice.setChannel(channel.id);
          }
        } catch (error) {
          logger.error('Error creating clan private room:', error);
        }
      }
    }

    // Удаление пустых комнат
    if (oldState.channel && oldState.channel.parentId) {
      const clan = await ClanModel.findOne({ categoryId: oldState.channel.parentId });
      
      if (clan) {
        const channel = oldState.guild.channels.cache.get(oldState.channel.id);
        if (channel && channel.type === ChannelType.GuildVoice) {
          // Не удаляем "Общий" и "Создать"
          if (oldState.channel.id !== clan.generalVoiceChannelId && 
              oldState.channel.id !== clan.createVoiceChannelId &&
              channel.members.size === 0) {
            await channel.delete().catch((err) => 
              logger.error('Failed to delete empty clan room:', err)
            );
          }
        }
      }
    }

    // Отслеживание голосового времени для участников клана
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

        // Найдем клан, в котором состоит пользователь
        const clan = await ClanModel.findOne({ 'users.userID': oldState.member!.id });
        
        if (clan) {
          // Найдем пользователя в клане и обновим его голосовое время
          const userIndex = clan.users.findIndex((u: any) => u.userID === oldState.member!.id);
          if (userIndex !== -1) {
            clan.users[userIndex].voiceTime += time;
            await clan.save();
            logger.info(`Updated voice time for user ${oldState.member!.id} in clan ${clan.name}: +${time} ms`);
          }
        }
      } catch (error) {
        logger.error('Error saving clan voice data:', error);
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
