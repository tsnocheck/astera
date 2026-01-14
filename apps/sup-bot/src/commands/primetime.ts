import {
  ICommand,
  IFeature,
  RunCommandParams,
  RunFeatureParams,
  PrimeTimeModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  EmbedBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  UserSelectMenuInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';
import { supConfig } from '../config';

interface TimeRange {
  start: string;
  end: string;
}

const timeGroups: Record<string, TimeRange> = {
  oneGroup: { start: '00:00', end: '02:00' },
  twoGroup: { start: '02:00', end: '04:00' },
  threeGroup: { start: '04:00', end: '06:00' },
  fourGroup: { start: '06:00', end: '08:00' },
  fiveGroup: { start: '08:00', end: '10:00' },
  sixGroup: { start: '10:00', end: '12:00' },
  sevenGroup: { start: '12:00', end: '14:00' },
  eightGroup: { start: '14:00', end: '16:00' },
  nineGroup: { start: '16:00', end: '18:00' },
  tenGroup: { start: '18:00', end: '20:00' },
  elevenGroup: { start: '20:00', end: '22:00' },
  twelveGroup: { start: '22:00', end: '24:00' },
};

export default class PrimeTimeCommand implements ICommand {
  name = 'primetime';
  description = 'Выставить рабочее время для рабов';
  options: ApplicationCommandOptionData[] = [];

  features = [new SelectSlaveFeature(), new SelectPtTimeFeature()];

  async run({ interaction }: RunCommandParams) {
    const member = interaction.guild!.members.cache.get(interaction.user.id);
    if (!member?.roles.cache.has(supConfig.roles.acceptRolePtGet)) {
      return interaction.reply({
        content: 'У вас нет доступа к этой команде',
        ephemeral: true,
      });
    }

    const emb = new EmbedBuilder()
      .setTitle('Выставить прайм тайм')
      .setDescription('Выберите 5 пользователей, которым хотите выставить прайм тайм')
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setColor(0x2b2d31)
      .setTimestamp();

    const selectMenu = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`selectSlave-${interaction.user.id}`)
        .setPlaceholder('Выберите рабов')
        .setMaxValues(5)
    );

    await interaction.reply({
      embeds: [emb],
      components: [selectMenu],
      ephemeral: true,
    });
  }
}

class SelectSlaveFeature implements IFeature<UserSelectMenuInteraction> {
  name = 'selectSlave';

  async run({ interaction, client }: RunFeatureParams<UserSelectMenuInteraction>) {
    const users = interaction.values;

    const embWait = new EmbedBuilder()
      .setTitle('Выставить прайм тайм')
      .setDescription(`**Происходит обработка**`)
      .setColor(0x2b2d31)
      .setTimestamp()
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }));

    await interaction.update({ embeds: [embWait], components: [] });

    // Собираем информацию о пользователях
    let members = '';
    const userIds: string[] = [];

    for (const userId of users) {
      const member = await interaction.guild!.members.fetch(userId).catch(() => null);
      if (member) {
        members += `${member.user.username}\n`;
        userIds.push(userId);
      }
    }

    // Сохраняем список пользователей во временное хранилище (можно использовать Map или временную БД)
    if (!client.tempData) client.tempData = new Map();
    client.tempData.set(`ptUsers_${interaction.user.id}`, userIds);

    const emb = new EmbedBuilder()
      .setTitle('Выставить прайм тайм')
      .setDescription(
        `Выберите какой прайм тайм вы хотите выставить пользователям ниже:\n\n**${members}**`
      )
      .setColor(0x2b2d31)
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({
        text: 'Если вы не нашли кого-то, значит он не стоит на саппорте.',
      })
      .setTimestamp();

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`selectPtTime-${interaction.user.id}`)
        .addOptions([
          { label: '00:00 - 02:00', value: 'oneGroup' },
          { label: '02:00 - 04:00', value: 'twoGroup' },
          { label: '04:00 - 06:00', value: 'threeGroup' },
          { label: '06:00 - 08:00', value: 'fourGroup' },
          { label: '08:00 - 10:00', value: 'fiveGroup' },
          { label: '10:00 - 12:00', value: 'sixGroup' },
          { label: '12:00 - 14:00', value: 'sevenGroup' },
          { label: '14:00 - 16:00', value: 'eightGroup' },
          { label: '16:00 - 18:00', value: 'nineGroup' },
          { label: '18:00 - 20:00', value: 'tenGroup' },
          { label: '20:00 - 22:00', value: 'elevenGroup' },
          { label: '22:00 - 24:00', value: 'twelveGroup' },
        ])
    );

    await interaction.editReply({ embeds: [emb], components: [selectMenu] });
  }
}

class SelectPtTimeFeature implements IFeature<StringSelectMenuInteraction> {
  name = 'selectPtTime';

  async run({ interaction, client }: RunFeatureParams<StringSelectMenuInteraction>) {
    const selectedGroup = interaction.values[0];
    const timeRange = timeGroups[selectedGroup];

    if (!timeRange) {
      return interaction.update({
        content: 'Ошибка: неверный временной диапазон',
        components: [],
      });
    }

    // Получаем сохраненный список пользователей
    const userIds = client.tempData?.get(`ptUsers_${interaction.user.id}`) as string[];

    if (!userIds || userIds.length === 0) {
      return interaction.update({
        content: 'Ошибка: пользователи не найдены',
        components: [],
      });
    }

    // Обновляем PrimeTime для каждого пользователя
    for (const userId of userIds) {
      await PrimeTimeModel.findOneAndUpdate(
        { guild: interaction.guildId!, userId },
        {
          startPrimeTime: timeRange.start,
          endPrimeTime: timeRange.end,
        },
        { upsert: true }
      );
    }

    // Очищаем временные данные
    client.tempData?.delete(`ptUsers_${interaction.user.id}`);

    await interaction.update({
      content: `Прайм тайм ${timeRange.start} - ${timeRange.end} успешно выставлен для ${userIds.length} пользователей`,
      embeds: [],
      components: [],
    });
  }
}
