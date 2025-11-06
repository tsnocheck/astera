import {
  ApplicationCommandOptionData,
  ChatInputCommandInteraction,
} from 'discord.js';
import { BotClient } from './Client';
import { IFeature } from './Feature';

interface ICommand {
  name: string;
  description: string;
  options?: ApplicationCommandOptionData[];
  features?: IFeature<any>[];
  preconditions?: string[];
  run: RunCommand;
}

export interface RunCommandParams {
  interaction: ChatInputCommandInteraction;
  client: BotClient;
}

type RunCommand = ({ interaction, client }: RunCommandParams) => any;

export { ICommand };
