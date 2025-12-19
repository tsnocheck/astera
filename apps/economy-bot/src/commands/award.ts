import {
  CaseItem,
  CaseModel,
  constructEmbed,
  ICommand,
  IFeature,
  Item,
  RunCommandParams,
  RunFeatureParams,
  UserModel,
  logger,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  RepliableInteraction,
  ApplicationCommandOptionData,
  EmbedBuilder
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType, ChannelType } from 'discord-api-types/v10';
import * as process from 'node:process';

export default class Award implements ICommand {
  name = 'award';
  description = 'View the shop to buy items';
  preconditions = ['admins-only'];
  options: ApplicationCommandOptionData[] = [
    {
      name: 'user',
      description: 'Пользователь для дуэли',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'coins',
      description: 'Количество монет для выдачи',
      type: ApplicationCommandOptionType.Number,
      required: false,
    },
    {
      name: 'lvl',
      description: 'Количество уровней для выдачи',
      type: ApplicationCommandOptionType.Number,
      required: false,
    }
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user')
    const coins = interaction.options.getNumber('coins')
    const lvl = interaction.options.getNumber('lvl')

    if(!user) {
      return interaction.reply({ content: 'Не удалось получить пользователя, обратитесь в поддержку.', ephemeral: true });
    }

    if (!coins && !lvl) {
      return interaction.reply({ content: 'Укажите хотя бы один параметр: coins или lvl.', ephemeral: true });
    }

    const userProfile = await UserModel.findOne({ discordID: user.id }) || await UserModel.create({ discordID: user.id, level: 1 })
    
    const fields: { name: string; value: string; inline: boolean }[] = [];

    if (coins) {
      userProfile.coins += coins
      fields.push({ name: 'Количество монет', value: `${coins}`, inline: true });
    }

    if (lvl) {
      const newLevel = Math.min(userProfile.level + lvl, 50);
      const actualLvlAdded = newLevel - userProfile.level;
      
      userProfile.level = newLevel;
      userProfile.xp = 0;
      
      fields.push({ name: 'Количество уровней', value: `${actualLvlAdded}`, inline: true });
      
      if (actualLvlAdded < lvl) {
        fields.push({ 
          name: 'Предупреждение', 
          value: `Было выдано только ${actualLvlAdded} уровней из ${lvl}, так как достигнут максимальный уровень (50).`, 
          inline: false 
        });
      }
    }

    await userProfile.save()

    const logsEmbed = new EmbedBuilder()
      .setTitle(`Выдача наград`)
      .addFields(
        { name: 'Пользователь', value: `<@${user.id}>`, inline: true },
        ...fields,
        { name: 'Выдал', value: `<@${interaction.user.id}>`, inline: true },
      );

    const logsChannel = await interaction.client.channels.fetch(process.env.LOGS_CHANNEL_ID!);

    if (!logsChannel) {
      logger.error('Logs channel not found or is not text-based.');
      return interaction.reply({ content: 'Произошла ошибка при попытке записать лог.', ephemeral: true });
    }

    if (logsChannel.type === ChannelType.GuildText) {
      await logsChannel.send({ embeds: [logsEmbed] });
    }

    let responseMessage = '';
    if (coins) responseMessage += `${coins} монет`;
    if (coins && lvl) responseMessage += ' и ';
    if (lvl) responseMessage += `${lvl} уровней`;

    return interaction.reply({ content: `Выдано ${responseMessage} пользователю <@${user.id}>.`, ephemeral: true });
  }
}
