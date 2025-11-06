import { Types } from 'mongoose';

interface CaseItem {
  item: string | Types.ObjectId;
  chance: number;
}

export interface CreateCaseDto {
  name: string;
  description: string;
  price: number;
  items?: CaseItem[];
}

export type UpdateCaseDto = Partial<CreateCaseDto>;

export const caseBodySchema = {
  type: 'object',
  required: ['name', 'price', 'description'],
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    price: { type: 'number', minimum: 0 },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['item', 'chance'],
        properties: {
          item: { type: 'string' },
          chance: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
  },
};

export const caseParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
};
