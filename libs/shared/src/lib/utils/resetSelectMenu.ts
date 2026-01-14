import { Message, ComponentType } from 'discord.js';

/**
 * Resets all select menu options to default (unselected) state
 * @param message - The message containing select menus to reset
 */
export async function resetSelectMenu(message: Message): Promise<void> {
  try {
    const newComponents = message.components.map(row => {
      const rowData: any = row.toJSON();
      
      return {
        type: 1 as const,
        components: rowData.components.map((component: any) => {
          if (component.type === ComponentType.StringSelect && component.options) {
            return {
              ...component,
              options: component.options.map((option: any) => ({
                ...option,
                default: false
              }))
            };
          }
          return component;
        })
      };
    });

    await message.edit({ components: newComponents as any });
  } catch (error) {
    // Silently fail if message cannot be edited (e.g., already deleted)
    console.error('Failed to reset select menu:', error);
  }
}
