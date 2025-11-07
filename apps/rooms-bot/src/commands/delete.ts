import {
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
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

    const room = await RoomModel.findOne({ ownerId: user.id });

    if (!room) {
      await interaction.reply({
        content: `No room found for user ${user.username}.`,
        ephemeral: true,
      });
      return;
    }

    await RoomModel.deleteOne({ _id: room._id });
    await RoomUserModel.deleteMany({ roomId: room._id });

    await interaction.reply({
      content: `Room for user ${user.username} has been deleted.`,
      ephemeral: true,
    });
  }
}
