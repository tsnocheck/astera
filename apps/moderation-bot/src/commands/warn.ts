import {
  BotClient,
  constructEmbed,
  ICommand,
  logger,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import { parseTime } from '../services/parse-time';
import { sendLog } from '../services/send-log';
import { sendPunishment } from '../producer/punishments';

const DEFAULT_BAN_DURATION = process.env.DEFAULT_BAN_DURATION || '1d';
const BAN_ROLE_ID = process.env.BAN_ROLE_ID;

export default class Warn implements ICommand {
  name = 'warn';
  description = 'Выдать предупреждение';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, которому вы хотите выдать предупреждение',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'причина',
      description: 'Причина предупреждения',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'длительность',
      description: 'Длительность предупреждения (Пример: 1d, 2h, 30m, 1h30m)',
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
            title: 'Нельзя выдавать предупреждения ботам',
            description: 'Вы не можете выдавать предупреждения ботам.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    const duration = interaction.options.getString('длительность')!;
    const time = parseTime(duration);
    if (!time) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Неверный формат длительности',
            description: 'Используйте формат: 1d, 2h, 30m, 1h30m.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    if (time < 1000 * 60 * 60) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Длительность предупреждения',
            description: 'Минимальная длительность предупреждения - 1 час.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    const warn = new PunishmentModel({
      userID: member.id,
      type: PunishmentType.WARN,
      moderatorID: interaction.user.id,
      reason: reason,
      expiresAt: new Date(Date.now() + time),
    });
    await warn.save();
    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Предупреждение выдано',
          description: `Пользователь ${member.user.tag} (${member.id}) получил предупреждение по причине: **${reason}**. \n Истекает в: <t:${Math.round(new Date(Date.now() + time).getTime() / 1000)}:R>`,
          customType: 'info',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });
    await sendPunishment({
      userID: member.id,
      type: PunishmentType.WARN,
      reason: reason,
    });
    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Выдано предупреждение',
          description: `Пользователь: ${member.user.tag} (${member.id})\nПричина: **${reason}**\nДлительность: <t:${Math.round(new Date(Date.now() + time).getTime() / 1000)}:F>`,
          customType: 'info',
        }),
      ],
    });

    try {
      await member.user.send({
        embeds: [
          constructEmbed({
            title: 'Вы получили предупреждение',
            description: `Вы получили предупреждение по причине: **${reason}**. \n Длительность: <t:${Math.round(new Date(Date.now() + time).getTime() / 1000)}:R>`,
            customType: 'info',
          }),
        ],
      });
    } catch (e) {
      logger.warn(`Cannot send DM to user: ${member.user.tag}`, e);
      await interaction.followUp({
        embeds: [
          constructEmbed({
            title: 'Не удалось отправить личное сообщение',
            description: `Пользователь ${member.user.tag} не может получать личные сообщения от сервера.`,
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }

    const userWarns = await PunishmentModel.countDocuments({
      userID: member.id,
      type: PunishmentType.WARN,
      expiresAt: { $gte: new Date() },
    });
    if (userWarns < 3) return;
    const banDuration = parseTime(DEFAULT_BAN_DURATION);
    const ban = new PunishmentModel({
      userID: member.id,
      type: PunishmentType.BAN,
      moderatorID: interaction.user.id,
      reason: `Автоматический бан после 3 предупреждений. Последнее предупреждение: ${reason}`,
      expiresAt: new Date(Date.now() + banDuration),
    });
    await ban.save();
    await interaction.followUp({
      embeds: [
        constructEmbed({
          title: 'Автоматический бан',
          description: `Пользователь ${member.user.tag} был автоматически забанен после 3 предупреждений. Последнее предупреждение: **${reason}**. \n Действует до: <t:${Math.round(new Date(Date.now() + banDuration).getTime() / 1000)}:R>`,
          customType: 'info',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });

    try {
      await member.roles.add(BAN_ROLE_ID!);
      await member.send({
        embeds: [
          constructEmbed({
            title: 'Вы были забанены',
            description: `Вы были забанены по причине: **Автоматический бан после 3 предупреждений**. \n Действует до: <t:${Math.round(new Date(Date.now() + banDuration).getTime() / 1000)}:R>`,
            customType: 'error',
          }),
        ],
      });
      logger.info(`User ${member.user.tag} has been banned automatically.`);
    } catch (e) {
      logger.error(`Failed to ban user ${member.user.tag}`, e);
      await interaction.followUp({
        embeds: [
          constructEmbed({
            title: 'Ошибка бана',
            description: `Не удалось забанить пользователя ${member.user.tag}. Возможно, у него нет роли бана.`,
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }
  }
}
