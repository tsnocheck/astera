import {
  BaseInteraction,
  MessageFlags,
  RepliableInteraction,
} from 'discord.js';
import { BotClient, IEvent, logger } from '@lolz-bots/shared';

export default class InteractionCreateEvent implements IEvent {
  name = 'interactionCreate';
  
  run = async (client: BotClient, interaction: BaseInteraction) => {
    try {
      if (!interaction.inGuild()) {
        return (interaction as RepliableInteraction).reply({
          content: 'Вы можете использовать бота только внутри гильдии',
          flags: [MessageFlags.Ephemeral],
        });
      }

      // Обработка команд
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) {
          command.run({ interaction, client });
        }
      }
      // Обработка features (кнопки, select меню, модальные окна)
      else if (
        interaction.isMessageComponent() ||
        interaction.isModalSubmit()
      ) {
        const customId = interaction.customId.split('-')[0];
        const feature = client.features.get(customId);
        
        if (feature) {
          const preconditions = feature.preconditions?.map((pre) =>
            client.preconditions.get(pre),
          );
          if (preconditions) {
            let result = true;
            for (const precondition of preconditions) {
              result = await precondition!.run({ interaction, client });
              if (!result) return;
            }
          }
          feature.run({ interaction, client });
        }
      }
    } catch (error) {
      logger.error('Error in interactionCreate:', error);
    }
  };
}
