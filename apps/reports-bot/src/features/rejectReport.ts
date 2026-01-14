import { IFeature, RunFeatureParams, constructEmbed } from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';
import { reportsConfig } from '../config';

export default class RejectReportFeature implements IFeature<ButtonInteraction> {
  name = 'reject-report';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    // Проверяем, является ли пользователь модератором
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const isModerator = member?.roles.cache.some((role: any) =>
      reportsConfig.roles.moderator.includes(role.id)
    );

    if (!isModerator) {
      return interaction.reply({
        content: '❌ У вас нет прав для отклонения жалоб',
        ephemeral: true,
      });
    }

    // Извлекаем ID ветки из customId кнопки
    const threadId = interaction.customId.split('_')[1];

    // Получаем ветку
    const thread = await interaction.guild?.channels.fetch(threadId).catch(() => null);

    if (!thread || !thread.isThread()) {
      return interaction.reply({
        content: '❌ Ветка не найдена',
        ephemeral: true,
      });
    }

    // Отправляем сообщение в ветку о том, что жалоба отклонена
    const rejectEmbed = constructEmbed({
      title: '❌ Жалоба отклонена',
      description: `Модератор <@${interaction.user.id}> отклонил вашу жалобу. Ветка будет закрыта.`,
      customType: 'error',
      timestamp: new Date(),
    });

    await thread.send({
      embeds: [rejectEmbed],
    });

    // Архивируем и закрываем ветку
    await thread.setArchived(true);
    await thread.setLocked(true);

    // Обновляем сообщение с кнопками в канале модерации
    await interaction.update({
      components: [], // Убираем кнопки
    });

    await interaction.followUp({
      content: '✅ Жалоба отклонена и ветка закрыта',
      ephemeral: true,
    });
  }
}
