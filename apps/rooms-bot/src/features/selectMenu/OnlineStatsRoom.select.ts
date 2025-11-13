import {
  IFeature,
  Room,
  RunFeatureParams,
  constructEmbed,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  SelectMenuInteraction,
} from 'discord.js';
import { RoomModel, RoomUserModel, RoomUser } from '@lolz-bots/shared';
import { formatTime } from '../../services/formatTime';

class OnlineStatsNavigation implements IFeature<ButtonInteraction> {
  name = 'onlineStatsNavigation';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const parts = interaction.customId.split('_');
    const roomId = parts[1];
    const page = parseInt(parts[2], 10);

    const room = await RoomModel.findOne({ _id: roomId });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
        embeds: [],
      });
    }

    const roomUsers = await RoomUserModel.find({ _id: { $in: room.users } });

    if (roomUsers.length === 0) {
      return interaction.update({
        content: 'Пользователи в комнате не найдены.',
        components: [],
        embeds: [],
      });
    }

    const sortedUsers = roomUsers.sort(
      (a, b) => (b.online || 0) - (a.online || 0),
    );

    const selector = new SelectOnlineStatsRoom();
    await selector.renderStatsPage(
      interaction,
      room,
      sortedUsers,
      page,
      interaction.user.id,
    );
  }
}

export class SelectOnlineStatsRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectOnlineStatsRoom';
  subfeatures = [new OnlineStatsNavigation()];

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const roomUsers = await RoomUserModel.find({ _id: { $in: room.users } });

    if (roomUsers.length === 0) {
      return interaction.update({
        content: 'Пользователи в комнате не найдены.',
        components: [],
      });
    }

    const sortedUsers = roomUsers.sort(
      (a, b) => (b.online || 0) - (a.online || 0),
    );

    await this.renderStatsPage(
      interaction,
      room,
      sortedUsers,
      0,
      interaction.user.id,
    );
  }

  async renderStatsPage(
    interaction: SelectMenuInteraction | ButtonInteraction,
    room: Room,
    sortedUsers: RoomUser[],
    page: number,
    userId: string,
  ) {
    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = sortedUsers.slice(start, end);

    let description = '';
    pageUsers.forEach((roomUser, index) => {
      const position = start + index + 1;
      const onlineTime = formatTime(roomUser.online || 0);
      description += `**${position}.** <@${roomUser.userId}> - ${onlineTime}\n`;
    });

    const userPosition = sortedUsers.findIndex((u) => u.userId === userId);
    const currentUser = sortedUsers[userPosition];

    if (userPosition !== -1) {
      const userOnlineTime = formatTime(currentUser?.online || 0);
      description += `\n**Ваша позиция:**\n**${userPosition + 1}.** <@${userId}> - ${userOnlineTime}`;
    }

    const embed = constructEmbed({
      title: `Статистика онлайн - ${room.name || 'Комната'}`,
      description: description,
      customType: 'info',
      footer: { text: `Страница ${page + 1} из ${totalPages}` },
      timestamp: new Date().toISOString(),
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`onlineStatsNavigation_${room._id}_${page - 1}`)
        .setLabel('◀ Назад')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`onlineStatsNavigation_${room._id}_${page + 1}`)
        .setLabel('Вперёд ▶')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1),
    );

    await interaction.update({
      content: '',
      embeds: [embed],
      components: [row],
    });
  }
}

export default SelectOnlineStatsRoom;
