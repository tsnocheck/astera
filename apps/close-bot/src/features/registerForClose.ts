import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  CloseGameModel,
} from '@lolz-bots/shared';
import { StringSelectMenuInteraction } from 'discord.js';

export default class RegisterForClose implements IFeature<StringSelectMenuInteraction> {
  name = 'close-register';

  async run({ interaction }: RunFeatureParams<StringSelectMenuInteraction>) {
    if (!interaction.isStringSelectMenu()) return;

    const selectInteraction = interaction as StringSelectMenuInteraction;
    const gameId = selectInteraction.customId.split('_')[1];
    const team = selectInteraction.values[0];
    const userId = selectInteraction.user.id;

    const gameData = await CloseGameModel.findOne({ categoryId: gameId, isActive: true });
    if (!gameData) {
      return selectInteraction.reply({
        content: '❌ Клоз не найден',
        ephemeral: true,
      });
    }

    // Проверяем, не записан ли игрок уже
    const isInTeamA = gameData.teamA.includes(userId);
    const isInTeamB = gameData.teamB.includes(userId);

    if (isInTeamA || isInTeamB) {
      // Снимаем с записи
      if (isInTeamA) {
        gameData.teamA = gameData.teamA.filter((id: string) => id !== userId);
      }
      if (isInTeamB) {
        gameData.teamB = gameData.teamB.filter((id: string) => id !== userId);
      }

      await gameData.save();
      await this.updateRegistrationEmbed(selectInteraction, gameData);
      return selectInteraction.reply({
        content: '✅ Вы сняты с записи',
        ephemeral: true,
      });
    }

    // Добавляем игрока в команду
    if (team === 'teamA') {
      if (gameData.teamA.length >= 5) {
        return selectInteraction.reply({
          content: '❌ Команда А уже заполнена',
          ephemeral: true,
        });
      }
      gameData.teamA.push(userId);
    } else if (team === 'teamB') {
      if (gameData.teamB.length >= 5) {
        return selectInteraction.reply({
          content: '❌ Команда Б уже заполнена',
          ephemeral: true,
        });
      }
      gameData.teamB.push(userId);
    }

    await gameData.save();
    await this.updateRegistrationEmbed(selectInteraction, gameData);
    await selectInteraction.reply({
      content: `✅ Вы записаны в ${team === 'teamA' ? 'Команду А' : 'Команду Б'}`,
      ephemeral: true,
    });
  }

  private async updateRegistrationEmbed(
    interaction: StringSelectMenuInteraction,
    gameData: any,
  ) {
    const teamAText =
      gameData.teamA.length > 0
        ? gameData.teamA.map((id: string) => `<@${id}>`).join('\n')
        : 'Пусто';
    const teamBText =
      gameData.teamB.length > 0
        ? gameData.teamB.map((id: string) => `<@${id}>`).join('\n')
        : 'Пусто';

    const updatedEmbed = constructEmbed({
      title: `Запись на ${gameData.type}`,
      description: 'Выберите команду для записи:',
      fields: [
        {
          name: `Команда А (${gameData.teamA.length}/5)`,
          value: teamAText,
          inline: true,
        },
        {
          name: `Команда Б (${gameData.teamB.length}/5)`,
          value: teamBText,
          inline: true,
        },
      ],
      customType: 'custom',
    });

    await interaction.message.edit({
      embeds: [updatedEmbed],
    });

    // Обновляем также канал настроек
    await this.updateSettingsChannel(interaction, gameData);
  }

  private async updateSettingsChannel(
    interaction: StringSelectMenuInteraction,
    gameData: any,
  ) {
    const guild = interaction.guild!;
    const settingsChannel = guild.channels.cache.get(
      gameData.settingsChannelId,
    );
    if (!settingsChannel || !settingsChannel.isTextBased()) return;

    const messages = await settingsChannel.messages.fetch({ limit: 10 });
    const settingsMessage = messages.find((msg) =>
      msg.content.includes(`ID: ${gameData.categoryId}`),
    );

    if (!settingsMessage) return;

    const totalPlayers = gameData.teamA.length + gameData.teamB.length;
    const statusText =
      totalPlayers === 10 ? '🟢 Готово к запуску' : '🟡 Ожидание записи';

    const updatedEmbed = constructEmbed({
      title: '⚙️ Управление клозом',
      description: `Игра: **${gameData.type}**\nВедущий: <@${gameData.hostId}>`,
      fields: [
        { name: 'Статус', value: statusText, inline: false },
        {
          name: 'Игроков записано',
          value: `${totalPlayers}/10`,
          inline: true,
        },
      ],
      customType: 'custom',
    });

    await settingsMessage.edit({
      embeds: [updatedEmbed],
    });
  }
}
