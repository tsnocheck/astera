import { IFeature, RunFeatureParams, constructEmbed } from '@lolz-bots/shared';
import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { reportsConfig } from '../config';

export default class CreateReportFeature implements IFeature<ButtonInteraction> {
  name = 'create-report';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    // Создаем модальное окно для ввода жалобы
    const modal = new ModalBuilder()
      .setCustomId(`report-modal_${interaction.user.id}`)
      .setTitle('Отправка жалобы');

    const reasonInput = new TextInputBuilder()
      .setCustomId('report-reason')
      .setLabel('Причина жалобы')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Опишите причину вашей жалобы...')
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(1000);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      reasonInput
    );

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    // Ждем отправки модального окна
    const submitted = await interaction
      .awaitModalSubmit({
        time: 300000, // 5 минут
        filter: (i: any) => i.customId === `report-modal_${interaction.user.id}`,
      })
      .catch(() => null);

    if (!submitted) return;

    const reason = submitted.fields.getTextInputValue('report-reason');

    // Получаем канал для жалоб
    const reportsChannel = await interaction.guild?.channels.fetch(
      reportsConfig.channels.reports
    );

    if (!reportsChannel || reportsChannel.type !== ChannelType.GuildText) {
      return submitted.reply({
        content: '❌ Канал для жалоб не найден',
        ephemeral: true,
      });
    }

    // Создаем ветку для жалобы
    const thread = await reportsChannel.threads.create({
      name: `Жалоба от ${interaction.user.username}`,
      autoArchiveDuration: 1440, // 24 часа
      reason: 'Новая жалоба',
    });

    // Эмбед для ветки с жалобой
    const threadEmbed = constructEmbed({
      title: '📋 Жалоба',
      description: reason,
      fields: [
        {
          name: 'Отправитель',
          value: `<@${interaction.user.id}>`,
          inline: true,
        },
        {
          name: 'ID пользователя',
          value: interaction.user.id,
          inline: true,
        },
      ],
      customType: 'error',
      timestamp: new Date(),
    });

    const closeButton = new ButtonBuilder()
      .setCustomId(`close-report_${thread.id}`)
      .setLabel('🔒 Закрыть жалобу')
      .setStyle(ButtonStyle.Danger);

    const threadRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      closeButton
    );

    await thread.send({
      content: `<@${interaction.user.id}>`,
      embeds: [threadEmbed],
      components: [threadRow],
    });

    // Отправляем в канал модерации для принятия/отклонения
    const moderationChannel = await interaction.guild?.channels.fetch(
      reportsConfig.channels.moderation
    );

    if (moderationChannel && moderationChannel.type === ChannelType.GuildText) {
      const modEmbed = constructEmbed({
        title: '🚨 Новая жалоба',
        description: reason,
        fields: [
          {
            name: 'Отправитель',
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
          {
            name: 'Ветка',
            value: `<#${thread.id}>`,
            inline: true,
          },
        ],
        customType: 'info',
        timestamp: new Date(),
      });

      const acceptButton = new ButtonBuilder()
        .setCustomId(`accept-report_${thread.id}`)
        .setLabel('✅ Принять')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`reject-report_${thread.id}`)
        .setLabel('❌ Отклонить')
        .setStyle(ButtonStyle.Danger);

      const modRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        acceptButton,
        rejectButton
      );

      await moderationChannel.send({
        embeds: [modEmbed],
        components: [modRow],
      });
    }

    await submitted.reply({
      content: `✅ Жалоба успешно отправлена! Ожидайте ответа в <#${thread.id}>`,
      ephemeral: true,
    });
  }
}
