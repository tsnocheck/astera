import {
  constructEmbed,
  IFeature,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import { ButtonInteraction, MessageFlags } from 'discord.js';

const PunishmentMap = {
  [PunishmentType.BAN]: 'Бан',
  [PunishmentType.MUTE]: 'Мьют',
  [PunishmentType.WARN]: 'Предупреждение',
};

export default class GetInformation implements IFeature<ButtonInteraction> {
  name = 'get-information';

  async run({ interaction }: { interaction: ButtonInteraction }) {
    const punishments = await PunishmentModel.find({
      userID: interaction.user.id,
    });

    if (punishments.length === 0) {
      await interaction.reply({
        flags: [MessageFlags.Ephemeral],
        embeds: [
          constructEmbed({
            title: 'Информация',
            description: 'У вас нет наказаний.',
            customType: 'info',
          }),
        ],
      });
      return;
    }

    const punishmentList = punishments
      .map(
        (punishment) =>
          `**${PunishmentMap[punishment.type]}**: ${punishment.reason} ${punishment.expiresAt ? `Истекает <t:${Math.floor(punishment.expiresAt.getTime() / 1000)}>` : ''} (ID: ${punishment.id}) `,
      )
      .join('\n');
    await interaction.reply({
      flags: [MessageFlags.Ephemeral],
      embeds: [
        constructEmbed({
          title: 'Ваши наказания',
          description: punishmentList,
          customType: 'info',
        }),
      ],
    });
  }
}
