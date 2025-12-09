import {
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ApplicationCommandOptionData,
  ButtonBuilder,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ChannelType,
} from 'discord-api-types/v10';
import { Room, RoomModel, RoomUserModel } from '@lolz-bots/shared';

export default class CreateRooms implements ICommand {
  name = 'pushverif';
  description = 'Push Verifcation';
  options: ApplicationCommandOptionData[] = [
    {
      name: 'channel',
      description: 'Push Verifcation',
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ];

  async run({ interaction }: RunCommandParams) {
const channel = interaction.options.getChannel('channel');
    if(!channel) return
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: 'Данный канал не является текстовым',
        ephemeral: true,
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Верифицироваться')
        .setCustomId('VerifyButton')
        .setStyle(ButtonStyle.Success),
      );

      const embed = new EmbedBuilder()
        .setTitle('Верификация')
        .setDescription('Нажмите кнопку чтобы верифицироваться')
        .setColor('Green');

      await (channel as TextChannel).send({
        embeds: [embed],
        components: [row],
      });

      interaction.reply({
        content: 'Отправил сообщение с верификацией',
        ephemeral: true,
      });
  }
}
