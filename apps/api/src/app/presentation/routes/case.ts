import { FastifyInstance } from 'fastify';
import { CaseController } from '../../controller/case';
import { caseBodySchema, caseParamsSchema } from '../../dtos/case';

export async function caseRoutes(
  fastify: FastifyInstance,
  controller: CaseController,
) {
  fastify.post(
    '/cases',
    { schema: { body: caseBodySchema } },
    controller.createCase.bind(controller),
  );
  fastify.get('/cases', controller.getAllCases.bind(controller));
  fastify.get(
    '/cases/:id',
    { schema: { params: caseParamsSchema } },
    controller.getCaseById.bind(controller),
  );
  fastify.put(
    '/cases/:id',
    { schema: { body: caseBodySchema, params: caseParamsSchema } },
    controller.updateCase.bind(controller),
  );
  fastify.delete(
    '/cases/:id',
    { schema: { params: caseParamsSchema } },
    controller.deleteCase.bind(controller),
  );
}
