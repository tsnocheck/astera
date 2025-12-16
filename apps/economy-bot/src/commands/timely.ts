import {
  constructEmbed,
  ICommand,
  RunCommandParams,
  UserModel,
} from '@lolz-bots/shared';
import { ApplicationCommandOptionData } from 'discord.js';

export default class Timely implements ICommand {
  name = 'timely';
  description = 'Получить ежедневную награду';
  options: ApplicationCommandOptionData[] = [];

  async run({ interaction }: RunCommandParams) {
    const userProfile = await UserModel.findOne({ discordID: interaction.user.id }) || await UserModel.create({ discordID: interaction.user.id });

    const now = Date.now();
    const lastTimely = userProfile.timelyBonusClaimedAt ? userProfile.timelyBonusClaimedAt.getTime() : 0;
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - lastTimely < cooldown) {
      const timeLeft = cooldown - (now - lastTimely);
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

      const embed = constructEmbed({
        title: 'Ежедневная награда',
        description: `Вы уже получили свою ежедневную награду! Возвращайтесь через **${hoursLeft}ч ${minutesLeft}м**`,
        customType: 'error',
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const reward = Math.floor(Math.random() * 31) + 50;
    userProfile.coins += reward;
    userProfile.timelyBonusClaimedAt = new Date(now);
    await userProfile.save();

    const embed = constructEmbed({
      title: 'Ежедневная награда',
      description: `Вы получили **${reward}** LOLZ!\n\nВаш баланс: **${userProfile.coins}** LOLZ.`,
      customType: 'success',
    });

    return interaction.reply({ embeds: [embed] });
  }
}
