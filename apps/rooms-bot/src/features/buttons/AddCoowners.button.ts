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
    const room = await RoomModel.find({ ownerId: interaction.user.id });

    if (!room) {
      await interaction.reply({
        content: 'You do not own any rooms to add a co-owner.',
        ephemeral: true,
      });
      return;
    }

    const options = room.map((room) => ({
      value: room._id.toString(),
      label: room.name,
    }));

    const select = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`selectCoOwner`)
        .setPlaceholder('Select room:')
        .addOptions(options),
    );

    const embed = constructEmbed({
      title: 'Room Management',
      description:
          'Select room to add co-owner.',
      customType: 'info',
    });
    
    await interaction.reply({
      embeds: [embed],
      components: [select],
      ephemeral: true,
    });
  }
}

export default AddCoOwner;
