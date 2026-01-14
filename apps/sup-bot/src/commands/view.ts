import {
  ICommand,
  RunCommandParams,
  PrimeTimeModel,
  SupUserModel,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { supConfig } from '../config';

export default class ViewCommand implements ICommand {
  name = 'view';
  description = 'Информация о ветке';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'type',
      description: 'Выберите тип',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Посмотреть активное пт', value: 'getPrimeTime' },
        { name: 'Список ветки', value: 'getListSlave' },
        { name: 'Онлайн в день', value: 'getOnlineDay' },
      ],
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const choice = interaction.options.getString('type', true);
    const member = interaction.guild!.members.cache.get(interaction.user.id);

    switch (choice) {
      case 'getPrimeTime':
        await this.handleGetPrimeTime(interaction);
        break;
      case 'getListSlave':
        await this.handleGetListSlave(interaction, member!);
        break;
      case 'getOnlineDay':
        await this.handleGetOnlineDay(interaction, member!);
        break;
    }
  }

  private async handleGetPrimeTime(interaction: any) {
    const emb = new EmbedBuilder()
      .setTitle('Посмотреть активный прайм тайм')
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setDescription('Прогружаю информацию...')
      .setColor(0x2b2d31)
      .setTimestamp();

    await interaction.reply({ embeds: [emb] });

    const supports = await PrimeTimeModel.find();

    const timeGroups: Record<string, string> = {
      '00:00': '',
      '02:00': '',
      '04:00': '',
      '06:00': '',
      '08:00': '',
      '10:00': '',
      '12:00': '',
      '14:00': '',
      '16:00': '',
      '18:00': '',
      '20:00': '',
      '22:00': '',
    };

    for (const support of supports) {
      if (support.userId) {
        const member = interaction.guild!.members.cache.get(support.userId);
        if (!member) continue;

        const startTime = support.startPrimeTime;
        if (startTime && timeGroups.hasOwnProperty(startTime)) {
          timeGroups[startTime] += `${member.user}\n`;
        }
      }
    }

    const embPt = new EmbedBuilder()
      .setTitle('Посмотреть активный прайм тайм')
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .addFields(
        { name: '00:00-02:00', value: timeGroups['00:00'] || 'Отсутствует', inline: true },
        { name: '02:00-04:00', value: timeGroups['02:00'] || 'Отсутствует', inline: true },
        { name: '04:00-06:00', value: timeGroups['04:00'] || 'Отсутствует', inline: true },
        { name: '06:00-08:00', value: timeGroups['06:00'] || 'Отсутствует', inline: true },
        { name: '08:00-10:00', value: timeGroups['08:00'] || 'Отсутствует', inline: true },
        { name: '10:00-12:00', value: timeGroups['10:00'] || 'Отсутствует', inline: true },
        { name: '12:00-14:00', value: timeGroups['12:00'] || 'Отсутствует', inline: true },
        { name: '14:00-16:00', value: timeGroups['14:00'] || 'Отсутствует', inline: true },
        { name: '16:00-18:00', value: timeGroups['16:00'] || 'Отсутствует', inline: true },
        { name: '18:00-20:00', value: timeGroups['18:00'] || 'Отсутствует', inline: true },
        { name: '20:00-22:00', value: timeGroups['20:00'] || 'Отсутствует', inline: true },
        { name: '22:00-24:00', value: timeGroups['22:00'] || 'Отсутствует', inline: true }
      )
      .setColor(0x2b2d31)
      .setTimestamp();

    await interaction.editReply({ embeds: [embPt] });
  }

  private async handleGetListSlave(interaction: any, member: any) {
    if (!member.roles.cache.has(supConfig.roles.support)) {
      return interaction.reply({
        content: 'Вы не имеете права на использование этой команды',
        ephemeral: true,
      });
    }

    const embWait = new EmbedBuilder()
      .setTitle('Список саппортов')
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }))
      .setDescription('Прогружаю информацию...')
      .setColor(0x2b2d31)
      .setTimestamp();

    await interaction.reply({ embeds: [embWait] });

    const rolesMapping = {
      admin: { id: supConfig.roles.supportAdmin, list: [] as string[], index: 1 },
      security: { id: supConfig.roles.supportSecurity, list: [] as string[], index: 1 },
      curator: { id: supConfig.roles.supportCurator, list: [] as string[], index: 1 },
      master: { id: supConfig.roles.supportMaster, list: [] as string[], index: 1 },
      slave: { id: supConfig.roles.support, list: [] as string[], index: 1 },
    };

    const membersWithSlaveRole = interaction.guild!.members.cache.filter((m: any) =>
      m.roles.cache.has(rolesMapping.slave.id)
    );
    const additionalRoleCheck = supConfig.roles.acceptSupport;

    membersWithSlaveRole.forEach((m: any) => {
      if (m.roles.cache.has(rolesMapping.admin.id) && m.roles.cache.has(additionalRoleCheck)) {
        rolesMapping.admin.list.push(`${rolesMapping.admin.index} - ${m.user}`);
        rolesMapping.admin.index++;
      } else if (m.roles.cache.has(rolesMapping.security.id) && m.roles.cache.has(additionalRoleCheck)) {
        rolesMapping.security.list.push(`${rolesMapping.security.index} - ${m.user}`);
        rolesMapping.security.index++;
      } else if (m.roles.cache.has(rolesMapping.curator.id) && m.roles.cache.has(additionalRoleCheck)) {
        rolesMapping.curator.list.push(`${rolesMapping.curator.index} - ${m.user}`);
        rolesMapping.curator.index++;
      } else if (m.roles.cache.has(rolesMapping.master.id) && m.roles.cache.has(additionalRoleCheck)) {
        rolesMapping.master.list.push(`${rolesMapping.master.index} - ${m.user}`);
        rolesMapping.master.index++;
      } else {
        rolesMapping.slave.list.push(`${rolesMapping.slave.index} - ${m.user}`);
        rolesMapping.slave.index++;
      }
    });

    const embedResult = new EmbedBuilder()
      .setTitle('Список саппортов')
      .setColor(0x2b2d31)
      .setTimestamp()
      .setThumbnail(interaction.user.displayAvatarURL({ forceStatic: false }));

    for (const roleName in rolesMapping) {
      const role = rolesMapping[roleName as keyof typeof rolesMapping];
      if (role.list.length > 0) {
        embedResult.addFields({
          name: roleName.toUpperCase(),
          value: role.list.join('\n'),
          inline: true,
        });
      }
    }

    await interaction.editReply({ embeds: [embedResult] });
  }

  private async handleGetOnlineDay(interaction: any, member: any) {
    const support = await SupUserModel.findOne({
      guild: interaction.guildId!,
      userId: interaction.user.id,
    }) || await SupUserModel.create({
      guild: interaction.guildId!,
      userId: interaction.user.id,
    });

    const pageSize = 25;
    let currentPage = 0;

    const formattedDate = new Date().toDateString();
    const existingDate = support.online?.onlineForPt?.find(
      (item: any) => new Date(item.date).toDateString() === formattedDate
    );

    if (!existingDate) {
      return interaction.reply({ content: 'Онлайн отсутствует', ephemeral: true });
    }

    const generateEmbed = (page: number) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const currentActions = (existingDate.actions || []).slice(start, end);

      const totalSeconds = Math.floor((existingDate.time || 0) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      const embed = new EmbedBuilder()
        .setTitle('Действия по онлайну')
        .setDescription(`Общий онлайн за день: \`\`\`${hours}:${minutes}\`\`\``)
        .setColor(0x2b2d31)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setFooter({
          text: `Страница ${page + 1}/${Math.ceil((existingDate.actions || []).length / pageSize)}`,
        });

      currentActions.forEach((action: any) => {
        embed.addFields({
          name: action.reason,
          value: `Дата: ${this.formatDateTime(action.time)}`,
          inline: true,
        });
      });

      return embed;
    };

    const generateButtons = (page: number) => {
      return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Назад')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Вперед')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled((page + 1) * pageSize >= (existingDate.actions || []).length)
      );
    };

    const message = await interaction.reply({
      embeds: [generateEmbed(currentPage)],
      components: [generateButtons(currentPage)],
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      filter: (i: any) => i.user.id === interaction.user.id,
      time: 60000,
    });

    collector.on('collect', async (i: any) => {
      if (i.customId === 'next') {
        currentPage++;
      } else if (i.customId === 'prev') {
        currentPage--;
      }

      await i.update({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)],
      });
    });

    collector.on('end', () => {
      message.edit({ components: [] });
    });
  }

  private formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;
  }
}
