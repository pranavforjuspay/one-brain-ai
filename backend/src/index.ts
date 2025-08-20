import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAIRoutes } from './routes.ai';
import { registerDocRoutes } from './routes.docs';

async function main() {
    const app = Fastify({ logger: true });
    await app.register(cors, { origin: true });

    await registerAIRoutes(app);
    await registerDocRoutes(app);

    const port = Number(process.env.PORT || 8787);
    await app.listen({ port, host: '0.0.0.0' });
    console.log('one-brain-ai backend on', port);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
