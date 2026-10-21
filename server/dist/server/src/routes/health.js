export async function healthRoute(app) {
    app.get('/api/v1/health', async (_request, reply) => {
        const mem = process.memoryUsage();
        const response = {
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            version: '1.0.0',
            timestamp: Date.now(),
            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024)
            }
        };
        return reply.send(response);
    });
}
