import { constructEmbed, IFeature, RunFeatureParams } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { RoomModel, RoomUserModel } from '@lolz-bots/shared';

export class InviteRoom implements IFeature<ButtonInteraction> {
  name = 'inviteRoom';

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
        .setCustomId('selectMuteOrUnmute')
        .setPlaceholder('Select users to mute or unmute')
        .setMinValues(1)
        .setMaxValues(5),
    );

    const embed = constructEmbed({
      title: 'Room Management',
      description: 'Select users to mute or unmute in your room.',
      customType: 'info',
    });

    await interaction.reply({
      embeds: [embed],
      components: [user],
      ephemeral: true,
    });
  }
}

export default InviteRoom;