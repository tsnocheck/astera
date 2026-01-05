import { constructEmbed, ICommand, RunCommandParams } from '@lolz-bots/shared';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import CreateRoom from '../features/buttons/createRoom.button';

export default class CreateRooms implements ICommand {
  name = 'private-embed';
  description = 'Send private embeds with buttons';
  preconditions = ['admins-only'];

  features = [new CreateRoom()];

  async run({ interaction }: RunCommandParams) {
    const buttonRow1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('transferOwnerPrivate')
        .setEmoji('<:4_:1457026014516478155>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('accessControlPrivate')
        .setEmoji('<:5_:1457026017473462452>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimitsPrivate')
        .setEmoji('<:3_:1457026011458703573>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('lockRoomPrivate')
        .setEmoji('<:1_:1457026008187142257>')
        .setStyle(ButtonStyle.Secondary),
    );

    const buttonRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('reNamePrivate')
        .setEmoji('<:7_:1457026020371595293>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('hideRoomPrivate')
        .setEmoji('<:6_:1457026018962444503>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kickUserPrivate')
        .setEmoji('<:2_:1457026009621725374>')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMutePrivate')
        .setEmoji('<:8_:1457026022334664816>')
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
      title: 'Приватные комнаты',
      description: `
      Измените конфигурацию вашей комнаты с помощью панели управления.
      
      <:4_:1457026014516478155> — назначить нового создателя комнаты
      <:5_:1457026017473462452> — ограничить/выдать доступ к комнате
      <:3_:1457026011458703573> — задать новый лимит участников
      <:1_:1457026008187142257> — закрыть/открыть комнату
      <:7_:1457026020371595293> — изменить название комнаты
      <:6_:1457026018962444503> — скрыть/открыть комнату
      <:2_:1457026009621725374> — выгнать участника из комнаты
      <:8_:1457026022334664816> — ограничить/выдать право говорить
      `,
      customType: 'custom',
    });

    await channel.send({
      embeds: [embed],
      components: [buttonRow1, buttonRow2],
    });

    await interaction.reply({
      content: 'Эмбед с кнопками успешно отправлен.',
      ephemeral: true,
    });
  }
}
