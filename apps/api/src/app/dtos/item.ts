import { ItemType } from '@lolz-bots/shared';

export interface CreateItemDto {
  name: string;
  description?: string;
  type: ItemType;
  price?: number;
}

export type UpdateItemDto = Partial<CreateItemDto>;

export const itemBodySchema = {
  type: 'object',
  required: ['name', 'type', 'description'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    type: { type: 'string', enum: Object.values(ItemType) },
    price: { type: 'number', minimum: 0 },
    roleId: { type: 'string' },
  },
  if: {
    properties: {
      type: { const: ItemType.ROLE },
    },
  },
  then: {
    required: ['roleId'],
  },
};

export const itemParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
};
