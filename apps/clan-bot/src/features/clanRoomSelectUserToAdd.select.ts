import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  ClanModel,
  ClanPrivateRoomModel,
  logger,
} from '@lolz-bots/shared';
import { UserSelectMenuInteraction, ChannelType, PermissionFlagsBits } from 'discord.js';

export default class ClanRoomSelectUserToAddFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'clanRoomSelectUserToAdd';

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

    // Проверяем что выбранный пользователь в клане
    const isMember = clan.users.some((u: any) => u.userID === selectedUser.id);
    if (!isMember) {
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Этот пользователь не состоит в вашем клане',
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
      await channel.permissionOverwrites.edit(selectedUser.id, {
        Connect: true,
        ViewChannel: true,
      });

      return interaction.update({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: `Доступ к комнате предоставлен <@${selectedUser.id}>`,
            customType: 'success',
          }),
        ],
        components: [],
      });
    } catch (error) {
      logger.error('Error adding user to clan room:', error);
      return interaction.update({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось предоставить доступ',
            customType: 'error',
          }),
        ],
        components: [],
      });
    }
  }
}
