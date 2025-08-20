import { FastifyInstance } from 'fastify';
import { prisma } from './prisma.js';

export async function registerSearchRoutes(app: FastifyInstance) {
    app.get('/search', async (req, reply) => {
        const q = (req.query as any).q?.toString().trim() ?? '';
        const level = (req.query as any).level?.toString();
        const state = (req.query as any).state?.toString();

        const where: any = {
            AND: [
                level ? { level } : {},
                state ? { state } : {},
                q ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { problem: { contains: q, mode: 'insensitive' } },
                        { outcome: { contains: q, mode: 'insensitive' } }
                    ]
                } : {}
            ]
        };

        const results = await prisma.doc.findMany({
            where,
            orderBy: [{ canonical: 'desc' }, { updatedAt: 'desc' }],
            take: 10
        });

        return reply.send({ results });
    });
}
