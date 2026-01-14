import { IFeature, RunFeatureParams, constructEmbed } from '@lolz-bots/shared';
import { ButtonInteraction, ChannelType } from 'discord.js';
import { reportsConfig } from '../config';

export default class AcceptReportFeature implements IFeature<ButtonInteraction> {
  name = 'accept-report';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    if (!interaction.isButton()) return;

    // Проверяем, является ли пользователь модератором
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const isModerator = member?.roles.cache.some((role: any) =>
      reportsConfig.roles.moderator.includes(role.id)
    );

    if (!isModerator) {
      return interaction.reply({
        content: '❌ У вас нет прав для принятия жалоб',
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

    // Добавляем модератора в ветку
    await thread.members.add(interaction.user.id);

    // Отправляем сообщение в ветку
    const acceptEmbed = constructEmbed({
      title: '✅ Жалоба принята',
      description: `Модератор <@${interaction.user.id}> принял вашу жалобу и был добавлен в эту ветку.`,
      customType: 'success',
      timestamp: new Date(),
    });

    await thread.send({
      embeds: [acceptEmbed],
    });

    // Обновляем сообщение с кнопками в канале модерации
    await interaction.update({
      components: [], // Убираем кнопки
    });

    await interaction.followUp({
      content: `✅ Жалоба принята! Вы были добавлены в ветку <#${threadId}>`,
      ephemeral: true,
    });
  }
}
