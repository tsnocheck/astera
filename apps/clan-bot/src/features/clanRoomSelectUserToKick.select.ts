import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { UserSelectMenuInteraction, ChannelType } from 'discord.js';

export default class ClanRoomSelectUserToKickFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'clanRoomSelectUserToKick';

  async run({ interaction }: RunFeatureParams<UserSelectMenuInteraction>) {
    const selectedUser = interaction.users.first();
    if (!selectedUser) return;

    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });
    if (!clan) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите в клане',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    const privateRoom = await ClanPrivateRoomModel.findOne({
      ownerId: interaction.user.id,
      clanId: clan.id,
    });

    if (!privateRoom || !privateRoom.roomId) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'У вас нет приватной комнаты',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(privateRoom.roomId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Комната не найдена',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }

    try {
      // Отключаем пользователя если он в канале
      const member = channel.members.get(selectedUser.id);
      if (member) {
        await member.voice.disconnect();
      }

      // Убираем разрешения
      await channel.permissionOverwrites.delete(selectedUser.id);

      return interaction.update({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: `<@${selectedUser.id}> исключен из комнаты`,
            customType: 'success',
          }),
        ],
        components: [],
      });
    } catch (error) {
      logger.error('Error kicking user from clan room:', error);
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось исключить пользователя',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }
  }
}
