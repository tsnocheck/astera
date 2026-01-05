import {
  IFeature,
  RunFeatureParams,
  constructEmbed,
  BackupConfigModel,
  logger,
} from '@lolz-bots/shared';
import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalSubmitInteraction,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';
import { BackupService } from '../services/BackupService';

export default class BackupButtons implements IFeature<ButtonInteraction | ModalSubmitInteraction> {
  name = 'backup';

  async run({ interaction, client }: RunFeatureParams<ButtonInteraction | ModalSubmitInteraction>) {
    // Проверка прав
    const adminIds = process.env.ADMIN_IDS?.split(',').map((id: string) => id.trim()) || [];
    const isAdmin = adminIds.includes(interaction.user.id);

    if (!isAdmin) {
      if (interaction.isButton()) {
        return interaction.reply({
          content: '❌ У вас нет прав для управления бекапами',
          ephemeral: true,
        });
      } else {
        await interaction.deferReply({ ephemeral: true });
        return interaction.editReply({
          content: '❌ У вас нет прав для управления бекапами',
        });
      }
    }

    if (interaction.isButton()) {
      const action = interaction.customId.replace('backup-', '');

      switch (action) {
        case 'settings':
          await this.handleSettings(interaction, client);
          break;
        case 'run':
          await this.handleRun(interaction, client);
          break;
        case 'clear-target':
          await this.handleClearTarget(interaction, client);
          break;
        case 'toggle':
          await this.handleToggle(interaction, client);
          break;
        case 'panel':
          await this.handlePanel(interaction, client);
          break;
      }
    } else if (interaction.isModalSubmit()) {
      await this.handleModalSubmit(interaction, client);
    }
  }

