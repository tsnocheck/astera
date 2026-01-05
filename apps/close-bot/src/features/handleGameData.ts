import { IFeature, RunFeatureParams, CloseGameModel, GameType } from '@lolz-bots/shared';
import { ModalSubmitInteraction } from 'discord.js';
import ManageCloseSettings from './manageSettings';

export default class HandleGameData implements IFeature<ModalSubmitInteraction> {
  name = 'close-gamedata';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    if (!interaction.isModalSubmit()) return;

    const modalInteraction = interaction as ModalSubmitInteraction;
    const gameId = modalInteraction.customId.split('_')[1];

    // Откладываем ответ, т.к. операция может занять время
    await modalInteraction.deferReply({ ephemeral: true });

    // Пытаемся найти по categoryId (новый формат) или по _id (старый формат для обратной совместимости)
    let gameData = await CloseGameModel.findOne({ categoryId: gameId, isActive: true });
    if (!gameData) {
      gameData = await CloseGameModel.findOne({ _id: gameId, isActive: true });
    }
    
    if (!gameData) {
      return modalInteraction.editReply({
        content: '❌ Клоз не найден',
      });
    }

    let connectionData;

    // Для Valorant обрабатываем только код команды
    if (gameData.type === GameType.VALORANT) {
      const teamCode = modalInteraction.fields.getTextInputValue('teamCode');
      connectionData = {
        teamCode,
      };
    } else {
      // Для других игр (CS2, Dota 2) используем название лобби и пароль
      const lobbyName = modalInteraction.fields.getTextInputValue('lobbyName');
      const password = modalInteraction.fields.getTextInputValue('password');
      connectionData = {
        lobbyName,
        password,
      };
    }

    // Используем метод startGame из ManageCloseSettings
    const manageSettings = new ManageCloseSettings();
    await manageSettings.startGame(modalInteraction, gameData, connectionData);
  }
}
