import { constructEmbed, IFeature, logger, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { RoomModel, RoomUserModel } from '@lolz-bots/shared';

export class InviteRoom implements IFeature<ButtonInteraction> {
  name = 'inviteRoom';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const ownerRoom = await RoomModel.find({ ownerId: interaction.user.id });
    const coOwners = await RoomModel.find({ coOwners: interaction.user.id });

    if (!ownerRoom && coOwners.length === 0) {
      await interaction.reply({
        content: 'You do not own any rooms to add a co-owner.',
        ephemeral: true,
      });
      return;
    }

    const сoOwnerRoomIds = coOwners.map((room) => room._id);
    const ownerRoomIds = ownerRoom.map((room) => room._id);
    const roomIds = [...сoOwnerRoomIds, ...ownerRoomIds];

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
          .setCustomId(`selectInviteRoom`)
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

export default InviteRoom;