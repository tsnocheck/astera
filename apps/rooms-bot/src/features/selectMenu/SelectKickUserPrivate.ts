import { IFeature, logger, PrivateModel, RunFeatureParams } from '@lolz-bots/shared';
import { ChannelType, SelectMenuInteraction } from 'discord.js';

export class SelectKickUserPrivate implements IFeature<SelectMenuInteraction> {
  name = 'selectKickUserPrivate';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const parts = interaction.customId.split('_');
    const roomId = parts[1];

    const room = await PrivateModel.findOne({ ownerId: interaction.user.id });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    try {
      if (!interaction.guild) {
        return interaction.update({
          content: 'Ошибка получения данных сервера.',
          components: [],
        });
      }

      for (const userId of interaction.values) {
        const member = interaction.guild.members.cache.get(userId);

        if(!member) continue;
        if(member.voice.channelId !== channel.id) continue;
        await member.voice.disconnect('Kicked from private room by owner');
      }

      await interaction.update({
        content: 'Выбранные пользователи были кикнуты из приватной комнаты.',
        components: [],
      });
    } catch (e) {
      logger.error('Error kicking user from private room:', e);
      return interaction.update({
        content: 'Не удалось кикнуть пользователя. Пожалуйста, обратитесь в поддержку.',
        components: [],
      });
    }
  }
}

export default SelectKickUserPrivate;
