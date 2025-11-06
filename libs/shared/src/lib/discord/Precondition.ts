import { BotClient } from './Client';
import { BaseInteraction } from 'discord.js';

export interface IPrecondition {
  name: string;
  run: PreconditionRun;
}

type PreconditionRun = ({
                          interaction,
                          client,
                        }: {
  interaction: BaseInteraction;
  client: BotClient;
}) => boolean | Promise<boolean>;
