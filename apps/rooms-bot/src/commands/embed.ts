import { constructEmbed, ICommand, RunCommandParams } from '@lolz-bots/shared';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import CreateRoom from '../features/buttons/CreateRoom.button';

export default class CreateRooms implements ICommand {
  name = 'create-embed';
  description = 'Send embeds with buttons';
  preconditions = ['admins-only'];

  features = [new CreateRoom()];

  async run({ interaction }: RunCommandParams) {
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('inviteRoom')
        .setLabel('Пригласить')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMute')
        .setLabel('Заглушить')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('addCoOwner')
        .setLabel('Добавить со-владельца')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimits')
        .setLabel('Установить лимиты')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reName')
        .setLabel('Переименовать')
        .setStyle(ButtonStyle.Secondary),
    );

    let button2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('onlineStats')
        .setLabel('ㅤㅤㅤㅤㅤㅤㅤОнлайн комнатыㅤㅤㅤㅤㅤㅤㅤ')
        .setStyle(ButtonStyle.Secondary),
    );

    let button3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
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

    await channel.send({
      embeds: [embed],
      components: [buttons, button2, button3],
    });

    await interaction.reply({
      content: 'Embed with buttons sent successfully.',
      ephemeral: true,
    });
  }
}
