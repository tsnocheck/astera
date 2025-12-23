import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export class TransferOwnerPrivate implements IFeature<ButtonInteraction> {
  name = 'transferOwnerPrivate';

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
        .setCustomId('selectNewOwnerPrivate')
        .setPlaceholder('Выберите нового владельца комнаты')
        .setMaxValues(1)
    )

    await interaction.reply({
      content: 'Выберите пользователя, которому хотите передать владение комнатой:',
      components: [selectUser],
      ephemeral: true,
    });
  }
}

export default TransferOwnerPrivate;
