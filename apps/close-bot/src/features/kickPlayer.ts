import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  CloseGameModel,
} from '@lolz-bots/shared';
import { StringSelectMenuInteraction } from 'discord.js';

export default class KickPlayer implements IFeature<StringSelectMenuInteraction> {
  name = 'close-kickplayer';

  async run({ interaction }: RunFeatureParams<StringSelectMenuInteraction>) {
    if (!interaction.isStringSelectMenu()) return;

    const selectInteraction = interaction as StringSelectMenuInteraction;
    const gameId = selectInteraction.customId.split('_')[1];
    const playerId = selectInteraction.values[0];

    // Откладываем ответ сразу, чтобы не истёк токен
    await selectInteraction.deferUpdate();

    const gameData = await CloseGameModel.findOne({ categoryId: gameId, isActive: true });
    if (!gameData) {
      return selectInteraction.editReply({
        content: '❌ Клоз не найден',
      });
    }

    // Удаляем игрока из команды
    gameData.teamA = gameData.teamA.filter((id: string) => id !== playerId);
    gameData.teamB = gameData.teamB.filter((id: string) => id !== playerId);
    await gameData.save();

    // Обновляем embed записи
    await this.updateRegistrationEmbed(selectInteraction, gameData);

    // Обновляем embed настроек
    await this.updateSettingsEmbed(selectInteraction, gameData);

    await selectInteraction.editReply({
      content: `✅ Игрок <@${playerId}> был исключен из записи`,
      components: [],
    });
  }

  private async updateRegistrationEmbed(
    interaction: StringSelectMenuInteraction,
    gameData: any,
  ) {
    const guild = interaction.guild!;
    const registrationChannel = guild.channels.cache.get(
      gameData.registrationChannelId,
    );

    if (!registrationChannel || !registrationChannel.isTextBased()) return;

    const messages = await registrationChannel.messages.fetch({ limit: 10 });
    const registrationMessage = messages.first();

    if (!registrationMessage) return;

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

    await registrationMessage.edit({
      embeds: [updatedEmbed],
    });
  }

  private async updateSettingsEmbed(
    interaction: StringSelectMenuInteraction,
    gameData: any,
  ) {
    const guild = interaction.guild!;
    const settingsChannel = guild.channels.cache.get(
      gameData.settingsChannelId,
    );

    if (!settingsChannel || !settingsChannel.isTextBased()) return;

    const messages = await settingsChannel.messages.fetch({ limit: 10 });
    const settingsMessage = messages.find((msg: any) =>
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
