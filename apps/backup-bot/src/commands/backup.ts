import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  BackupConfigModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { ButtonStyle } from 'discord-api-types/v10';

export default class BackupCommand implements ICommand {
  name = 'backup';
  description = 'Панель управления резервными копиями сервера';
  options: ApplicationCommandOptionData[] = [];

  async run({ interaction, client }: RunCommandParams) {
    await interaction.deferReply({ ephemeral: true });

    // Проверка прав администратора
    const adminIds = process.env.ADMIN_IDS?.split(',').map((id: string) => id.trim()) || [];
    const isAdmin = adminIds.includes(interaction.user.id);

    if (!isAdmin) {
      return interaction.editReply({
        content: '❌ У вас нет прав для управления бекапами',
      });
    }

    const config = await BackupConfigModel.findOne({ guildId: interaction.guild!.id });
    
    // Строим панель управления
    await this.showControlPanel(interaction, client, config);
  }

  private async showControlPanel(interaction: any, client: any, config: any) {
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
    } else {
      fields.push({
        name: '⚠️ Настройки',
        value: 'Бекапы не настроены. Используйте кнопки ниже для настройки.',
        inline: false,
      });
    }

    const embed = constructEmbed({
      title: '💾 Панель управления бекапами',
      description: 'Управление автоматическими резервными копиями сервера',
      fields,
      customType: config?.isEnabled ? 'success' : 'custom',
    });

    // Кнопки управления
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
        .setCustomId('backup-clear-target')
        .setLabel('🗑️ Очистить бекап')
        .setStyle(ButtonStyle.Danger)
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
}
