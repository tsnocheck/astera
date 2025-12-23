import { 
  IFeature, 
  RoomModel, 
  RoomUserModel, 
  RunFeatureParams
} from '@lolz-bots/shared';
import { SelectMenuInteraction } from 'discord.js';

export class SelectDeleteRoom implements IFeature<SelectMenuInteraction> {
  name = 'selectDeleteRoom';

  async run({ interaction }: RunFeatureParams<SelectMenuInteraction>) {
    const room = await RoomModel.findOne({ _id: interaction.values[0] });

    if (!room) {
      return interaction.update({
        content: 'Комната не найдена.',
        components: [],
      });
    }

    const channel = interaction.guild?.channels.cache.get(room.roomId!);
    if (channel) {
      await channel.delete();
    }

    const roomUsers = await RoomUserModel.find({
      _id: { $in: room.users },
    });

    await room.deleteOne();
    await roomUsers.forEach(async (roomUser) => {
      await roomUser.deleteOne();
    });
  }
}

export default SelectDeleteRoom;
