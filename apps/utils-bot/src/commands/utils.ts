import {
  ICommand,
  RunCommandParams,
} from '@lolz-bots/shared';
import {
  ApplicationCommandOptionData,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { applicationConfigs, staffConfig } from '../config';
import CheckInfoFeature from '../features/checkInfo';
import AcceptFeature from '../features/accept';
import RejectFeature from '../features/reject';
import StaffAcceptFeature from '../features/staff_accept';
import StaffRejectFeature from '../features/staff_reject';
import StaffMooveFeature from '../features/staff_moove';
import BanListFeature from '../features/banList';
import AddBanListFeature from '../features/addBanList';
import RemoveBanListFeature from '../features/removeBanList';
import SelectBanListFeature from '../features/selectBanList';
import ModalBanListFeature from '../features/modalBanList';
import {
  ModeratorFeature,
  ControlFeature,
  SupportFeature,
  EventmodFeature,
  ClosemodFeature,
  CreativFeature,
  TribunemodFeature,
  ContentmakerFeature,
  HelperFeature,
  ClanmodFeature,
} from '../features/applications';

export default class UtilsCommand implements ICommand {
  name = 'utils';
  description = 'Отправить embed для набора на стафф';
  options: ApplicationCommandOptionData[] = [];

  features = [
    new CheckInfoFeature(),
    new AcceptFeature(),
    new RejectFeature(),
    new StaffAcceptFeature(),
    new StaffRejectFeature(),
    new StaffMooveFeature(),
    new BanListFeature(),
    new AddBanListFeature(),
    new RemoveBanListFeature(),
    new SelectBanListFeature(),
    new ModalBanListFeature(),
    new ModeratorFeature(),
    new ControlFeature(),
    new SupportFeature(),
    new EventmodFeature(),
    new ClosemodFeature(),
    new CreativFeature(),
    new TribunemodFeature(),
    new ContentmakerFeature(),
    new HelperFeature(),
    new ClanmodFeature(),
  ];

  async run({ interaction }: RunCommandParams) {
    if (!staffConfig.allowedUsers.includes(interaction.user.id)) {
      return interaction.reply({
        content: 'Вы не имеете права использовать эту команду!',
        ephemeral: true,
      });
    }

    const questions = applicationConfigs.map((question) => ({
      value: question.customId,
      label: question.name,
      emoji: question.emojy,
    }));

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('checkInfo')
        .setPlaceholder('Выберите ветку:')
        .addOptions(questions)
    );

    const naborEmbedImg = new EmbedBuilder()
      .setImage('https://media.discordapp.net/attachments/1322518825991712808/1457542509327110174/Logoooo.png?ex=67852e99&is=6783dd19&hm=b4a7cd96c8c4ca479ee899d1af4dfe7c12da8a5ee77c83a99b653e4f817129f5&=&format=webp&quality=lossless&width=550&height=177')
      .setColor(0x9f96ff);

    const naborEmbed = new EmbedBuilder()
      .setDescription(`## Тут можно встать на **стафф**!\n\nВыберите из списка ниже желаемую должность.\nПрочитайте требования и отправьте заявку!`)
      .setColor(0x9f96ff);

    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({
        embeds: [naborEmbedImg, naborEmbed],
        components: [selectMenu],
      });
    }

    await interaction.reply({
      content: 'Вы успешно отправили эмбед',
      ephemeral: true,
    });
  }
}

