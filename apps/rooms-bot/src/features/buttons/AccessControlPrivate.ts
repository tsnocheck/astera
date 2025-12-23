import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export class AccessControlPrivate implements IFeature<ButtonInteraction> {
  name = 'accessControlPrivate';

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

    const selectUser = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('selectAccessControlPrivate')
        .setPlaceholder('Выберите пользователeй')
        .setMaxValues(1)
    )

    await interaction.reply({
      content: 'Выберите пользователей, кому хотите ограничить/выдать доступ к комнате:',
      components: [selectUser],
      ephemeral: true,
    });
  }
}

export default AccessControlPrivate;
