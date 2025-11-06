import { FastifyReply, FastifyRequest } from 'fastify';
import { ItemService } from '../services/item';
import { CreateItemDto, UpdateItemDto } from '../dtos/item';
import { logger } from '@lolz-bots/shared';

export class ItemController {
  constructor(private itemService: ItemService) {}

  async createItem(
    request: FastifyRequest<{ Body: CreateItemDto }>,
    reply: FastifyReply,
  ) {
    try {
      const newItem = await this.itemService.createItem(request.body);
      return reply.status(201).send(newItem);
    } catch (e) {
      logger.error('Error creating item:', e);
      return reply.status(409).send({ message: 'Item already exists' });
    }
  }

  async getAllItems(request: FastifyRequest, reply: FastifyReply) {
    const items = await this.itemService.getAllItems();
    return reply.send(items);
  }

  async getItemById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const item = await this.itemService.getItemById(request.params.id);
    if (!item) {
      return reply.status(404).send({ message: 'Item not found' });
    }
    return reply.send(item);
  }

  async updateItem(
    request: FastifyRequest<{ Body: UpdateItemDto; Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const updatedItem = await this.itemService.updateItem(
      request.params.id,
      request.body,
    );
    if (!updatedItem) {
      return reply.status(404).send({ message: 'Item not found' });
    }
    return reply.send(updatedItem);
  }

  async deleteItem(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const deletedItem = await this.itemService.deleteItem(request.params.id);
    if (!deletedItem) {
      return reply.status(404).send({ message: 'Item not found' });
    }
    return reply.status(204).send();
  }
}
