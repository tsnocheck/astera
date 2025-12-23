import { IFeature, RunFeatureParams, RoomModel } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ChannelType,
  ModalBuilder,
  SelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

export class SelectLimitRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectLimitRoom';

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
      .setCustomId(`setLimitRoomModal_${room._id}`)
      .setTitle('Установка лимита');

    const limitInput = new TextInputBuilder()
      .setCustomId(`roomLimitInput`)
      .setLabel('Введите лимит пользователей (0 - без лимита):')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('например, 5')
      .setRequired(true)
      .setMaxLength(2);
    
    const modalActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);

    modal.addComponents(modalActionRow);

    await interaction.showModal(modal);
  }
}

export default SelectLimitRoom;
