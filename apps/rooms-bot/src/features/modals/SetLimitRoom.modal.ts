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
  ModalSubmitInteraction,
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SetLimitRoomModal implements IFeature<ModalSubmitInteraction> {
  name = 'setLimitRoomModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const roomLimitValue = interaction.fields.getTextInputValue('roomLimitInput');

    const limit = parseInt(roomLimitValue, 10);

    if (isNaN(limit) || limit < 0) {
      return interaction.reply({
        content: 'Invalid limit value. Please enter a non-negative integer.',
        ephemeral: true,
      });
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id);

    if (!member) {
      return interaction.reply({
        content: 'Member not found.',
        components: [],
      });
    }

    const channel = member.voice.channel;

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: 'You must be in the voice channel to set limits.',
        components: [],
      });
    }

    const room = await RoomModel.findOne({ roomId: channel.id });

    if (!room) {
      return interaction.reply({
        content: 'Room not found.',
        components: [],
      });
    }

    if(room.ownerId !== interaction.user.id && !room.coOwners.includes(interaction.user.id)) {
      return interaction.reply({
        content: 'You do not have permission to set limits for this room.',
        components: [],
      });
    }

    try {
      channel.setUserLimit(limit);
      return interaction.reply({
        content: `Room limit set to ${limit === 0 ? 'no limit' : limit}.`,
        ephemeral: true,
      });
    } catch (e) {
      return interaction.reply({
        content: 'Failed to set room limit. Please contact support.',
        components: [],
      });
    }
  }
}

export default SetLimitRoomModal;
