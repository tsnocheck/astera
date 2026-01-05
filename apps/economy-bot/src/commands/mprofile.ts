import {
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
  MarryModel,
  constructEmbed,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
} from 'discord.js';
import {
  ButtonStyle,
  TextInputStyle,
} from 'discord-api-types/v10';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { readFile } from 'fs/promises';
import { join } from 'path';

export default class MProfile implements ICommand {
  name = 'mprofile';
  description = 'View your marriage profile';

  features = [new DepositMarryBalance(), new SubmitDepositMarryBalance()];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply();
    
    const user = interaction.user;

    // Проверяем наличие брака
    const marriage = await MarryModel.findOne({
      $or: [{ user1: user.id }, { user2: user.id }],
    });

    if (!marriage) {
      await interaction.editReply({
        embeds: [
          constructEmbed({
            description: 'Вы не состоите в браке!',
            customType: 'error',
          }),
        ],
      });
      return;
    }

    const partnerId = marriage.user1 === user.id ? marriage.user2 : marriage.user1;

    try {
      // Получаем данные пользователей
      const user1 = await interaction.client.users.fetch(marriage.user1);
      const user2 = await interaction.client.users.fetch(marriage.user2);

      const user1Profile = await UserModel.findOne({ discordID: marriage.user1 });
      const user2Profile = await UserModel.findOne({ discordID: marriage.user2 });

      // Canvas dimensions
      const width = 960;
      const height = 472;

      // Регистрируем шрифт
      GlobalFonts.registerFromPath(join(__dirname, '../etc/arial.ttf'), 'Arial');

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Загружаем фон (можно использовать другой фон для marry profile)
      try {
        const background = await readFile(join(__dirname, '../etc/mprofile.png'));
        const backgroundImage = await loadImage(background);
        ctx.drawImage(backgroundImage, 0, 0, width, height);
      } catch (bgError) {
        console.error('Background load error:', bgError);
        // Черный фон если фон не загрузился
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }

      // Рисуем первую аватарку (слева) с поворотом влево
      try {
        const avatar1URL = user1.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar1 = await loadImage(avatar1URL);
        const avatarSize = 235;
        const avatar1X = 410;
        const avatar1Y = 77;
        
        ctx.save();
        ctx.translate(avatar1X, avatar1Y + avatarSize / 2);
        ctx.rotate(-1.2 * Math.PI / 180); // Поворот на -5 градусов
        ctx.drawImage(avatar1, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
      } catch (avatarError) {
        console.error('Avatar 1 load error:', avatarError);
      }

      // Рисуем вторую аватарку (справа) с поворотом вправо
      try {
        const avatar2URL = user2.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar2 = await loadImage(avatar2URL);
        const avatarSize = 275;
        const avatar2X = 705;
        const avatar2Y = 65;
        
        ctx.save();
        ctx.translate(avatar2X, avatar2Y + avatarSize / 2);
        ctx.rotate(6 * Math.PI / 180); // Поворот на 5 градусов
        ctx.drawImage(avatar2, -avatarSize / 2, -avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();
      } catch (avatarError) {
        console.error('Avatar 2 load error:', avatarError);
      }

      // Настройки текста
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000000';

      // Первый ник с поворотом влево
      ctx.save();
      ctx.translate(385, 355);
      ctx.rotate(-1.2 * Math.PI / 180);
      ctx.font = 'bold 32px Arial';
      const displayName1 = user1.username.length > 10 
        ? user1.username.substring(0, 10) + '...' 
        : user1.username;
      ctx.fillText(displayName1, 0, 0);
      ctx.restore();

      // Второй ник с поворотом вправо
      ctx.save();
      ctx.translate(650, 380);
      ctx.rotate(6 * Math.PI / 180);
      ctx.font = 'bold 32px Arial';
      const displayName2 = user2.username.length > 10 
        ? user2.username.substring(0, 10) + '...' 
        : user2.username;
      ctx.fillText(displayName2, 0, 0);
      ctx.restore();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';

      // Баланс брака с поворотом -1.1 градуса
      ctx.save();
      ctx.translate(140, 215);
      ctx.rotate(1.1 * Math.PI / 180);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${marriage.balance}`, 0, 0);
      ctx.restore();

      // Общий онлайн с поворотом -1.1 градуса
      const hours = Math.floor(marriage.online / (60 * 60 * 1000));
      const minutes = Math.floor((marriage.online % (60 * 60 * 1000)) / (60 * 1000));

      ctx.save();
      ctx.translate(140, 290);
      ctx.rotate(1.1 * Math.PI / 180);
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${hours}ч ${minutes}м`, 0, 0);
      ctx.restore();

      const canvasBuffer = await canvas.encode('png');
      
      const attachment = new AttachmentBuilder(canvasBuffer, {
        name: 'mprofile.png',
      });

      // Создаем кнопку пополнения
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`mprofile-deposit_${user.id}`)
          .setLabel('Пополнить баланс')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({
        files: [attachment],
        components: [row],
      });
    } catch (error) {
      console.error('Error generating marry profile canvas:', error);
      await interaction.editReply({
        content: 'Произошла ошибка при генерации профиля брака.',
      });
    }
  }
}

class DepositMarryBalance implements IFeature<ButtonInteraction> {
  name = 'mprofile-deposit';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const [, initiatorId] = interaction.customId.split('_');

    if (interaction.user.id !== initiatorId) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Это не ваш профиль.',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Создаем модальное окно
    const modal = new ModalBuilder()
      .setCustomId(`mprofile-deposit-submit_${interaction.user.id}`)
      .setTitle('Пополнить баланс брака');

    const amountInput = new TextInputBuilder()
      .setCustomId('amount')
      .setLabel('Введите сумму для пополнения')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('1000')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(10);

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }
}

class SubmitDepositMarryBalance implements IFeature<ModalSubmitInteraction> {
  name = 'mprofile-deposit-submit';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const userId = interaction.user.id;
    const amountStr = interaction.fields.getTextInputValue('amount');
    const amount = parseInt(amountStr);

    // Проверка на корректность суммы
    if (isNaN(amount) || amount <= 0) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Укажите корректную сумму (положительное число)!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверяем наличие брака
    const marriage = await MarryModel.findOne({
      $or: [{ user1: userId }, { user2: userId }],
    });

    if (!marriage) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: 'Вы не состоите в браке!',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Проверяем баланс пользователя
    const userProfile = await UserModel.findOne({ discordID: userId });
    if (!userProfile || userProfile.coins < amount) {
      await interaction.reply({
        embeds: [
          constructEmbed({
            description: `Недостаточно средств! У вас: ${userProfile?.coins || 0} монет.`,
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
      return;
    }

    // Списываем с пользователя
    userProfile.coins -= amount;
    await userProfile.save();

    // Пополняем баланс брака
    marriage.balance += amount;
    await marriage.save();

    const partnerId = marriage.user1 === userId ? marriage.user2 : marriage.user1;

    await interaction.reply({
      embeds: [
        constructEmbed({
          description: `✅ Вы пополнили баланс брака на ${amount} монет!\nТекущий баланс: ${marriage.balance}`,
          customType: 'success',
        }),
      ],
    });
  }
}