  private async handleSettings(interaction: ButtonInteraction, client: any) {
    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });

    const modal = new ModalBuilder()
      .setCustomId('backup-settings-modal')
      .setTitle('⚙️ Настройки бекапов');

    const sourceServerInput = new TextInputBuilder()
      .setCustomId('sourceServer')
      .setLabel('ID исходного сервера (откуда копируем)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Введите ID сервера-источника')
      .setValue(config?.guildId || interaction.guild!.id);

    const targetServerInput = new TextInputBuilder()
      .setCustomId('targetServer')
      .setLabel('ID целевого сервера (куда копируем)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Введите ID сервера для бекапа');

    if (config) {
      targetServerInput.setValue(config.targetGuildId);
    }

    const frequencyInput = new TextInputBuilder()
      .setCustomId('frequency')
      .setLabel('Частота бекапов (в часах)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('От 1 до 168 часов')
      .setValue(config?.frequencyHours.toString() || '24');

    const logsChannelInput = new TextInputBuilder()
      .setCustomId('logsChannel')
      .setLabel('ID канала для логов')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('Введите ID канала');

    if (config) {
      logsChannelInput.setValue(config.logsChannelId);
    }

    const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(sourceServerInput);
    const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(targetServerInput);
    const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(frequencyInput);
    const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(logsChannelInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);
    await interaction.showModal(modal);
  }

  private async handleRun(interaction: ButtonInteraction, client: any) {
    await interaction.deferReply({ ephemeral: true });

    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });
    if (!config) {
      return interaction.editReply({
        content: '❌ Бекапы не настроены',
      });
    }

    const sourceGuild = interaction.guild!;
    const targetGuild = client.guilds.cache.get(config.targetGuildId);

    if (!targetGuild) {
      return interaction.editReply({
        content: '❌ Целевой сервер не найден',
      });
    }

    await interaction.editReply({
      content: '⏳ Запуск резервного копирования...',
    });

    const backupService = new BackupService(client);
    try {
      await backupService.createBackup(sourceGuild, targetGuild, config);
      await interaction.editReply({
        content: '✅ Резервное копирование завершено успешно!',
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Ошибка при создании бекапа: ${error.message}`,
      });
    }
  }

  private async handleToggle(interaction: ButtonInteraction, client: any) {
    await interaction.deferUpdate();

    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });
    if (!config) {
      return interaction.followUp({
        content: '❌ Бекапы не настроены',
        ephemeral: true,
      });
    }

    config.isEnabled = !config.isEnabled;

    if (config.isEnabled) {
      const nextBackup = new Date();
      nextBackup.setHours(nextBackup.getHours() + config.frequencyHours);
      config.nextBackup = nextBackup;
    }

    await config.save();

    // Обновляем панель
    await this.updatePanel(interaction, client, config);
  }

  private async updatePanel(interaction: any, client: any, config: any) {
    const fields: any[] = [];

    if (config) {
      const sourceGuild = client.guilds.cache.get(config.guildId);
      const targetGuild = client.guilds.cache.get(config.targetGuildId);
      
      fields.push(
        {
          name: '📊 Статус',
          value: config.isEnabled ? '🟢 Активно' : '🔴 Отключено',
          inline: true,
        },
        {
          name: '📤 Исходный сервер',
          value: sourceGuild ? sourceGuild.name : 'Не найден',
          inline: true,
        },
        {
          name: '📥 Целевой сервер',
          value: targetGuild ? targetGuild.name : 'Не найден',
          inline: true,
        },
        {
          name: '⏱️ Частота',
          value: `${config.frequencyHours} ч.`,
          inline: true,
        },
        {
          name: '📝 Канал логов',
          value: `<#${config.logsChannelId}>`,
          inline: true,
        },
        {
          name: '📅 Последний бекап',
          value: config.lastBackup
            ? `<t:${Math.floor(config.lastBackup.getTime() / 1000)}:R>`
            : 'Еще не было',
          inline: true,
        },
        {
          name: '⏭️ Следующий бекап',
          value:
            config.isEnabled && config.nextBackup
              ? `<t:${Math.floor(config.nextBackup.getTime() / 1000)}:R>`
              : 'Не запланирован',
          inline: true,
        }
      );
    }

    const embed = constructEmbed({
      title: '💾 Панель управления бекапами',
      description: 'Управление автоматическими резервными копиями сервера',
      fields,
      customType: config?.isEnabled ? 'success' : 'custom',
    });

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('backup-settings')
        .setLabel('⚙️ Настройки')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('backup-run')
        .setLabel('▶️ Запустить')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!config),
      new ButtonBuilder()
        .setCustomId('backup-toggle')
        .setLabel(config?.isEnabled ? '⏸️ Отключить' : '▶️ Включить')
        .setStyle(config?.isEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(!config)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  }

  private async handlePanel(interaction: ButtonInteraction, client: any) {
    await interaction.deferUpdate();

    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });

    const fields: any[] = [];

    if (config) {
      const sourceGuild = client.guilds.cache.get(config.guildId);
      const targetGuild = client.guilds.cache.get(config.targetGuildId);

      fields.push(
        {
          name: '📊 Статус',
          value: config.isEnabled ? '🟢 Активно' : '🔴 Отключено',
          inline: true,
        },
        {
          name: '📤 Исходный сервер',
          value: sourceGuild ? sourceGuild.name : 'Не найден',
          inline: true,
        },
        {
          name: '📥 Целевой сервер',
          value: targetGuild ? targetGuild.name : 'Не найден',
          inline: true,
        },
        {
          name: '⏱️ Частота',
          value: `${config.frequencyHours} ч.`,
          inline: true,
        },
        {
          name: '📝 Канал логов',
          value: `<#${config.logsChannelId}>`,
          inline: true,
        },
        {
          name: '📅 Последний бекап',
          value: config.lastBackup
            ? `<t:${Math.floor(config.lastBackup.getTime() / 1000)}:R>`
            : 'Еще не было',
          inline: true,
        },
        {
          name: '⏭️ Следующий бекап',
          value:
            config.isEnabled && config.nextBackup
              ? `<t:${Math.floor(config.nextBackup.getTime() / 1000)}:R>`
              : 'Не запланирован',
          inline: true,
        }
      );
    }

    const embed = constructEmbed({
      title: '💾 Панель управления бекапами',
      description: 'Управление автоматическими резервными копиями сервера',
      fields,
      customType: config?.isEnabled ? 'success' : 'custom',
    });

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('backup-settings')
        .setLabel('⚙️ Настройки')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('backup-run')
        .setLabel('▶️ Запустить')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!config),
      new ButtonBuilder()
        .setCustomId('backup-toggle')
        .setLabel(config?.isEnabled ? '⏸️ Отключить' : '▶️ Включить')
        .setStyle(config?.isEnabled ? ButtonStyle.Secondary : ButtonStyle.Success)
        .setDisabled(!config)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });
  }

  private async handleModalSubmit(interaction: ModalSubmitInteraction, client: any) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const sourceServerId = interaction.fields.getTextInputValue('sourceServer').trim();
      const targetServerId = interaction.fields.getTextInputValue('targetServer').trim();
      const frequencyStr = interaction.fields.getTextInputValue('frequency').trim();
      const logsChannelId = interaction.fields.getTextInputValue('logsChannel').trim();

      // Валидация частоты
      const frequency = parseInt(frequencyStr);
      if (isNaN(frequency) || frequency < 1 || frequency > 168) {
        return interaction.editReply({
          content: '❌ Частота должна быть числом от 1 до 168 часов',
        });
      }

      // Проверяем доступ к исходному серверу
      const sourceGuild = client.guilds.cache.get(sourceServerId);
      if (!sourceGuild) {
        return interaction.editReply({
          content: '❌ Бот не имеет доступа к исходному серверу. Проверьте ID сервера.',
        });
      }

      // Проверяем доступ к целевому серверу
      const targetGuild = client.guilds.cache.get(targetServerId);
      if (!targetGuild) {
        return interaction.editReply({
          content: '❌ Бот не имеет доступа к указанному серверу. Проверьте ID сервера.',
        });
      }

      // Проверяем права бота на целевом сервере
      const botMember = targetGuild.members.cache.get(client.user!.id);
      if (!botMember?.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.editReply({
          content: '❌ Бот должен иметь права администратора на целевом сервере',
        });
      }

      // Проверяем канал логов (ищем на исходном сервере)
      const logsChannel = sourceGuild.channels.cache.get(logsChannelId);
      if (!logsChannel || !logsChannel.isTextBased()) {
        return interaction.editReply({
          content: '❌ Указанный канал логов не найден или не является текстовым на исходном сервере',
        });
      }

      // Сохраняем конфигурацию
      const nextBackup = new Date();
      nextBackup.setHours(nextBackup.getHours() + frequency);

      const config = await BackupConfigModel.findOneAndUpdate(
        { guildId: sourceServerId },
        {
          guildId: sourceServerId,
          targetGuildId: targetServerId,
          frequencyHours: frequency,
          logsChannelId: logsChannelId,
          isEnabled: true,
          nextBackup,
        },
        { upsert: true, new: true }
      );

      const embed = constructEmbed({
        title: '✅ Настройки сохранены',
        description: 'Конфигурация бекапов успешно обновлена',
        fields: [
          { name: 'Исходный сервер', value: sourceGuild.name, inline: true },
          { name: 'Целевой сервер', value: targetGuild.name, inline: true },
          { name: 'Частота', value: `${frequency} ч.`, inline: true },
          { name: 'Канал логов', value: `<#${logsChannelId}>`, inline: true },
          {
            name: 'Следующий бекап',
            value: `<t:${Math.floor(nextBackup.getTime() / 1000)}:R>`,
            inline: false,
          },
        ],
        customType: 'success',
      });

      const backButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('backup-panel')
          .setLabel('🔙 Вернуться к панели')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.editReply({ embeds: [embed], components: [backButton] });
    } catch (error) {
      logger.error('[BackupModal] Error processing modal:', error);
      try {
        await interaction.editReply({
          content: `❌ Ошибка при сохранении настроек: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        });
      } catch (replyError) {
        logger.error('[BackupModal] Failed to send error message:', replyError);
      }
    }
  }

  private async handleClearTarget(interaction: ButtonInteraction, client: any) {
    await interaction.deferReply({ ephemeral: true });

    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });
    if (!config) {
      return interaction.editReply({
        content: '❌ Бекапы не настроены',
      });
    }

    const targetGuild = client.guilds.cache.get(config.targetGuildId);
    if (!targetGuild) {
      return interaction.editReply({
        content: '❌ Целевой сервер не найден',
      });
    }

    await interaction.editReply({
      content: '⏳ Очистка бекап сервера...',
    });

    const backupService = new BackupService(client);
    try {
      await backupService.clearTargetServer(targetGuild);
      await interaction.editReply({
        content: '✅ Бекап сервер очищен! Все каналы и роли (кроме системных) удалены.',
      });
    } catch (error: any) {
      await interaction.editReply({
        content: `❌ Ошибка при очистке сервера: ${error.message}`,
      });
    }
  }
}
