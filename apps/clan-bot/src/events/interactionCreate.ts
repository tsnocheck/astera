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
      // Разрешаем кнопки приглашений в ЛС
      const allowedDMInteractions = ['acceptClanInvite'];
      const isDMAllowed = interaction.isMessageComponent() && 
        allowedDMInteractions.some(id => interaction.customId.startsWith(id));

      if (!interaction.inGuild() && !isDMAllowed) {
        return (interaction as RepliableInteraction).reply({
          content: 'Вы можете использовать бота только внутри гильдии',
          flags: [MessageFlags.Ephemeral],
        });
      }
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (command) {
          const preconditions = command.preconditions?.map((pre) =>
            client.preconditions.get(pre),
          );
          if (preconditions) {
            let result = true;
            for (const precondition of preconditions) {
              result = await precondition!.run({ interaction, client });
            }
            if (!result) {
              return;
            }
          }
          command.run({ interaction, client });
        }
      } else if (
        interaction.isMessageComponent() ||
        interaction.isModalSubmit()
      ) {
        const feature = client.features.get(
          interaction.customId.split('_').shift()!,
        );
        if (feature) {
          const preconditions = feature.preconditions?.map((pre) =>
            client.preconditions.get(pre),
          );
          if (preconditions) {
            let result = true;
            for (const precondition of preconditions) {
              result = await precondition!.run({ interaction, client });
            }
            if (!result) {
              return;
            }
          }
          feature.run({ interaction, client });
        }
      }
    } catch (error) {
      logger.error(
        `Error in interactionCreate event: ${error instanceof Error ? error.message : error}`,
      );
    }
  };
}
