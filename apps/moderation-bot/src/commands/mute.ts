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

const MUTE_ROLE_ID = process.env.MUTE_ROLE_ID!;

export default class Mute implements ICommand {
  name = 'mute';
  description = 'Выдать мут';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, которому вы хотите выдать мут',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'причина',
      description: 'Причина мута',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'длительность',
      description: 'Длительность мута (формат: 1d, 2h, 30m)',
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
            title: 'Нельзя выдавать мут ботам',
            description: 'Вы не можете выдать мут ботам.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const isMuted = await PunishmentModel.findOne({
      userID: member.user.id,
      type: PunishmentType.MUTE,
      $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }],
    });

    if (isMuted) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Пользователь уже замучен',
            description: `Пользователь ${member.user.tag} уже имеет активный мут.`,
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
            description: 'Используйте формат: 1d, 2h, 30m.',
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
            title: 'Длительность мута',
            description: 'Минимальная длительность мута - 1 час.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const mute = await PunishmentModel.create({
      userID: member.user.id,
      moderatorID: interaction.user.id,
      type: PunishmentType.MUTE,
      reason: reason,
      expiresAt: new Date(Date.now() + time),
    });

    await mute.save();
    await member.roles.add(MUTE_ROLE_ID, reason);
    await interaction.reply({
      embeds: [
        constructEmbed({
          title: 'Пользователь замьючен',
          description: `Пользователь ${member.user.tag} был успешно замьючен.\nПричина: ${reason}`,
          customType: 'success',
        }),
      ],
      flags: [MessageFlags.Ephemeral],
    });

    try {
      await member.send({
        embeds: [
          constructEmbed({
            title: 'Вы были замьючены',
            description: `Вы были замьючены на сервере.\nПричина: ${reason} \nДлительность: <t:${Math.floor((Date.now() + time) / 1000)}:R>`,
            customType: 'info',
          }),
        ],
      });
    } catch (e) {
      logger.error('Error while muting user:', e);
      await interaction.reply({
        embeds: [
          constructEmbed({
            title: 'Ошибка при муте пользователя',
            description: 'Произошла ошибка при попытке замутить пользователя.',
            customType: 'error',
          }),
        ],
        flags: [MessageFlags.Ephemeral],
      });
    }
    await sendPunishment({
      reason,
      type: PunishmentType.MUTE,
      userID: member.user.id,
    });
    await sendLog(client, {
      embeds: [
        constructEmbed({
          title: 'Выдан мут',
          description: `Пользователь: ${member.user.tag} (${member.id})\nПричина: **${reason}**\nДлительность: <t:${Math.floor((Date.now() + time) / 1000)}:F>`,
          customType: 'info',
        }),
      ],
    });
  }
}
