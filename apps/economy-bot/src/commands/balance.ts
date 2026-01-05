import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData, EmbedBuilder } from 'discord.js';
import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Balance implements ICommand {
  name = 'balance';
  description = 'Посмотреть баланс пользователя';
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

    const embed = constructEmbed({
      title: `Баланс ${member.username}`,
      fields: [
        { name: 'Валюта', value: `\`\`\`${user.coins}\`\`\``}
      ],
      thumbnail: { url: member.displayAvatarURL({ size: 512, forceStatic: false }) },
      customType: 'custom'
    })

    await interaction.reply({ 
      embeds: [embed]
    })
  }
}
