import { constructEmbed, IFeature, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { RoomModel, RoomUserModel } from '@lolz-bots/shared';

export class AddCoOwner implements IFeature<ButtonInteraction> {
  name = 'addCoOwner';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const room = await RoomModel.findOne({ ownerId: interaction.user.id });

    if (!room) {
      await interaction.reply({
        content: 'You do not own any rooms to add a co-owner.',
        ephemeral: true,
      });
      return;
    }

    const user = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('selectCoOwner')
        .setPlaceholder('Select co-owners to add')
        .setMinValues(1)
        .setMaxValues(3),
    )

    const embed = constructEmbed({
      title: 'Room Management',
      description:
          'Select co-owners to add to your room.',
      customType: 'info',
    });
    
    await interaction.reply({
      embeds: [embed],
      components: [user],
      ephemeral: true,
    });
  }
}

export default AddCoOwner;
