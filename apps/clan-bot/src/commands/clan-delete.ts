import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, ChannelType } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class ClanDeleteCommand implements ICommand {
  name = 'clan-delete';
  description = 'Удалить клан (только для администраторов)';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'Владелец клана',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user', true);

    const clan = await ClanModel.findOne({ owner: user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: `У пользователя <@${user.id}> нет клана`,
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      // Удаляем все Discord каналы клана
      if (interaction.guild) {
        const channelsToDelete = [
          clan.categoryId,
          clan.textChannelId,
          clan.generalVoiceChannelId,
          clan.createVoiceChannelId,
        ].filter(Boolean);

        for (const channelId of channelsToDelete) {
          try {
            const channel = interaction.guild.channels.cache.get(channelId!);
            if (channel) {
              await channel.delete();
              logger.info(`Deleted channel ${channelId} for clan ${clan.name}`);
            }
          } catch (error) {
            logger.error(`Failed to delete channel ${channelId}:`, error);
          }
        }

        // Удаляем все приватные комнаты клана
        const privateRooms = await ClanPrivateRoomModel.find({ clanId: clan.id });
        for (const room of privateRooms) {
          if (room.roomId) {
            try {
              const channel = interaction.guild.channels.cache.get(room.roomId);
              if (channel && channel.type === ChannelType.GuildVoice) {
                await channel.delete();
                logger.info(`Deleted private room ${room.roomId} for clan ${clan.name}`);
              }
            } catch (error) {
              logger.error(`Failed to delete private room ${room.roomId}:`, error);
            }
          }
        }

        // Удаляем записи о приватных комнатах из БД
        await ClanPrivateRoomModel.deleteMany({ clanId: clan.id });
      }

      // Удаляем клан из базы данных
      await ClanModel.deleteOne({ _id: clan._id });

      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '✅ Клан удален',
            description: `Клан **${clan.name}** и все связанные каналы успешно удалены`,
            customType: 'success',
          }),
        ],
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Error deleting clan:', error);
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось удалить клан',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }
  }
}
