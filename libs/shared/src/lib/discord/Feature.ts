import { BotClient } from './Client';

interface IFeature<T> {
  name: string;
  preconditions?: string[];
  subfeatures?: IFeature<any>[];
  run: RunFeature<T>;
}

export interface RunFeatureParams<T> {
  interaction: T;
  client: BotClient;
}

type RunFeature<T> = ({ interaction, client }: RunFeatureParams<T>) => any;

export { IFeature };
