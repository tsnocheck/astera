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
import { sendLog } from '../services/send-log';
import { parseTime } from '../services/parse-time';
import { sendPunishment } from '../producer/punishments';

const BAN_ROLE_ID = process.env.BAN_ROLE_ID!;

export default class Ban implements ICommand {
  name = 'ban';
  description = 'Выдать бан';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, которому вы хотите выдать бан',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'длительность',
      description: 'Длительность бана (формат: 1d, 2h, 30m)',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'причина',
      description: 'Причина бана',
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
    const duration = interaction.options.getString('длительность')!;
    if (member.user.bot) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Нельзя выдавать бан ботам',
            description: 'Вы не можете выдать бан ботам.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }
    const parsedDuration = parseTime(duration);
    if (!parsedDuration) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Неверный формат длительности',
            description: 'Пожалуйста, используйте формат: 1d, 2h, 30m.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const isMemberBanned = await PunishmentModel.findOne({
      userID: member.user.id,
      type: PunishmentType.BAN,
    });

    if (isMemberBanned) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Пользователь уже забанен',
            description: `Пользователь ${member.user.tag} уже имеет активный бан.`,
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const ban = await PunishmentModel.create({
      userID: member.user.id,
      moderatorID: interaction.user.id,
      type: PunishmentType.BAN,
      reason,
    });

    await ban.save();
    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Пользователь забанен',
          description: `Пользователь **${member.user.tag}** был успешно забанен.\nПричина: **${reason}**`,
          customType: 'success',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });
    await member.roles.add(BAN_ROLE_ID, reason);
    if (member.voice) {
      try {
        await member.voice.disconnect('Пользователь был забанен');
      } catch (e) {
        logger.error('Error while disconnecting user from voice channel:', e);
      }
    }
    try {
      await member.send({
        embeds: [
          constructEmbed({
            title: 'Вы были забанены',
            description: `Вы были забанены на сервере.\nПричина: **${reason}**`,
            customType: 'info',
          }),
        ],
      });
    } catch (e) {
      logger.error('Error while banning user:', e);
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Ошибка при бане пользователя',
            description: 'Произошла ошибка при попытке забанить пользователя.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }
    await sendPunishment({
      reason,
      userID: member.user.id,
      type: PunishmentType.BAN,
    });
    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Пользователь забанен',
          description: `Пользователь: ${member.user.tag} (${member.id})\nПричина: **${reason}** \nID бана: **${ban.id}** \nДлительность: <t:${Math.round(new Date().getTime() / 1000)}:F>`,
          customType: 'info',
        }),
      ],
    });
  }
}
