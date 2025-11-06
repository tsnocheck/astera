import {
  constructEmbed,
  ICommand,
  PunishmentModel,
  PunishmentType,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Modstats implements ICommand {
  name = 'modstats';
  description = 'Получить статистику модерации';
  preconditions = ['moderator-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'пользователь',
      description: 'Пользователь, для которого вы хотите получить статистику',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: { interaction: ChatInputCommandInteraction }) {
    let user = interaction.options.getUser('пользователь');
    if (!user) {
      user = interaction.user;
    }
    const stats = await PunishmentModel.find({ moderatorID: user.id });
    const embed = constructEmbed({
      title: 'Статистика модерации',
      description: `Статистика модерации для ${user.tag}`,
      customType: 'info',
      fields: [
        {
          name: 'Муты (последние 7 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.MUTE &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Муты (последние 30 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.MUTE &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Муты (всего)',
          value: stats
            .filter((s) => s.type === PunishmentType.MUTE)
            .length.toString(),
          inline: true,
        },
        {
          name: 'Баны (последние 7 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.BAN &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Баны (последние 30 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.BAN &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Баны (всего)',
          value: stats
            .filter((s) => s.type === PunishmentType.BAN)
            .length.toString(),
          inline: true,
        },
        {
          name: 'Предупреждения (последние 7 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.WARN &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Предупреждения (последние 30 дней)',
          value: stats
            .filter(
              (s) =>
                s.type === PunishmentType.WARN &&
                (s.createdAt ?? new Date()) >
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            )
            .length.toString(),
          inline: true,
        },
        {
          name: 'Предупреждения (всего)',
          value: stats
            .filter((s) => s.type === PunishmentType.WARN)
            .length.toString(),
          inline: true,
        },
      ],
    });

    await interaction.reply({
      embeds: [embed],
    });
  }
}
