import fastify from 'fastify';
import { ItemService } from './app/services/item';
import { CaseService } from './app/services/case';
import { ItemController } from './app/controller/item';
import { CaseController } from './app/controller/case';
import { itemRoutes } from './app/presentation/routes/item';
import { caseRoutes } from './app/presentation/routes/case';
import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

const server = fastify({
  logger: true,
});

const itemService = new ItemService();
const caseService = new CaseService();

const itemController = new ItemController(itemService);
const caseController = new CaseController(caseService);

server.register(itemRoutes, itemController);
server.register(caseRoutes, caseController);

mongoose
  .connect(process.env.MONGOURI!, {
    dbName: 'bot',
  })
  .then(() => {
    server.log.info('Connected to MongoDB');
  })
  .catch((err) => {
    server.log.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

server.listen({
  host: process.env.HOST || '127.0.1',
  port: parseInt(process.env.PORT || '3000', 10),
});
