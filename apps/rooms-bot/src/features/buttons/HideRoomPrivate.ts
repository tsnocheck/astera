import { IFeature, logger, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export class HideRoomPrivate implements IFeature<ButtonInteraction> {
  name = 'hideRoomPrivate';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({ content: 'Ошибка получения данных участника.', ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member) {
      await interaction.reply({ content: 'Участник не найден.', ephemeral: true });
      return;
    }

    const privateRoom = await PrivateModel.findOne({ ownerId: interaction.user.id });
    if (!privateRoom) {
      await interaction.reply({ content: 'У вас нет приватной комнаты.', ephemeral: true });
      return;
    }

    if (privateRoom.roomId !== member.voice.channelId) {
      await interaction.reply({ content: 'Вы не являетесь владельцем этой приватной комнаты.', ephemeral: true });
      return;
    }

    const channel = interaction.guild.channels.cache.get(privateRoom.roomId);
    if (!channel || !channel.isVoiceBased()) {
      await interaction.reply({ content: 'Приватная комната не найдена.', ephemeral: true });
      return;
    }

    try {
      if (channel.permissionsFor(interaction.guild.id)?.has('ViewChannel')) {
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
        await interaction.reply({ content: 'Комната успешно скрыта для всех участников.', ephemeral: true });
      } else {
        await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
        await interaction.reply({ content: 'Комната успешно показана для всех участников.', ephemeral: true });
      }
    } catch (e) {
      logger.error('Error toggling room visibility:', e);
      await interaction.reply({ content: 'Не удалось изменить видимость комнаты. Пожалуйста, обратитесь в поддержку.', ephemeral: true });
    }
  }
}

export default HideRoomPrivate;
