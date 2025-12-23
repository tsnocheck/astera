import { constructEmbed, IFeature, RunFeatureParams, RoomModel } from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  ButtonInteraction,
  StringSelectMenuBuilder,
} from 'discord.js';

export class MuteOrUnmute implements IFeature<ButtonInteraction> {
  name = 'muteOrUnMute';

  async run({ interaction }: RunFeatureParams<ButtonInteraction>) {
    const room = await RoomModel.find({ ownerId: interaction.user.id });

    if (!room) {
      await interaction.reply({
        content: 'У вас нет комнат для управления мутом.',
        ephemeral: true,
      });
      return;
    }

    const options = room.map((room) => ({
      value: room._id.toString(),
      label: room.name,
    }));

    const select =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`selectMuteOrUnMuteRoom`)
          .setPlaceholder('Выберите комнату:')
          .addOptions(options),
      );

    const embed = constructEmbed({
      title: 'Управление комнатой',
      description: 'Выберите пользователей для выдачи или снятия мута в вашей комнате.',
      customType: 'info',
    });

    await interaction.reply({
      embeds: [embed],
      components: [select],
      ephemeral: true,
    });
  }
}

export default MuteOrUnmute;