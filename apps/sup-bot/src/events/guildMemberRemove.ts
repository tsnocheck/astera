import { BotClient, IEvent, SupUserModel } from '@lolz-bots/shared';
import { GuildMember, EmbedBuilder, TextChannel, PartialGuildMember } from 'discord.js';
import { supConfig } from '../config';

export default class GuildMemberRemoveEvent implements IEvent {
  name = 'guildMemberRemove';

  async run(client: BotClient, member: GuildMember | PartialGuildMember) {
    if (member.guild.id !== supConfig.guildId) return;

    const user = await SupUserModel.findOne({
      guild: member.guild.id,
      userId: member.id,
    });

    if (user) {
      user.historyReInvite.push({
        date: new Date(),
        reason: 'Покинул сервер',
      });
      await user.save();
    }

    // Отправляем лог о выходе
    const channel = member.guild.channels.cache.get(
      supConfig.channels.logsInvite
    ) as TextChannel;

    if (channel) {
      const emb = new EmbedBuilder()
        .setTitle('Пользователь покинул сервер')
        .addFields(
          { name: 'Имя', value: member.user.username, inline: true },
          { name: 'ID', value: member.id, inline: true },
          {
            name: 'Перезаходов',
            value: user ? `${user.reInvite} раз` : 'Нет данных',
            inline: true,
          }
        )
        .setColor(0xff0000)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

      await channel.send({ embeds: [emb] });
    }
  }
}
