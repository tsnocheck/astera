import { IFeature, RunFeatureParams, PrivateModel} from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export class LockRoomPrivate implements IFeature<ButtonInteraction> {
  name = 'lockRoomPrivate';

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
      if (channel.permissionsFor(interaction.guild.id)?.has('Connect')) {
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
        await interaction.reply({ content: 'Комната успешно заблокирована для всех участников.', ephemeral: true });
      } else {
        await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
        await interaction.reply({ content: 'Комната успешно разблокирована для всех участников.', ephemeral: true });
      }
    } catch (error) {
      await interaction.reply({ content: 'Произошла ошибка при изменении состояния комнаты.', ephemeral: true });
    }
  }
}

export default LockRoomPrivate;
