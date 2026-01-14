import { IFeature, RunFeatureParams, constructEmbed } from '@lolz-bots/shared';
import { ButtonInteraction } from 'discord.js';

export default class CloseReportFeature implements IFeature<ButtonInteraction> {
  name = 'close-report';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

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

    // Проверяем, что пользователь является создателем ветки или её участником
    const isOwner = thread.ownerId === interaction.user.id;
    const isMember = thread.members.cache.has(interaction.user.id);

    if (!isOwner && !isMember) {
      return interaction.reply({
        content: '❌ Вы не можете закрыть эту жалобу',
        ephemeral: true,
      });
    }

    // Отправляем сообщение о закрытии
    const closeEmbed = constructEmbed({
      title: '🔒 Жалоба закрыта',
      description: `Пользователь <@${interaction.user.id}> закрыл эту жалобу.`,
      customType: 'custom',
      timestamp: new Date(),
    });

    await interaction.reply({
      embeds: [closeEmbed],
    });

    // Архивируем и закрываем ветку
    await thread.setArchived(true);
    await thread.setLocked(true);
  }
}
