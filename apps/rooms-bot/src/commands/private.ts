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
        .setEmoji('👤')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('accessControlPrivate')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('setLimitsPrivate')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('lockRoomPrivate')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary),
    );

    const buttonRow2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('reNamePrivate')
        .setEmoji('✏️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('hideRoomPrivate')
        .setEmoji('🙈')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('kickUserPrivate')
        .setEmoji('👢')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('muteOrUnMutePrivate')
        .setEmoji('🗣️')
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
      
      👤 — назначить нового создателя комнаты
      🚫 — ограничить/выдать доступ к комнате
      👥 — задать новый лимит участников
      🔒 — закрыть/открыть комнату
      ✏️ — изменить название комнаты
      🙈 — скрыть/открыть комнату
      👢 — выгнать участника из комнаты
      🗣️ — ограничить/выдать право говорить
      `,
      customType: 'info',
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
