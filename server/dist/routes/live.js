import { WebSocketServer, WebSocket } from 'ws';
export const liveRooms = new Map();
export function setupLiveWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/live' });
    wss.on('connection', (socket) => {
        const conn = {
            socket,
            isAlive: true
        };
        socket.on('pong', () => {
            conn.isAlive = true;
        });
        socket.on('message', (rawData) => {
            try {
                const msg = JSON.parse(rawData.toString());
                if (msg.type === 'ping') {
                    conn.isAlive = true;
                    socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    return;
                }
                if (msg.type === 'join') {
                    const roomCode = (msg.room || 'default').toUpperCase().trim();
                    conn.room = roomCode;
                    conn.speaker = msg.speaker || 'Anonymous';
                    if (!liveRooms.has(roomCode)) {
                        liveRooms.set(roomCode, new Set());
                    }
                    liveRooms.get(roomCode).add(conn);
                    socket.send(JSON.stringify({
                        type: 'join',
                        room: roomCode,
                        text: `Connected to Live Caption Room ${roomCode}`,
                        timestamp: Date.now()
                    }));
                    return;
                }
                if (msg.type === 'caption') {
                    const roomCode = conn.room || (msg.room || '').toUpperCase().trim();
                    if (!roomCode || !liveRooms.has(roomCode))
                        return;
                    const broadcastPayload = JSON.stringify({
                        type: 'caption',
                        room: roomCode,
                        speaker: msg.speaker || conn.speaker || 'Speaker',
                        text: msg.text || '',
                        isFinal: msg.isFinal ?? true,
                        timestamp: msg.timestamp || Date.now()
                    });
                    const clients = liveRooms.get(roomCode);
                    if (clients) {
                        for (const client of clients) {
                            if (client.socket.readyState === WebSocket.OPEN) {
                                client.socket.send(broadcastPayload);
                            }
                        }
                    }
                    return;
                }
                if (msg.type === 'clear') {
                    const roomCode = conn.room;
                    if (roomCode && liveRooms.has(roomCode)) {
                        const clearPayload = JSON.stringify({
                            type: 'clear',
                            room: roomCode,
                            timestamp: Date.now()
                        });
                        for (const client of liveRooms.get(roomCode)) {
                            if (client.socket.readyState === WebSocket.OPEN) {
                                client.socket.send(clearPayload);
                            }
                        }
                    }
                }
            }
            catch {
                socket.send(JSON.stringify({
                    type: 'error',
                    text: 'Invalid message payload'
                }));
            }
        });
        socket.on('close', () => {
            if (conn.room && liveRooms.has(conn.room)) {
                const roomClients = liveRooms.get(conn.room);
                roomClients.delete(conn);
                if (roomClients.size === 0) {
                    liveRooms.delete(conn.room);
                }
            }
        });
        socket.on('error', () => {
            if (conn.room && liveRooms.has(conn.room)) {
                liveRooms.get(conn.room).delete(conn);
            }
        });
    });
    const interval = setInterval(() => {
        for (const [roomCode, clients] of liveRooms.entries()) {
            for (const client of Array.from(clients)) {
                if (!client.isAlive) {
                    client.socket.terminate();
                    clients.delete(client);
                }
                else {
                    client.isAlive = false;
                    client.socket.ping();
                }
            }
            if (clients.size === 0) {
                liveRooms.delete(roomCode);
            }
        }
    }, 30000);
    wss.on('close', () => {
        clearInterval(interval);
    });
    return wss;
}
