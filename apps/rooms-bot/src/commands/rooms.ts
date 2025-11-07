import {
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserInventoryItem,
  UserModel,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ButtonBuilder,
  ButtonInteraction,
  GuildMemberRoleManager,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
  ButtonStyle,
} from 'discord-api-types/v10';
import { Room, RoomModel, RoomUserModel } from '@lolz-bots/shared';

export default class CreateRooms implements ICommand {
  name = 'create-rooms';
  description = 'Create private rooms';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'member',
      description: 'Owner of the room',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'name',
      description: 'Name of the room',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('member') || interaction.user;
    const name = interaction.options.getString('name', true);

    const room = new RoomModel({
      name: name,
      ownerId: user.id,
    });

    await room.save();

    const roomUser = new RoomUserModel({
      roomId: room._id,
      userId: user.id,
    });

    await roomUser.save();

    room.users.push(roomUser._id);
    await room.save();

    await interaction.reply({
      content: `Room "${name}" created successfully for ${user.username}.`,
      ephemeral: true,
    });
  }
}
