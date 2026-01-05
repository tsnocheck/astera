import {
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
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
    {
      name: 'cost',
      description: 'Cost of the room',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('member') || interaction.user;
    const name = interaction.options.getString('name', true);
    const cost = interaction.options.getNumber('cost', true);

    let userData = await UserModel.findOne({ discordID: user.id });

    if (!userData) {
      userData = await UserModel.create({ discordID: user.id, coins: 0 });
    }

    if (userData.coins < cost) {
      await interaction.reply({
        content: `У ${user.username} недостаточно средств для создания комнаты.`,
        ephemeral: true,
      });
      return;
    }

    userData.coins -= cost;
    await userData.save();

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
      content: `Комната "${name}" успешно создана для ${user.username}.`,
      ephemeral: true,
    });
  }
}
