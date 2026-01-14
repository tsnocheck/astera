import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
  logger,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } from 'discord.js';

export default class ClanCreateCommand implements ICommand {
  name = 'clan-create';
  description = 'Создать клан (только для админов)';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'name',
      description: 'Название клана',
      type: ApplicationCommandOptionType.String,
      required: true,
      minLength: 3,
      maxLength: 32,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });
    
    const adminIds = process.env.ADMIN_IDS?.split(',').map((id: string) => id.trim()) || [];
    
    if (!adminIds.includes(interaction.user.id)) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Нет прав',
            description: 'Только администраторы могут создавать кланы',
            customType: 'error',
          }),
        ],
      });
    }

    const name = interaction.options.getString('name', true);

    // Проверяем существует ли клан с таким названием
    const existingClan = await ClanModel.findOne({ name });
    if (existingClan) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Клан с таким названием уже существует',
            customType: 'error',
          }),
        ],
      });
    }

    // Проверяем не состоит ли пользователь уже в каком-либо клане
    const userClan = await ClanModel.findOne({ 'users.userID': interaction.user.id });
    if (userClan) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: `Вы уже состоите в клане **${userClan.name}**`,
            customType: 'error',
          }),
        ],
      });
    }

    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось получить сервер',
            customType: 'error',
          }),
        ],
      });
    }

    const parentCategoryId = process.env.CLAN_PARENT_CATEGORY_ID;
    if (!parentCategoryId) {
      logger.error('CLAN_PARENT_CATEGORY_ID not set in environment');
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Родительская категория не настроена',
            customType: 'error',
          }),
        ],
      });
    }

    try {
      // Получаем позицию родительской категории
      const parentCategory = guild.channels.cache.get(parentCategoryId);
      if (!parentCategory || parentCategory.type !== ChannelType.GuildCategory) {
        return interaction.editReply({
          embeds: [
            constructEmbed({
              title: '❌ Ошибка',
              description: 'Родительская категория не найдена',
              customType: 'error',
            }),
          ],
        });
      }

      // Создаем категорию клана без parent
      const category = await guild.channels.create({
        name: `🏰 ${name}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Устанавливаем позицию категории сразу после родительской
      await category.setPosition(parentCategory.position + 1);

      // Создаем текстовый канал
      const textChannel = await guild.channels.create({
        name: '💬-чат',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Создаем общий голосовой канал
      const generalVoiceChannel = await guild.channels.create({
        name: '🔊 Общий',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Создаем канал для создания комнат
      const createVoiceChannel = await guild.channels.create({
        name: '➕ Создать',
        type: ChannelType.GuildVoice,
        parent: category.id,
        permissionOverwrites: [
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      // Создаем клан с ID каналов
      const payDate = new Date();
      payDate.setDate(payDate.getDate() + 30);

      await ClanModel.create({
        owner: interaction.user.id,
        name,
        users: [{ userID: interaction.user.id, online: 0, voiceTime: 0, role: 'owner' }],
        balance: 0,
        payDate,
        coOwners: [],
        categoryId: category.id,
        textChannelId: textChannel.id,
        generalVoiceChannelId: generalVoiceChannel.id,
        createVoiceChannelId: createVoiceChannel.id,
      });

      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '✅ Клан создан',
            description: `Клан **${name}** успешно создан!\n\nКаналы:\n<#${textChannel.id}>\n<#${generalVoiceChannel.id}>\n<#${createVoiceChannel.id}>`,
            fields: [
              { name: 'Овнер', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Дата оплаты', value: `<t:${Math.floor(payDate.getTime() / 1000)}:R>`, inline: true },
            ],
            customType: 'success',
          }),
        ],
      });
    } catch (error) {
      logger.error('Error creating clan channels:', error);
      return interaction.editReply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Не удалось создать каналы клана',
            customType: 'error',
          }),
        ],
      });
    }
  }
}
