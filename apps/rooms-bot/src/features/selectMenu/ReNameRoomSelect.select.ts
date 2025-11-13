import { IFeature, logger, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  Base,
  BaseChannel,
  ButtonInteraction,
  ChannelType,
  Guild,
  GuildBasedChannel,
  GuildChannel,
  GuildChannelTypes,
  ModalActionRowComponent,
  ModalBuilder,
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class ReNameRoomSelect implements IFeature<SelectMenuInteraction> {
  name = 'reNameRoomSelect';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });
    logger.info('Selected Room:', room);

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
