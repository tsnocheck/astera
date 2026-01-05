import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Online implements ICommand {
  name = 'online';
  description = 'Посмотреть онлайн пользователя';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'member',
      description: 'Пользователь',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const member = interaction.options.getUser('member') || interaction.user

    const user = await UserModel.findOne({ discordID: member.id }) || await UserModel.create({ discordID: member.id })

    const hours = Math.floor(user.online / (60 * 60 * 1000));
    const minutes = Math.floor((user.online % (60 * 60 * 1000)) / (60 * 1000));
      
    const embed = constructEmbed({
      title: `Онлайн ${member.username}`,
      fields: [
        { name: 'Онлайн', value: `\`\`\`${hours}ч ${minutes}м\`\`\``}
      ],
      thumbnail: { url: member.displayAvatarURL({ size: 512, forceStatic: false }) },
      customType: 'custom'
    })

    await interaction.reply({ 
      embeds: [embed]
    })
  }
}
