import {
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  StringSelectMenuBuilder,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
} from 'discord-api-types/v10';
import { Room, RoomModel, RoomUserModel } from '@lolz-bots/shared';

export default class DeleteRooms implements ICommand {
  name = 'delete-rooms';
  description = 'Delete private rooms';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'member',
      description: 'Owner of the room',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('member') || interaction.user;

    const rooms = await RoomModel.find({ ownerId: user.id });

    if (!rooms) {
      await interaction.reply({
        content: `No room found for user ${user.username}.`,
        ephemeral: true,
      });
      return;
    }

    const options = rooms.map((room) => ({
      value: room._id.toString(),
      label: room.name,
    }));

    const selectRoom = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`selectDeleteRoom`)
        .setPlaceholder('Выберите комнату для удаления:')
        .addOptions(options),
    );

    await interaction.reply({
      components: [selectRoom],
      ephemeral: true,
    });
  }
}
