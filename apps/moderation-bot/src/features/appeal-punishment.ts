import { constructEmbed, IFeature, PunishmentModel } from '@lolz-bots/shared';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { sendAppealTicket } from '../producer/appeal-ticket';

export default class AppealPunishment implements IFeature<ButtonInteraction> {
  name = 'appeal-punishment';

  async run({ interaction }: { interaction: ButtonInteraction }) {
    const punishments = await PunishmentModel.find({
      userID: interaction.user.id,
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
    });

    if (punishments.length === 0) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Нет активных наказаний',
            description:
              'У вас нет активных наказаний, которые можно обжаловать.',
            customType: 'info',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await sendAppealTicket({
      userId: interaction.user.id,
      topic: 'Обжалование наказания',
      description: `Пользователь <@${interaction.user.id}> обжалует свои наказания:\n\n${punishments
        .map(
          (p) =>
            `**ID:** ${p._id}\n**Тип:** ${p.type}\n**Причина:** ${p.reason}\n**Дата:** ${p.createdAt!.toISOString()}\n**Истекает:** ${
              p.expiresAt ? p.expiresAt.toISOString() : 'Перманентный'
            }\n\n`,
        )
        .join('')}`,
    });

    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Обжалование наказания отправлено',
          description:
            'Ваше обжалование наказания было успешно отправлено. Ожидайте ответа от модераторов.',
          customType: 'info',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });
  }
}
