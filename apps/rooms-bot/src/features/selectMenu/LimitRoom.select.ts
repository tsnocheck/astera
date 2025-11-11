import { IFeature, RunFeatureParams } from '@lolz-bots/shared';
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

export class SelectLimitRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectLimitRoom';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Room not found.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        content: 'Room not found.',
        components: [],
      });
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id);

    if (!member) {
      return interaction.update({
        content: 'Member not found.',
        components: [],
      });
    }

    if (member.voice.channelId !== channel.id) {
      return interaction.update({
        content: 'You must be in the voice channel to set limits.',
        components: [],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('setLimitRoomModal')
      .setTitle('Set Limit');

    const limitInput = new TextInputBuilder()
      .setCustomId('roomLimitInput')
      .setLabel('Enter the user limit (0 for no limit):')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 5')
      .setRequired(true)
      .setMaxLength(2);
    
    const modalActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(limitInput);

    modal.addComponents(modalActionRow);

    await interaction.showModal(modal);
  }
}

export default SelectLimitRoom;
