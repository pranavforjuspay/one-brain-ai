import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAIRoutes } from './routes.ai';
import { registerDocRoutes } from './routes.docs';
import { registerInspirationRoutes } from './routes.inspiration';
import { strategyRoutes } from './routes.strategy.js';
import { comprehensiveRoutes } from './routes.comprehensive.js';
import { unifiedRoutes } from './routes.unified.js';

async function main() {
    const app = Fastify({ logger: true });
    await app.register(cors, { origin: true });

    await registerAIRoutes(app);
    await registerDocRoutes(app);
    await registerInspirationRoutes(app);
    await app.register(strategyRoutes);
    await app.register(comprehensiveRoutes);
    await app.register(unifiedRoutes);

    const port = Number(process.env.PORT || 8787);
    await app.listen({ port, host: '0.0.0.0' });
    console.log('one-brain-ai backend on', port);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
