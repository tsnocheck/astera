import { constructEmbed, ICommand, RunCommandParams } from '@lolz-bots/shared';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
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
        .setEmoji('<:invite:1457028502208512021>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMute')
        .setEmoji('<:mute:1457026940442509405>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('addCoOwner')
        .setEmoji('<:crown:1457026936978276444>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimits')
        .setEmoji('<:limits:1457026938517586103>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('reName')
        .setEmoji('<:Vector:1457026942845849815>')
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
      <:invite:1457028502208512021> - Пригласить/Удалить участников
      <:mute:1457026940442509405> - Выдать/Снять мут участнику
      <:crown:1457026936978276444> - Добавить/Удалить совладельца
      <:limits:1457026938517586103> - Установить лимиты участников
      <:Vector:1457026942845849815> - Переименовать комнату
      ㅤ
      Нажмите на кнопку "Онлайн комнаты", чтобы просмотреть статистику онлайн по вашей комнате.
      ㅤ
      Нажмите на кнопку "Создать", чтобы создать новую приватную комнату.
      `,
      customType: 'custom',
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
