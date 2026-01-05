import { constructEmbed, IFeature, RoomModel, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';

export class AddCoOwner implements IFeature<ButtonInteraction> {
  name = 'addCoOwner';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const room = await RoomModel.find({ ownerId: interaction.user.id });

    if (!room) {
      await interaction.reply({
        content: 'У вас нет комнат для добавления совладельца.',
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
        .setPlaceholder('Выберите комнату:')
        .addOptions(options),
    );

    const embed = constructEmbed({
      title: 'Управление комнатой',
      description:
          'Выберите комнату для добавления совладельца.',
      customType: 'custom',
    });
    
    await interaction.reply({
      embeds: [embed],
      components: [select],
      ephemeral: true,
    });
  }
}

export default AddCoOwner;
