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
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  RepliableInteraction,
  ApplicationCommandOptionData,
  EmbedBuilder
} from 'discord.js';
import { ButtonStyle, ApplicationCommandOptionType } from 'discord-api-types/v10';

export default class Duel implements ICommand {
  name = 'duel';
  description = 'View the shop to buy items';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'bet',
      description: 'Ставка на дуэль',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'user',
      description: 'Пользователь для дуэли',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  async run({ interaction }: RunCommandParams) {
    const user = interaction.options.getUser('user')
    const bet = interaction.options.getNumber('bet')
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id })
    
    if(!bet) {
      return interaction.reply({ content: 'Не удалось получить ставку, обратитесь в поддержку.', ephemeral: true });
    }

    if (bet! <= 0) {
      return interaction.reply({ content: 'Ставка должна быть больше нуля.', ephemeral: true });
    }

    if (userProfile.coins < bet) {
      return interaction.reply({ content: 'У вас недостаточно средств.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Дуэль от ${interaction.user.username}`)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512, forceStatic: false }))
      .setFooter({ text: `У вас есть минута на принятие дуэли.` });

    const acceptButton = new ButtonBuilder()
      .setLabel('Принять дуэль')
      .setStyle(ButtonStyle.Primary);

    if (!user) {
      embed.setDescription(`Ставка ${bet} LOLZ.`);
      acceptButton.setCustomId(`accept-duel_${interaction.user.id}_${bet}`);

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

      return interaction.reply({ embeds: [embed], components: [actionRow] });
    } else {
      const opponentProfile = await UserModel.findOne({ discordID: user.id }) || await UserModel.create({ discordID: user.id })
      
      embed.setDescription(`${user}, вам вызов от ${interaction.user} с ставкой в ${bet} LOLZ!`);

      acceptButton.setCustomId(`accept-duel_${interaction.user.id}_${bet}_${user.id}`);
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton);

      return interaction.reply({ embeds: [embed], components: [actionRow], content: `<@${user.id}>` });
    }
  }
}
