import {
  ICommand,
  RunCommandParams,
  constructEmbed,
  ClanModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default class ClanListCommand implements ICommand {
  name = 'clan-list';
  description = 'Список всех кланов (только для администраторов)';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [];

  async run({ interaction }: RunCommandParams) {
    const clans = await ClanModel.find({}).exec();

    if (clans.length === 0) {
      return interaction.reply({
        embeds: [
          constructEmbed({
            title: '📋 Список кланов',
            description: 'Кланов пока нет',
            customType: 'custom',
          }),
        ],
        ephemeral: true,
      });
    }

    const page = 0;
    const pageSize = 10;
    const totalPages = Math.ceil(clans.length / pageSize);
    
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageClans = clans.slice(startIndex, endIndex);

    const clanList = pageClans.map((clan: any, index: number) => {
      const coOwners = clan.coOwners.length > 0 
        ? clan.coOwners.map((id: string) => `<@${id}>`).join(', ')
        : 'Нет';
      
      return [
        `**${startIndex + index + 1}. ${clan.name}**`,
        `👑 Овнер: <@${clan.owner}>`,
        `👥 Участников: ${clan.users.length}`,
        `👨‍💼 Со-овнеры: ${coOwners}`,
      ].join('\n');
    }).join('\n\n');

    const embed = constructEmbed({
      title: '📋 Список кланов',
      description: clanList,
      footer: { text: `Страница ${page + 1} из ${totalPages} | Всего кланов: ${clans.length}` },
      customType: 'custom',
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`clanListPrev_${page}`)
        .setLabel('◀️ Назад')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`clanListNext_${page}`)
        .setLabel('Вперёд ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  }
}
