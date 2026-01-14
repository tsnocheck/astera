import {
  ICommand,
  RunCommandParams,
  constructEmbed,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import CreateReportFeature from '../features/createReport';
import AcceptReportFeature from '../features/acceptReport';
import RejectReportFeature from '../features/rejectReport';
import CloseReportFeature from '../features/closeReport';

export default class ReportSetupCommand implements ICommand {
  name = 'report-setup';
  description = 'Отправить эмбед с кнопкой для жалоб';

  features = [
    new CreateReportFeature(),
    new AcceptReportFeature(),
    new RejectReportFeature(),
    new CloseReportFeature(),
  ];

  async run({ interaction }: RunCommandParams) {
    const embed = constructEmbed({
      title: '📢 Система жалоб',
      description:
        'Если у вас есть жалоба или проблема, нажмите на кнопку ниже, чтобы отправить репорт.',
      customType: 'info',
    });

    const button = new ButtonBuilder()
      .setCustomId('create-report')
      .setLabel('📝 Отправить жалобу')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    await interaction.channel?.send({
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: '✅ Эмбед с кнопкой жалобы отправлен!',
      ephemeral: true,
    });
  }
}
