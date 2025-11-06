import {
  BotClient,
  ConfigModel,
  PunishmentType,
  UserModel,
} from '@lolz-bots/shared';
import { consumer } from './consumer';

export async function startPunishmentsConsumer(client: BotClient) {
  await consumer.run<{ userID: string; type: PunishmentType }>(
    async (message) => {
      const { userID, type } = message;
      const config = await ConfigModel.findOne();
      if (!config) return;

      const punishmentPenalty = config.penalties.find((p) => p.type === type);
      if (!punishmentPenalty || punishmentPenalty.penalty === 0) return;

      await UserModel.findOneAndUpdate(
        {
          discordID: userID,
        },
        {
          $inc: {
            coins: -punishmentPenalty.penalty,
          },
        },
        { new: true, upsert: true },
      );
    },
  );
}
