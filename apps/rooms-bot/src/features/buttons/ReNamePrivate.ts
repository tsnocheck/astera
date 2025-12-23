import { IFeature, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputStyle,
  TextInputBuilder,
  ChannelType
} from 'discord.js';

export class ReNamePrivate implements IFeature<ButtonInteraction> {
  name = 'reNamePrivate';

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

    const channel = interaction.guild?.channels.cache.get(privateRoom.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`reNamePrivateModal_${privateRoom._id}`)
      .setTitle('Переименование комнаты');

    const limitInput = new TextInputBuilder()
      .setCustomId(`roomNameInput`)
      .setLabel('Введите новое имя комнаты:')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('например, Моя комната')
      .setRequired(true)
      .setMaxLength(32);

    const modalActionRow =
      new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);

    modal.addComponents(modalActionRow);

    await interaction.showModal(modal);
  }
}

export default ReNamePrivate;
