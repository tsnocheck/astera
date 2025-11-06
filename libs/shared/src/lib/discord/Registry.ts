import { BotClient } from './Client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ICommand } from './Command';
import { logger } from '../services/logger';
import { IEvent } from './Event';
import { IFeature } from './Feature';
import { IPrecondition } from './Precondition';

export class Registry {
  client: BotClient;

  constructor(client: BotClient) {
    this.client = client;
  }

  async registerCommands(commandsPath: string) {
    try {
      const dir = await fs.readdir(commandsPath);
      for (const file of dir) {
        const stat = await fs.lstat(path.join(commandsPath, file));
        if (stat.isDirectory()) {
          await this.registerCommands(path.join(commandsPath, file));
        } else {
          if (!file.endsWith('.js')) continue;
          let module: ICommand;
          try {
            module = new (
              await import(path.join(commandsPath, file))
            ).default() as ICommand;
          } catch (e) {
            logger.error(
              'Failed to load command ' + path.join(commandsPath, file),
              e,
            );
            continue;
          }
          if (module.features) {
            for (const feature of module.features) {
              this.client.features.set(feature.name, feature);
            }
          }
          this.client.commands.set(module.name, module);
          logger.info('Registered command: ' + module.name);
        }
      }
    } catch (e) {
      logger.error('Failed to register commands: ' + commandsPath, e);
    }
  }

  async registerEvents(eventsPath: string) {
    try {
      const dir = await fs.readdir(eventsPath);
      for (const file of dir) {
        const stat = await fs.lstat(path.join(eventsPath, file));
        if (stat.isDirectory()) {
          await this.registerEvents(path.join(eventsPath, file));
        } else {
          if (!file.endsWith('.js')) continue;
          try {
            const module = new (
              await import(path.join(eventsPath, file))
            ).default() as IEvent;

            this.client.on(module.name, (...args) =>
              module.run(this.client, ...args),
            );
            logger.info('Registered event: ' + module.name);
          } catch (e) {
            logger.error(
              `Failed to load event ${path.join(eventsPath, file)}`,
              e,
            );
            continue;
          }
        }
      }
    } catch {
      logger.error(`Failed to register events: ${eventsPath}`);
    }
  }

  async registerFeatures(featuresPath: string) {
    try {
      const dir = await fs.readdir(featuresPath);
      for (const file of dir) {
        const stat = await fs.lstat(path.join(featuresPath, file));
        if (stat.isDirectory()) {
          await this.registerFeatures(path.join(featuresPath, file));
        } else {
          if (!file.endsWith('.js')) continue;
          try {
            const module = new (
              await import(path.join(featuresPath, file))
            ).default() as IFeature<unknown>;
            if (module.subfeatures) {
              module.subfeatures.forEach((sub) =>
                this.client.features.set(sub.name, sub),
              );
            }
            this.client.features.set(module.name, module);
            logger.info('Registered feature: ' + module.name);
          } catch (e) {
            logger.error(
              'Failed to load feature ' + path.join(featuresPath, file),
              e,
            );
            continue;
          }
        }
      }
    } catch {
      logger.error('Failed to register features: ' + featuresPath);
    }
  }

  async registerPreconditions(preconditionsPath: string) {
    try {
      const dir = await fs.readdir(preconditionsPath);
      for (const file of dir) {
        const stat = await fs.lstat(path.join(preconditionsPath, file));
        if (stat.isDirectory()) {
          await this.registerPreconditions(path.join(preconditionsPath, file));
        } else {
          if (!file.endsWith('.js')) continue;
          try {
            const module = new (
              await import(path.join(preconditionsPath, file))
            ).default() as IPrecondition;
            this.client.preconditions.set(module.name, module);
            logger.info('Registered precondition: ' + module.name);
          } catch (e) {
            logger.error(
              'Failed to load precondition ' +
                path.join(preconditionsPath, file),
              e,
            );
            continue;
          }
        }
      }
    } catch {
      logger.error('Failed to register preconditions: ' + preconditionsPath);
    }
  }
}
