import { FastifyInstance } from 'fastify';
import { ItemController } from '../../controller/item';
import { itemBodySchema, itemParamsSchema } from '../../dtos/item';

export async function itemRoutes(
  fastify: FastifyInstance,
  controller: ItemController,
) {
  fastify.post(
    '/items',
    { schema: { body: itemBodySchema } },
    controller.createItem.bind(controller),
  );
  fastify.get('/items', controller.getAllItems.bind(controller));
  fastify.get(
    '/items/:id',
    { schema: { params: itemParamsSchema } },
    controller.getItemById.bind(controller),
  );
  fastify.put(
    '/items/:id',
    { schema: { body: itemBodySchema, params: itemParamsSchema } },
    controller.updateItem.bind(controller),
  );
  fastify.delete(
    '/items/:id',
    { schema: { params: itemParamsSchema } },
    controller.deleteItem.bind(controller),
  );
}
