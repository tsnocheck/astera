import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { 
  ApplicationCommandOptionData, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
} from 'discord.js';

export default class ClanCommand implements ICommand {
  name = 'clan';
  description = 'Управление кланом';
  options: ApplicationCommandOptionData[] = [];

  async run({ interaction }: RunCommandParams) {
    // Находим клан пользователя
    const clan = await ClanModel.findOne({ 'users.userID': interaction.user.id });

    if (!clan) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '❌ Ошибка',
            description: 'Вы не состоите ни в одном клане',
            customType: 'error',
          }),
        ],
        ephemeral: true,
      });
    }

    const isOwner = clan.owner === interaction.user.id;
    const isCoOwner = clan.coOwners.includes(interaction.user.id);
    const canManage = isOwner || isCoOwner;

    // Подсчитываем онлайн - только участники в голосовых каналах категории клана
    let onlineCount = 0;
    if (clan.categoryId && interaction.guild) {
      const category = interaction.guild.channels.cache.get(clan.categoryId);
      if (category) {
        interaction.guild.channels.cache.forEach(channel => {
          if (channel.parentId === clan.categoryId && channel.isVoiceBased()) {
            onlineCount += channel.members.size;
          }
        });
      }
    }
    const totalOnline = onlineCount;

    const embed = constructEmbed({
      title: `🏰 ${clan.name}`,
      description: clan.description || 'Описание отсутствует',
      fields: [
        { name: '👑 Овнер', value: `<@${clan.owner}>`, inline: true },
        { name: '💰 Баланс', value: `${clan.balance} ₽`, inline: true },
        { name: '⏰ Онлайн', value: `${totalOnline} ч`, inline: true },
        { name: '👥 Участников', value: `${clan.users.length}`, inline: true },
        { name: '📅 Оплата до', value: `<t:${Math.floor(clan.payDate.getTime() / 1000)}:R>`, inline: true },
      ],
      customType: 'custom',
      image: clan.avatarURL ? { url: clan.avatarURL } : undefined,
    });

    // Кнопки управления
    const rows = [];

    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('clanProfile')
        .setLabel('👥 Список участников')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('clanVoiceActivity')
        .setLabel('🎤 Голосовая активность')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('clanLeave')
        .setLabel('🚪 Покинуть клан')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(isOwner)
    );

    rows.push(row1);

    if (canManage) {
      const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('clanInvite')
          .setLabel('➕ Пригласить')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('clanKick')
          .setLabel('➖ Исключить')
          .setStyle(ButtonStyle.Danger)
      );
      rows.push(row2);
    }

    if (isOwner) {
      const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('clanAddCoowner')
          .setLabel('👨‍💼 Назначить со-овнера')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('clanEditDescription')
          .setLabel('✏️ Изменить описание')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('clanDeleteAvatar')
          .setLabel('🗑️ Удалить аватарку')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!clan.avatarURL)
      );
      rows.push(row3);
    }

    return interaction.reply({
      embeds: [embed],
      components: rows,
      ephemeral: true,
    });
  }
}
