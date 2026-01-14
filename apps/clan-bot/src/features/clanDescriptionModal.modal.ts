import {
  IFeature,
  RunFeatureParams,
  ClanModel,
} from '@lolz-bots/shared';
import { ModalSubmitInteraction } from 'discord.js';

export default class ClanDescriptionModalFeature implements IFeature<ModalSubmitInteraction> {
  name = 'clanDescriptionModal';

  async run({ interaction }: RunFeatureParams<ModalSubmitInteraction>) {
    const clan = await ClanModel.findOne({ owner: interaction.user.id });

    if (!clan) {
      return interaction.reply({
        content: 'Клан не найден или вы не являетесь овнером',
        ephemeral: true,
      });
    }

    const newDescription = interaction.fields.getTextInputValue('description').trim();

    await ClanModel.updateOne(
      { _id: clan._id },
      { $set: { description: newDescription || undefined } }
    );

    return interaction.reply({
      content: newDescription
        ? `✅ Описание клана **${clan.name}** обновлено`
        : `✅ Описание клана **${clan.name}** удалено`,
      ephemeral: true,
    });
  }
}
