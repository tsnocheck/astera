import { constructEmbed, IFeature, logger, RoomUser, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { RoomModel, RoomUserModel } from '@lolz-bots/shared';

export class SetLimits implements IFeature<ButtonInteraction> {
  name = 'setLimits';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const coOwners = await RoomModel.find({ coOwners: interaction.user.id });
    const owners = await RoomModel.find({ ownerId: interaction.user.id });
    
    if (owners.length === 0 && coOwners.length === 0) {
      await interaction.reply({
        content: 'You do not have a room to create.',
        ephemeral: true,
      });
      return;
    }

    const coOwnerRoomIds = coOwners.map((room) => room._id);
    const allRoomIds = [...owners.map((room) => room._id), ...coOwnerRoomIds];
    const rooms = await RoomModel.find({ _id: { $in: allRoomIds } });

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
          .setCustomId('selectLimitRoom')
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

export default SetLimits;
