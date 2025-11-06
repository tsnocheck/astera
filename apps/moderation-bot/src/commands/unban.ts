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

const BAN_ROLE_ID = process.env.BAN_ROLE_ID!;

export default class Unban implements ICommand {
  name = 'unban';
  description = 'Снять бан с пользователя';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, с которого вы хотите снять бан',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'причина',
      description: 'Причина снятия бана',
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
            title: 'Нельзя снимать бан ботам',
            description: 'Вы не можете снять бан с ботов.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!member.roles.cache.has(BAN_ROLE_ID)) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Пользователь не в бане',
            description: 'Этот пользователь не имеет активного бана.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    try {
      await member.roles.remove(BAN_ROLE_ID, reason);
    } catch (e) {
      logger.error(`Failed to remove ban role from ${member.user.tag}:`, e);
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Ошибка снятия бана',
            description: `Не удалось снять бан с пользователя ${member}. Пожалуйста, попробуйте позже.`,
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }
    await PunishmentModel.deleteOne({
      userID: member.id,
      type: PunishmentType.BAN,
    });

    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Бан снят',
          description: `Бан с пользователя ${member} успешно снят.`,
          customType: 'success',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });

    logger.info(
      `Unbanned ${member.user.tag} (${member.id}) for reason: ${reason}`,
    );
    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Снятие бана',
          description: `Пользователь ${member} был разбанен.\nПричина: ${reason}`,
          customType: 'info',
        }),
      ],
    });
  }
}
