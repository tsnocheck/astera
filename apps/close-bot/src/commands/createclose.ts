import {
  ICommand,
  RunCommandParams,
  constructEmbed,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  EmbedBuilder,
} from 'discord.js';
import { ApplicationCommandOptionType, ButtonStyle } from 'discord-api-types/v10';
import { GameType, CloseGameModel } from '@lolz-bots/shared';

export default class CreateClose implements ICommand {
  name = 'createclose';
  description = 'Создать клоз для игры';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'game',
      description: 'Выберите игру',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'CS2', value: GameType.CS2 },
        { name: 'Dota 2', value: GameType.DOTA2 },
        { name: 'Valorant', value: GameType.VALORANT },
        { name: 'League of Legends', value: GameType.LOL },
      ],
    },
  ];

  async run({ interaction, client }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });

    const gameType = interaction.options.getString('game', true) as GameType;
    const guild = interaction.guild!;
    const parentCategoryId = process.env.CATEGORY_PARENT_ID;

    if (!parentCategoryId) {
      return interaction.editReply({
        content: 'CATEGORY_PARENT_ID не настроен в переменных окружения',
      });
    }

    // Проверяем, нет ли у ведущего активной игры
    const existingGame = await CloseGameModel.findOne({
      hostId: interaction.user.id,
      isActive: true,
    });

    if (existingGame) {
      return interaction.editReply({
        content: '❌ У вас уже есть активный клоз! Завершите его перед созданием нового.',
      });
    }

    try {
      // Получаем родительскую категорию для определения позиции
      let position: number | undefined;
      if (parentCategoryId) {
        const parentCategory = guild.channels.cache.get(parentCategoryId);
        if (parentCategory && parentCategory.type === ChannelType.GuildCategory) {
          position = parentCategory.position + 1;
        }
      }

      // Создаем категорию для игры
      const category = await guild.channels.create({
        name: `🎮 ${gameType}`,
        type: ChannelType.GuildCategory,
        position,
      });

      // Создаем текстовые каналы
      const settingsChannel = await guild.channels.create({
        name: '⚙️-настройки',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages],
          },
        ],
      });

      const registrationChannel = await guild.channels.create({
        name: '📝-запись',
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.SendMessages],
          },
        ],
      });

      const waitingChannel = await guild.channels.create({
        name: '⏳ Ожидание',
        type: ChannelType.GuildVoice,
        parent: category.id,
      });

      // Создаем embed для записи
      const registrationEmbed = constructEmbed({
        title: `Запись на ${gameType}`,
        description: 'Выберите команду для записи:',
        fields: [
          { name: 'Команда А', value: 'Пусто (0/5)', inline: true },
          { name: 'Команда Б', value: 'Пусто (0/5)', inline: true },
        ],
        customType: 'custom',
      });

      const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`close-register_${category.id}`)
          .setPlaceholder('Выберите команду')
          .addOptions([
            {
              label: 'Команда А',
              value: 'teamA',
              emoji: '🔴',
            },
            {
              label: 'Команда Б',
              value: 'teamB',
              emoji: '🔵',
            },
          ]),
      );

      await registrationChannel.send({
        embeds: [registrationEmbed],
        components: [selectMenu],
      });

      // Создаем embed для настроек
      const settingsEmbed = constructEmbed({
        title: '⚙️ Управление клозом',
        description: `Игра: **${gameType}**\nВедущий: ${interaction.user}`,
        fields: [
          { name: 'Статус', value: '🟡 Ожидание записи', inline: false },
        ],
        customType: 'custom',
      });

      const settingsButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`close-settings_kick_${category.id}`)
          .setLabel('Исключить игрока')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`close-settings_start_${category.id}`)
          .setLabel('Начать игру')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close-settings_delete_${category.id}`)
          .setLabel('Удалить клоз')
          .setStyle(ButtonStyle.Danger),
      );

      await settingsChannel.send({
        content: `Управление клозом (ID: ${category.id})`,
        embeds: [settingsEmbed],
        components: [settingsButtons],
      });

      // Сохраняем информацию об игре в БД
      const gameData = await CloseGameModel.create({
        type: gameType,
        categoryId: category.id,
        settingsChannelId: settingsChannel.id,
        registrationChannelId: registrationChannel.id,
        waitingChannelId: waitingChannel.id,
        waitingVoiceChannelId: waitingChannel.id,
        teamA: [],
        teamB: [],
        hostId: interaction.user.id,
        guildId: guild.id,
        isActive: true,
      });

      await interaction.editReply({
        content: `✅ Клоз для ${gameType} успешно создан!\nКатегория: ${category.name}`,
      });
    } catch (error) {
      console.error('Error creating close:', error);
      await interaction.editReply({
        content: '❌ Произошла ошибка при создании клоза',
      });
    }
  }
}
