import { IFeature, RoomModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ChannelType,
  ModalBuilder,
  SelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export class ReNameRoomSelect implements IFeature<SelectMenuInteraction> {
  name = 'reNameRoomSelect';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`reNameRoomModal_${room._id}`)
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

export default ReNameRoomSelect;
