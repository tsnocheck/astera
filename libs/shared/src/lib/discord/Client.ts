import {
  ApplicationCommandDataResolvable,
  Client,
  GatewayIntentBits,
} from 'discord.js';
import { logger } from '../services/logger';
import { ICommand } from './Command';
import { IFeature } from './Feature';
import * as path from 'node:path';
import mongoose from 'mongoose';
import { Registry } from './Registry';
import { IPrecondition } from './Precondition';
import * as process from 'node:process';
import { LolzApi } from '../lolz/api';

class BotClient extends Client {
  commands: Map<string, ICommand>;
  features: Map<string, IFeature<unknown>>;
  preconditions: Map<string, IPrecondition>;
  registry: Registry;
  api: LolzApi;
  tempData: Map<string, any>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
      ],
    });
    this.commands = new Map<string, ICommand>();
    this.features = new Map<string, IFeature<unknown>>();
    this.preconditions = new Map<string, IPrecondition>();
    this.registry = new Registry(this);
    this.api = new LolzApi(process.env.LOLZ_API_KEY!, process.env.LOLZ_API_URL!);
    this.tempData = new Map<string, any>();
  }

  public async build(token: string, rootDir: string) {
    try {
      logger.info('Logging to client..');
      await super.login(token);
      logger.info('Success login to client..');
    } catch (e) {
      logger.error('Fucked while logining to discord', e);
      process.exit(1);
    }

    try {
      await this.connectToDatabase(process.env.MONGOURI!);
    } catch (e) {
      logger.error('Failed to connect to database: ' + e);
      process.exit(1);
    }

    try {
      logger.info('Register events and commands..');
      await this.registry.registerCommands(path.join(rootDir, 'commands'));
      await this.registry.registerEvents(path.join(rootDir, 'events'));
      await this.registry.registerFeatures(path.join(rootDir, 'features'));
      await this.registry.registerPreconditions(
        path.join(rootDir, 'preconditions'),
      );
      logger.info('Successfully registered events and commands..');
    } catch (e) {
      logger.error('Failed to register events and commands: ' + e);
      process.exit(1);
    }

    try {
      logger.info('Loading commands to Discord API..');
      await this.__loadCommands(process.env.MODE!);
      logger.info('Successfully loaded commands to Discord API.');
    } catch (e) {
      logger.error('Failed to load commands to Discord API: ' + e);
    }
  }

  public async connectToDatabase(mongoUrl: string) {
    try {
      logger.info('Connecting to database...');
      await mongoose.connect(mongoUrl, { dbName: 'bot' });
      logger.info('Successfully connected to the database.');
    } catch (error) {
      logger.error(`Failed to connect to the database: ${error}`);
      process.exit(1);
    }
  }

  private async __loadCommands(mode: string) {
    if (mode === 'prod') {
      const guild = await this.guilds.fetch(process.env.PROD_GUILD_ID!);
      await guild.commands.set(this.__convertCommands());
    } else {
      const guild = await this.guilds.fetch(process.env.DEV_GUILD_ID!);
      await guild.commands.set(this.__convertCommands());
    }
  }

  private __convertCommands(): ApplicationCommandDataResolvable[] {
    const commands: ApplicationCommandDataResolvable[] = [];

    for (const command of this.commands.values()) {
      commands.push({
        name: command.name,
        description: command.description,
        options: command.options || [],
      });
    }
    return commands;
  }
}

export { BotClient };
