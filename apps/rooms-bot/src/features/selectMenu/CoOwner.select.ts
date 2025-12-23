import { IFeature, RoomModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  SelectMenuInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export class SelectCoOwner implements IFeature<SelectMenuInteraction> {
  name = 'selectCoOwner';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const userSelect =
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(`selectUserCoOwner_${room._id}`)
          .setPlaceholder('Выберите пользователей:')
          .setMinValues(1)
          .setMaxValues(25),
      );

    await interaction.update({
      components: [userSelect],
    });
  }
}

export default SelectCoOwner;
