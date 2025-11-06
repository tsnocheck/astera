import { FastifyReply, FastifyRequest } from 'fastify';
import { CaseService } from '../services/case';
import { CreateCaseDto, UpdateCaseDto } from '../dtos/case';

export class CaseController {
  constructor(private caseService: CaseService) {}

  async createCase(
    request: FastifyRequest<{ Body: CreateCaseDto }>,
    reply: FastifyReply,
  ) {
    try {
      const newCase = await this.caseService.createCase(request.body);
      return reply.status(201).send(newCase);
    } catch (e: any) {
      if (e.message.includes('exceed 100')) {
        return reply.status(400).send({ message: e.message });
      }
      return reply.status(409).send({ message: 'Case already exists' });
    }
  }

  async getAllCases(request: FastifyRequest, reply: FastifyReply) {
    const cases = await this.caseService.getAllCases();
    return reply.send(cases);
  }

  async getCaseById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const caseDoc = await this.caseService.getCaseById(request.params.id);
    if (!caseDoc) {
      return reply.status(404).send({ message: 'Case not found' });
    }
    return reply.send(caseDoc);
  }

  async updateCase(
    request: FastifyRequest<{ Body: UpdateCaseDto; Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const updatedCase = await this.caseService.updateCase(
        request.params.id,
        request.body,
      );
      if (!updatedCase) {
        return reply.status(404).send({ message: 'Case not found' });
      }
      return reply.send(updatedCase);
    } catch (e: any) {
      if (e.message.includes('exceed 100')) {
        return reply.status(400).send({ message: e.message });
      }
      return reply.status(500).send({ message: 'Internal Server Error' });
    }
  }

  async deleteCase(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const deletedCase = await this.caseService.deleteCase(request.params.id);
    if (!deletedCase) {
      return reply.status(404).send({ message: 'Case not found' });
    }
    return reply.status(204).send();
  }
}
