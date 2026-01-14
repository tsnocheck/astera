import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class ClanTopCommand implements ICommand {
  name = 'clantop';
  description = 'Топ кланов';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'type',
      description: 'Тип рейтинга',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'По количеству участников', value: 'members' },
        { name: 'По онлайну', value: 'online' },
      ],
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const type = interaction.options.getString('type', true);

    let clans;
    let title;
    let formatClan: (clan: any, index: number) => string;

    if (type === 'members') {
      // Топ кланов по количеству участников
      clans = await ClanModel.find({})
        .sort({ 'users': -1 })
        .limit(10)
        .exec();

      // Сортируем по количеству участников
      clans = clans.sort((a: any, b: any) => b.users.length - a.users.length);

      title = '👥 Топ 10 кланов по количеству участников';
      formatClan = (clan: any, index: number) => 
        `${index + 1}. **${clan.name}** - ${clan.users.length} участников`;
    } else {
      // Топ кланов по онлайну (участники в голосовых каналах категории)
      clans = await ClanModel.find({}).exec();

      // Подсчитываем онлайн для каждого клана из голосовых каналов категории
      const clansWithOnline = clans.map((clan: any) => {
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
        return {
          clan,
          totalOnline: onlineCount,
        };
      });

      clansWithOnline.sort((a: any, b: any) => b.totalOnline - a.totalOnline);
      clans = clansWithOnline.slice(0, 10).map((item: any) => item.clan);

      title = '⏰ Топ 10 кланов по онлайну';
      formatClan = (clan: any, index: number) => {
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
        return `${index + 1}. **${clan.name}** - ${onlineCount} онлайн`;
      };
    }

    const description = clans.length > 0
      ? clans.map(formatClan).join('\n')
      : 'Нет данных';

    const embed = constructEmbed({
      title,
      description,
      customType: 'custom',
    });

    return interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  }
}
