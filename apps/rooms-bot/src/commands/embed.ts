import {
  constructEmbed,
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import CreateRoom from '../features/buttons/createRoom.button';

export default class CreateRooms implements ICommand {
  name = 'create-embed';
  description = 'Send embeds with buttons';
  preconditions = ['admins-only'];
  
  features = [new CreateRoom()];

  async run({ interaction }: RunCommandParams) {
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('inviteRoom')
        .setEmoji('<:images1:1435679609776771072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMute')
        .setEmoji('<:images1:1435679609776771072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('addCoOwner')
        .setEmoji('<:images1:1435679609776771072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimits')
        .setEmoji('<:images1:1435679609776771072>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reName')
        .setEmoji('<:images1:1435679609776771072>')
        .setStyle(ButtonStyle.Secondary),
    );

    let button2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('createRoom')
        .setLabel('ㅤㅤㅤㅤㅤㅤㅤㅤㅤСоздатьㅤㅤㅤㅤㅤㅤㅤㅤㅤ')
        .setStyle(ButtonStyle.Secondary),
    );

    const channel = interaction.channel;

    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      await interaction.reply({
        content: 'This command can only be used in a server text channel.',
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      title: 'Room Management',
      description:
        'Use the buttons below to manage your room settings and options.',
      customType: 'info',
    });

    await channel.send({ embeds: [embed], components: [buttons, button2] });
  }
}
