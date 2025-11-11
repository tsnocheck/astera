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
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectMuteOrUnMuteUsers implements IFeature<SelectMenuInteraction> {
  name = 'selectMuteOrUnMuteUsers';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
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

    const room = await RoomModel.findOne({ _id: interaction.customId.split('_')[1] });

    if (!room) {
      return interaction.reply({
        content: 'Room not found.',
        components: [],
      });
    }

    if (
      room.ownerId !== interaction.user.id &&
      !room.coOwners.includes(interaction.user.id)
    ) {
      return interaction.reply({
        content: 'You do not have permission to set limits for this room.',
        components: [],
      });
    }

    const voice = await interaction.guild?.channels.fetch(
      room.roomId!,
    ) as VoiceChannel;

    if (!voice) {
      return interaction.reply({
        content: 'Voice channel not found.',
        components: [],
      });
    }

    const selectedUserIds = interaction.values;

    const roomUsers = await RoomUserModel.find({
      userId: { $in: selectedUserIds },
      _id: { $in: room.users },
    });

    await Promise.all(
      roomUsers.map(async (roomUser) => {
        const user = await interaction.guild?.members.fetch(roomUser.userId);
        if (!user) return;

        if (roomUser.muted) {
          await voice.permissionOverwrites.edit(roomUser.userId, {
            Speak: false,
          });
          roomUser.muted = false;
          await user.voice.setChannel(channel.id);
        } else {
          await voice.permissionOverwrites.edit(roomUser.userId, {
            Speak: true,
          });
          roomUser.muted = true;
          await user.voice.setChannel(channel.id);
        }

        await roomUser.save();
      }),
    );

    return interaction.update({
      content: `Updated mute status for selected users.`,
      components: [],
    });
  }
}

export default SelectMuteOrUnMuteUsers;
