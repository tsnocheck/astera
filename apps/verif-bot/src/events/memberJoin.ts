import { IEvent } from '@lolz-bots/shared';
import { BotClient } from '@lolz-bots/shared';
import { GuildMember } from 'discord.js';
import { UserModel } from '@lolz-bots/shared';

export default class MemberJoin implements IEvent {
  name = 'guildMemberAdd';

  async run(client: BotClient, member: GuildMember) {
    const isVerified = await UserModel.findOne({
      discordId: member.id,
      verified: true,
    });

    if (isVerified) {
      await member.roles.add(process.env.VERIFIED_ROLE_ID!);
    }
  }
}
