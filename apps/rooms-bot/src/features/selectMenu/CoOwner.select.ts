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
  UserSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectCoOwner implements IFeature<SelectMenuInteraction> {
  name = 'selectCoOwner';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Room not found.',
        components: [],
      });
    }

    const userSelect =
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`selectUserToCoOwner_${room._id}`)
          .setPlaceholder('Select users to invite:')
          .setMinValues(1)
          .setMaxValues(25),
      );

    await interaction.update({
      content: `You are inviting users to room: <#${room.roomId}>`,
      components: [userSelect],
    });
  }
}

export default SelectCoOwner;
