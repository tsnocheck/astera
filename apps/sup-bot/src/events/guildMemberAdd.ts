import { BotClient, IEvent, SupUserModel } from '@lolz-bots/shared';
import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { supConfig } from '../config';

export default class GuildMemberAddEvent implements IEvent {
  name = 'guildMemberAdd';

  async run(client: BotClient, member: GuildMember) {
    if (member.guild.id !== supConfig.guildId) return;

    const user =
      (await SupUserModel.findOne({
        guild: member.guild.id,
        userId: member.id,
      })) ||
      (await SupUserModel.create({
        guild: member.guild.id,
        userId: member.id,
      }));

    if (user.ban) {
      await member.roles.add(supConfig.roles.ban);
    } else {
      await member.roles.add(supConfig.roles.unverify);
    }

    // Обновляем счетчик перезаходов
    user.reInvite += 1;
    user.historyReInvite.push({
      date: new Date(),
      reason: 'Присоединился к серверу',
    });
    await user.save();

    // Отправляем лог о присоединении
    const channel = member.guild.channels.cache.get(
      supConfig.channels.logsInvite
    ) as TextChannel;

    if (channel) {
      const emb = new EmbedBuilder()
        .setTitle('Пользователь присоединился')
        .addFields(
          { name: 'Имя', value: member.user.username, inline: true },
          { name: 'ID', value: member.id, inline: true },
          {
            name: 'Аккаунт создан',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: 'Перезашел',
            value: `${user.reInvite} раз`,
            inline: true,
          },
          {
            name: 'Статус',
            value: user.ban ? 'Забанен' : 'Не верифицирован',
            inline: true,
          }
        )
        .setColor(user.ban ? 0xff0000 : 0x00ff00)
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setTimestamp();

      await channel.send({ embeds: [emb] });
    }
  }
}
