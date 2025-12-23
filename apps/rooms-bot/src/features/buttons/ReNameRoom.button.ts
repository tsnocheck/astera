import { IFeature, RoomModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
} from 'discord.js';

export class ReNameRoom implements IFeature<ButtonInteraction> {
  name = 'reName';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const userRooms = await RoomModel.find({
      ownerId: interaction.user.id,
    });

    const coOwners = await RoomModel.find({ coOwners: interaction.user.id });

    if (userRooms.length === 0 && coOwners.length === 0) {
      await interaction.reply({
        content: 'У вас нет комнаты для переименования.',
        ephemeral: true,
      });
      return;
    }

    const allRoomIds = [...userRooms, ...coOwners];

    const options = allRoomIds.map((room) => ({
      value: room._id.toString(),
      label: room.name,
    }));

    const action =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('reNameRoomSelect')
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

export default ReNameRoom;
