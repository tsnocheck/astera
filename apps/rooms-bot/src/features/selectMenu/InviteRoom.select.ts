import { 
  IFeature, 
  logger, 
  RunFeatureParams, 
  RoomModel 
} from '@lolz-bots/shared';
import {
  ActionRowBuilder,
  SelectMenuInteraction,
  UserSelectMenuBuilder,
} from 'discord.js';

export class SelectInviteRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectInviteRoom';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    logger.info('SelectInviteRoom interaction values', interaction.values);
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
          .setCustomId(`selectUserToInvite_${room._id}`)
          .setPlaceholder('Выберите пользователей для приглашения:')
          .setMinValues(1)
          .setMaxValues(25),
      );

    await interaction.update({
      content: `Вы приглашаете пользователей в комнату: <#${room.roomId}>`,
      components: [userSelect],
    });
  }
}

export default SelectInviteRoom;
