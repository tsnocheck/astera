import { BotClient } from './Client';

interface IEvent {
  name: string;
  run: RunEvent;
}

type RunEvent = (client: BotClient, ...args: any[]) => any;

export { IEvent };
