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
        .setEmoji('<:invite:1438555700275183726>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMute')
        .setEmoji('<:mute:1438555706063196191>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('addCoOwner')
        .setEmoji('<:coowner:1438555703168995491>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimits')
        .setEmoji('<:limits:1438555707854159882>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reName')
        .setEmoji('<:rename:1438555701759836230>')
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
        content: 'Эта команда может использоваться только в текстовом канале сервера.',
        ephemeral: true,
      });
      return;
    }

    const embed = constructEmbed({
      title: 'Панель управления',
      description: `
      <:invite:1438555700275183726> - Пригласить/Удалить участников
      <:mute:1438555706063196191> - Выдать/Снять мут участнику
      <:coowner:1438555703168995491> - Добавить/Удалить совладельца
      <:limits:1438555707854159882> - Установить лимиты участников
      <:rename:1438555701759836230> - Переименовать комнату
      ㅤ
      Нажмите на кнопку "Онлайн комнаты", чтобы просмотреть статистику онлайн по вашей комнате.
      ㅤ
      Нажмите на кнопку "Создать", чтобы создать новую приватную комнату.
      `,
      customType: 'info',
    });

    await channel.send({
      embeds: [embed],
      components: [buttons, button2, button3],
    });

    await interaction.reply({
      content: 'Эмбед с кнопками успешно отправлен.',
      ephemeral: true,
    });
  }
}
