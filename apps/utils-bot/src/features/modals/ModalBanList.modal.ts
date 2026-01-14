import {
  IFeature,
  RunFeatureParams,
  GuildModel,
} from '@lolz-bots/shared';
import { ModalSubmitInteraction } from 'discord.js';

export default class ModalBanListModal implements IFeature<ModalSubmitInteraction> {
  name = 'modalBanList';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const answer = interaction.fields.getTextInputValue('getUserId');

    const guild = await GuildModel.findOne({ guild: interaction.guildId! }) ||
      await GuildModel.create({ guild: interaction.guildId! });

    guild.banList = guild.banList.filter((item: string) => item !== answer);
    await guild.save();

    await interaction.reply({
      content: 'Вы успешно сняли бан пользователю',
      ephemeral: true,
    });
  }
}
