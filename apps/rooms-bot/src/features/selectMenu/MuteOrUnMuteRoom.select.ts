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
  UserSelectMenuBuilder,
  VoiceChannel,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';

export class SelectMuteOrUnMuteUsers implements IFeature<SelectMenuInteraction> {
  name = 'selectMuteOrUnMuteUsers';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({
      _id: interaction.values[0],
    });

    if (!room) {
      return interaction.update({
        content: 'Room not found.',
        components: [],
      });
    }

    const userSelect = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`selectMuteOrUnMuteUsers_${room._id.toString()}`)
        .setPlaceholder('Select users to mute or unmute:')
        .setMinValues(1)
        .setMaxValues(25),
    );

    await interaction.update({
      content: `You are muting or unmuting users in room: ${room.name}`,
      components: [userSelect],
    });
  }
}

export default SelectMuteOrUnMuteUsers;
