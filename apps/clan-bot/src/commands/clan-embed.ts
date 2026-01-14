import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
  logger,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, TextChannel } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class ClanEmbedCommand implements ICommand {
  name = 'clan-embed';
  description = 'Отправить рекламу клана в канал агитации';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'discohook_url',
      description: 'Ссылка с share.discohook.app с вашим эмбедом',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });
    
    const discohookUrl = interaction.options.getString('discohook_url', true);

    // Находим клан, где пользователь овнер
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не являетесь овнером клана',
            customType: 'error',
          }),
        ],
      });
    }

    // Проверяем кулдаун (24 часа)
    if (clan.lastEmbedSentAt) {
      const cooldownTime = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
      const timeSinceLastEmbed = Date.now() - clan.lastEmbedSentAt.getTime();

      if (timeSinceLastEmbed < cooldownTime) {
        const timeLeft = cooldownTime - timeSinceLastEmbed;
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

        return interaction.editReply({
          embeds: [
            constructEmbed({
              title: '⏰ Кулдаун',
              description: `Вы сможете отправить следующий эмбед через **${hoursLeft}ч ${minutesLeft}м**`,
              customType: 'error',
            }),
          ],
        });
      }
    }

    // Проверяем, что это ссылка с share.discohook.app
    if (!discohookUrl.startsWith('https://share.discohook.app/go/')) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Ссылка должна быть с share.discohook.app (формат: https://share.discohook.app/go/XXXX)',
            customType: 'error',
          }),
        ],
      });
    }

    // Извлекаем ID из URL
    const shareId = discohookUrl.split('/go/')[1]?.split('?')[0];
    if (!shareId) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Некорректная ссылка с discohook',
            customType: 'error',
          }),
        ],
      });
    }

    // Получаем данные с discohook (следуем за редиректом и парсим data параметр)
    let messageData: any;
    try {
      // Сначала получаем редирект
      const redirectResponse = await fetch(`https://share.discohook.app/go/${shareId}`, {
        redirect: 'manual',
      });
      
      if (redirectResponse.status !== 302) {
        throw new Error(`Expected redirect, got ${redirectResponse.status}`);
      }

      const location = redirectResponse.headers.get('location');
      if (!location) {
        throw new Error('No redirect location found');
      }

      // Парсим параметр data из URL редиректа
      const url = new URL(location, 'https://discohook.app');
      const dataParam = url.searchParams.get('data');
      
      if (!dataParam) {
        throw new Error('No data parameter in redirect URL');
      }

      // Декодируем base64 и парсим JSON
      const decodedData = Buffer.from(dataParam, 'base64').toString('utf-8');
      const parsedData = JSON.parse(decodedData);
      
      if (!parsedData.messages || !parsedData.messages[0]) {
        throw new Error('Invalid message structure');
      }

      messageData = parsedData.messages[0].data;
    } catch (error) {
      logger.error('Failed to fetch discohook data:', error);
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось получить данные с discohook. Проверьте корректность ссылки',
            customType: 'error',
          }),
        ],
      });
    }

    // Получаем канал агитации
    const recruitmentChannelId = process.env.CLAN_RECRUITMENT_CHANNEL_ID;
    if (!recruitmentChannelId) {
      logger.error('CLAN_RECRUITMENT_CHANNEL_ID not set in environment');
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Канал агитации не настроен',
            customType: 'error',
          }),
        ],
      });
    }

    const recruitmentChannel = await interaction.client.channels.fetch(recruitmentChannelId) as TextChannel;
    if (!recruitmentChannel || !recruitmentChannel.isTextBased()) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Канал агитации не найден',
            customType: 'error',
          }),
        ],
      });
    }

    // Отправляем сообщение в канал
    try {
      await recruitmentChannel.send(messageData);

      // Обновляем время последней отправки
      await ClanModel.updateOne(
        { _id: clan._id },
        { $set: { lastEmbedSentAt: new Date() } }
      );

      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '✅ Успешно',
            description: `Реклама клана **${clan.name}** отправлена в канал агитации!`,
            customType: 'success',
          }),
        ],
      });
    } catch (error) {
      logger.error('Failed to send message to recruitment channel:', error);
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось отправить сообщение в канал агитации',
            customType: 'error',
          }),
        ],
      });
    }
  }
}
