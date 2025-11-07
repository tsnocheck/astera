import {
  IFeature,
  RunFeatureParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
} from 'discord.js';
import {
  RoomModel,
  RoomUserModel,
} from '@lolz-bots/shared/lib/models/Room';

export class CreateRoom implements IFeature<ButtonInteraction> {
  name = 'createRoom';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const userRooms = await RoomUserModel.find({ userId: interaction.user.id });

    if (userRooms.length === 0) {
      await interaction.reply({
        content: 'You do not have a room to create.',
        ephemeral: true,
      });
      return;
    }

    const roomIds = userRooms.map((ur) => ur.roomId);
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
          .setCustomId('selectRoom')
          .setPlaceholder('Выберите комнату:')
          .addOptions(options),
      );

    await interaction.reply({
      content: 'Выберите комнату:',
      components: [action],
      ephemeral: true,
    });
  }
}

export default CreateRoom;
