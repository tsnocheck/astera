import {
  BotClient,
  constructEmbed,
  ICommand,
  logger,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import {
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { sendLog } from '../services/send-log';

const MUTE_ROLE_ID = process.env.MUTE_ROLE_ID!;

export default class Unmute implements ICommand {
  name = 'unmute';
  description = 'Снять мут с пользователя';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, с которого вы хотите снять мут',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'причина',
      description: 'Причина снятия мута',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async run({
    interaction,
    client,
  }: {
    interaction: ChatInputCommandInteraction;
    client: BotClient;
  }) {
    const member = interaction.options.getMember('пользователь') as GuildMember;
    const reason = interaction.options.getString('причина')!;

    if (member.user.bot) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Нельзя снимать мут ботам',
            description: 'Вы не можете снять мут с ботов.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!member.roles.cache.has(MUTE_ROLE_ID)) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Пользователь не в муте',
            description: 'Этот пользователь не имеет активного мута.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    try {
      await member.roles.remove(MUTE_ROLE_ID, reason);
    } catch (e) {
      logger.error(
        `Failed to remove mute role from ${member.user.tag} (${member.id}): ${e}`,
      );
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Ошибка снятия мута',
            description:
              'Не удалось снять мут с пользователя. Проверьте права бота.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    await PunishmentModel.deleteOne({
      userID: member.id,
      type: PunishmentType.MUTE,
    });

    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Мут снят',
          description: `Мут с пользователя ${member} успешно снят.`,
          customType: 'success',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });

    logger.info(
      `Unmuted ${member.user.tag} (${member.id}) for reason: ${reason}`,
    );
    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Снятие мута',
          description: `Пользователь ${member} был размучен.\nПричина: ${reason}`,
          customType: 'info',
        }),
      ],
    });
  }
}
