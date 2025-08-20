import { FastifyInstance } from 'fastify';

export async function registerDocRoutes(app: FastifyInstance) {
    app.post('/docs', async (req, reply) => {
        const body = req.body as any;
        app.log.info({ capsule: body?.capsule, nodeId: body?.nodeId, fileKey: body?.fileKey }, 'doc saved (stub)');
        return reply.send({ ok: true });
    });
}
