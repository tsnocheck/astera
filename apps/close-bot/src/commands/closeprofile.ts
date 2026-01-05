import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  CloseGameModel,
  GameType,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  EmbedField,
} from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class CloseProfile implements ICommand {
  name = 'closeprofile';
  description = 'Просмотр статистики проведенных клозов';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'Пользователь для просмотра статистики',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild!;
    const closerRoleId = process.env.CLOSER_ROLE_ID;

    // Проверяем, есть ли у пользователя роль клозера
    const member = await guild.members.fetch(targetUser.id);
    const hasCloserRole = closerRoleId && member.roles.cache.has(closerRoleId);

    if (!hasCloserRole && closerRoleId) {
      return interaction.editReply({
        content: '❌ У этого пользователя нет роли клозера',
      });
    }

    try {
      // Получаем все завершенные клозы пользователя
      const completedGames = await CloseGameModel.find({
        hostId: targetUser.id,
        completedAt: { $exists: true },
      });

      // Подсчитываем статистику по каждой игре
      const stats = {
        [GameType.CS2]: 0,
        [GameType.DOTA2]: 0,
        [GameType.VALORANT]: 0,
        [GameType.LOL]: 0,
      };

      completedGames.forEach((game) => {
        stats[game.type]++;
      });

      const totalGames = completedGames.length;

      // Формируем поля для embed
      const fields: EmbedField[] = [
        {
          name: '🎮 Всего клозов',
          value: `${totalGames}`,
          inline: false,
        },
        {
          name: '━━━━━━━━━━━━━━',
          value: '** **',
          inline: false,
        },
      ];

      // Добавляем статистику по каждой игре
      if (stats[GameType.CS2] > 0) {
        fields.push({
          name: '🔫 Counter-Strike 2',
          value: `${stats[GameType.CS2]} ${this.pluralizeGames(stats[GameType.CS2])}`,
          inline: true,
        });
      }

      if (stats[GameType.DOTA2] > 0) {
        fields.push({
          name: '⚔️ Dota 2',
          value: `${stats[GameType.DOTA2]} ${this.pluralizeGames(stats[GameType.DOTA2])}`,
          inline: true,
        });
      }

      if (stats[GameType.VALORANT] > 0) {
        fields.push({
          name: '🎯 Valorant',
          value: `${stats[GameType.VALORANT]} ${this.pluralizeGames(stats[GameType.VALORANT])}`,
          inline: true,
        });
      }

      if (stats[GameType.LOL] > 0) {
        fields.push({
          name: '🏆 League of Legends',
          value: `${stats[GameType.LOL]} ${this.pluralizeGames(stats[GameType.LOL])}`,
          inline: true,
        });
      }

      // Если ни одного клоза не проведено
      if (totalGames === 0) {
        fields.push({
          name: '📊 Статистика',
          value: 'Пока не проведено ни одного клоза',
          inline: false,
        });
      }

      // Получаем последний завершенный клоз
      const lastGame = completedGames.sort(
        (a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
      )[0];

      if (lastGame && lastGame.completedAt) {
        fields.push(
          {
            name: '━━━━━━━━━━━━━━',
            value: '** **',
            inline: false,
          },
          {
            name: '📅 Последний клоз',
            value: `**${lastGame.type}**\n<t:${Math.floor(lastGame.completedAt.getTime() / 1000)}:R>`,
            inline: false,
          }
        );
      }

      const embed = constructEmbed({
        title: `📊 Статистика клозера ${targetUser.username}`,
        description: hasCloserRole
          ? `<@&${closerRoleId}> • ID: ${targetUser.id}`
          : `ID: ${targetUser.id}`,
        fields,
        thumbnail: {
          url: targetUser.displayAvatarURL({ size: 256 }),
        },
        customType: 'custom',
      });

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (error) {
      console.error('Error fetching close profile:', error);
      await interaction.editReply({
        content: '❌ Произошла ошибка при получении статистики',
      });
    }
  }

  private pluralizeGames(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return 'клозов';
    }

    if (lastDigit === 1) {
      return 'клоз';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return 'клоза';
    }

    return 'клозов';
  }
}
