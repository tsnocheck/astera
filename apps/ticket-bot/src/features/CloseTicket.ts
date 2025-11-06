import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  TextChannel,
} from 'discord.js';
import { BotClient, IFeature, logger } from '@lolz-bots/shared';
import { generateLogsFromChannel } from '../services/generateLogsFromChannel';

export default class CloseTicketButton implements IFeature<ButtonInteraction> {
  name = 'CloseTicketButton';

  async run({
    interaction,
    client,
  }: {
    interaction: ButtonInteraction;
    client: BotClient;
  }) {
    const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Подтвердить закрытие')
        .setCustomId('Confirm')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setLabel('Отменить закрытие')
        .setCustomId('Cancel')
        .setStyle(ButtonStyle.Danger),
    );
    const callback = await interaction.reply({
      content: 'Вы уверены, что хотите закрыть тикет?',
      components: [confirmRow],
      flags: [MessageFlags.Ephemeral],
      withResponse: true,
    });

    if (!callback.resource?.message) {
      await interaction.reply({
        content: 'Произошла ошибка при попытке закрыть тикет.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const message = callback.resource.message;

    const filter = (i: ButtonInteraction) => {
      return i.user.id === interaction.user.id;
    };
    let result: ButtonInteraction | undefined;
    try {
      result = await message.awaitMessageComponent({
        filter,
        time: 15000,
        componentType: ComponentType.Button,
      });

      if (result.customId === 'Confirm') {
        result.deferUpdate();

        const embed = new EmbedBuilder()
          .setTitle('Закрытие тикета')
          .setDescription('Тикет был успешно закрыт')
          .setColor('Green');
        const channel = (await interaction.channel!.fetch()) as TextChannel;
        await channel!.send({
          embeds: [embed],
          content: 'Тикет был закрыт пользователем ' + interaction.user.tag,
        });

        setTimeout(() => result!.channel!.delete(), 60000);
      } else {
        const embed = new EmbedBuilder()
          .setTitle('Закрытие тикета отменено')
          .setDescription(
            'Вы отменили закрытие тикета. Вы можете закрыть его позже, нажав на кнопку закрытия тикета.',
          )
          .setColor('Red');
        await result?.editReply({
          embeds: [embed],
          components: [],
          content: '',
        });
      }
    } catch (e) {
      logger.error(`Error while closing ticket`, e);
      const embed = new EmbedBuilder()
        .setTitle('Время ожидания истекло')
        .setDescription(
          'Вы не ответили вовремя. Пожалуйста, нажмите на кнопку закрытия тикета еще раз, если вы хотите закрыть тикет.',
        )
        .setColor('Red');
      if (result) {
        await result.editReply({
          embeds: [embed],
          components: [],
          content: '',
        });
      }

      try {
        const logs = await generateLogsFromChannel(
          interaction.channel as TextChannel,
        );
        const attachment = new AttachmentBuilder(
          Buffer.from(JSON.stringify(logs, null, 2), 'utf-8'),
          { name: `${(interaction.channel as TextChannel)!.name}.json` },
        );
        const logsChannel = (await client.channels.fetch(
          process.env.LOGS_CHANNEL_ID!,
        )) as TextChannel;
        await logsChannel!.send({ files: [attachment] });
      } catch (e) {
        logger.error(`Error while generating logs`, e);
      }
    }
  }
}
