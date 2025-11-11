import { constructEmbed, IFeature, logger, RoomUser, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { RoomModel, RoomUserModel } from '@lolz-bots/shared';

export class OnlineStats implements IFeature<ButtonInteraction> {
  name = 'onlineStats';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const userRooms = await RoomUserModel.find({ userId: interaction.user.id });

    if (!userRooms) {
      return interaction.reply({
        content: 'You do not have are rooms.',
        ephemeral: true,
        components: [],
      });
    }

    const roomIds = userRooms.map((ur: RoomUser) => ur.roomId);
    const rooms = await RoomModel.find({ _id: { $in: roomIds } });

    if (rooms.length === 0) {
      await interaction.reply({
        content: 'Rooms not found.',
        ephemeral: true,
      });
      return;
    }

    const options = rooms.map((room) => ({
      value: room._id.toString(),
      label: room.name,
    }));

    const action =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('selectOnlineStatsRoom')
          .setPlaceholder('Select room:')
          .addOptions(options),
      );

    await interaction.reply({
      content: 'Select room:',
      components: [action],
      ephemeral: true,
    });
  }
}

export default OnlineStats;