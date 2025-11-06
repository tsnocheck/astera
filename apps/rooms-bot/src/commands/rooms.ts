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
import { Room, RoomModel } from '@lolz-bots/shared/lib/models/Room';

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
      name: 'color',
      description: 'Color of the role. Example: #FF0000',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('member') || interaction.user;
    const name = interaction.options.getString('name', true);
    const color = interaction.options.getString('color', true);
    
    let member;

    try {
      member = await interaction.guild?.members.fetch(user.id);
    } catch (error) {
      console.error('Error fetching member:', error);
      await interaction.reply({
        content: 'An error occurred while creating the room.',
        ephemeral: true,
      });
      return;
    }

    const hexColorRegex = /^#?([0-9A-F]{3}){1,2}$/i;
    if (!hexColorRegex.test(color)) { 
      await interaction.reply({
        content:
          'Invalid color format. Please provide a valid hex color code. Example: #FF0000',
        ephemeral: true,
      });
      return;
    }

    const role = await interaction.guild?.roles
      .create({
        name: name,
        color: `#${color.replace('#', '')}`,
        reason: `Creating room for ${interaction.user.username}`,
      })
      .catch(async () => {
        return interaction.reply({
          content: 'Error creating role for the room.',
          ephemeral: true,
        });
      });

    const room = new RoomModel({
      name: name,
      roleId: role?.id,
      ownerId: user.id,
    });

    if (role) {
      await member?.roles.add(role.id);
    } else {
      await interaction.reply({
        content: 'An error occurred while adding the room role.',
        ephemeral: true,
      });
      return;
    }

    await room.save();
    await interaction.reply({
      content: `Room "${name}" created successfully for ${user.username}.`,
      ephemeral: true,
    });
  }
}

