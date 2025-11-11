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
  PermissionFlagsBits,
  SelectMenuInteraction,
  StringSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectRoom';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Room not found.',
        components: [],
      });
    }

    const roomUsers = await RoomUserModel.find({
      _id: { $in: room.users },
    });

    const permissionOverwrites = roomUsers.map((roomUser) => ({
      id: roomUser.userId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      deny: roomUser.muted ? [PermissionFlagsBits.Speak] : [],
    }));

    permissionOverwrites.push({
      id: process.env.DEV_GUILD_ID!,
      allow: [PermissionFlagsBits.ViewChannel],
      deny: [PermissionFlagsBits.Connect],
    });

    let voice

    try {
      voice = await interaction.guild?.channels.create<ChannelType.GuildVoice>({
        name: room.name,
        type: ChannelType.GuildVoice,
        parent: process.env.PARENT_ROOM_ID,
        permissionOverwrites,
      });

      room.roomId = voice?.id;
      await room.save();
    } catch (e) {
      logger.error('Failed to create voice channel:', e);
      return interaction.update({
        content: 'Failed to create voice channel. Please contact support.',
        components: [],
      });
    }
    return interaction.update({
      content: `Voice channel <#${voice?.id}> created successfully!`,
      components: [],
    })
  }
}

export default SelectRoom;
