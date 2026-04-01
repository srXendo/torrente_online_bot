'use strict';

const http2 = require('http2');

// ─── Sesión HTTP/2 fija a localhost:3000 ──────────────────────────────────────
// Todas las peticiones (recive_start, action_bot, SSE) van siempre aquí.

const LOCAL_HOST = 'localhost';
const LOCAL_PORT = 3000;

let _session = null;

function getSession() {
    if (_session && !_session.destroyed) return _session;

    console.log(`[http2] Nueva sesión → ${LOCAL_HOST}:${LOCAL_PORT}`);
    _session = http2.connect(`https://${LOCAL_HOST}:${LOCAL_PORT}`, {rejectUnauthorized: false});

    _session.on('error', err => {
        console.error('[http2] Error de sesión:', err.message);
        _session.destroy();
        _session = null;
    });

    return _session;
}

/**
 * POST sobre la sesión http2 local.
 * Devuelve Promise<{ status, body }>.
 */
function h2post(path, bodyObj) {
    return new Promise((resolve, reject) => {
        const body    = JSON.stringify(bodyObj);
        const session = getSession();

        const req = session.request({
            ':method':        'POST',
            ':path':          path,
            'content-type':   'application/json',
            'content-length': Buffer.byteLength(body)
        });

        let status = 0;
        let data   = '';

        req.on('error',    reject);
        req.on('response', headers => { status = headers[':status']; });
        req.on('data',     chunk   => { data += chunk; });
        req.on('end',      ()      => resolve({ status, body: data }));

        req.write(body);
        req.end();
    });
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const BOT_STATES = {
    NO_ATTACK: 'no_attack',
    PATROL:    'patrol',
    CHASE:     'chase',
    ATTACK:    'attack'
};

const MOVE_ACTIONS = {
    camera_right: { action_type: 'camera_right' },
    camera_left:  { action_type: 'camera_left'  },
    forward:      { action_type: 'forward_move'  }
};

const SOUND_SENSOR_RADIUS = 400 * 8;
const SENSOR_DT_MS        = 20; // 50 Hz

// ─── Estado global ─────────────────────────────────────────────────────────────

const players       = {}; // players[id] = { x, y, z, rotY }
const state_bots    = {}; // state_bots[id] = BOT_STATES.* | { x,y,z }
const botPatrolData = {};

// ─── Utilidades matemáticas ────────────────────────────────────────────────────

function normalizeAngle(a) {
    return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

function angleToTarget(botX, botZ, targetX, targetZ) {
    return Math.atan2(targetZ - botZ, targetX - botX) - Math.PI / 2;
}

function distSq(ax, az, bx, bz) {
    const dx = bx - ax;
    const dz = bz - az;
    return dx * dx + dz * dz;
}

// ─── Comunicación con localhost:3000 ──────────────────────────────────────────

function send_action(id_bot, action) {
    h2post('/api/action_bot', { id_bot, state_bot: action })
        .catch(err => console.error(`[send_action] bot ${id_bot} / ${action}:`, err.message));
}

// ─── Lógica de estados ─────────────────────────────────────────────────────────

function process_state(id_bot, state) {
    state_bots[id_bot] = state;

    switch (state) {
        case BOT_STATES.ATTACK:
            send_action(id_bot, BOT_STATES.ATTACK);
            break;
        case BOT_STATES.NO_ATTACK:
            break;
        default:
            break;
    }
}

// ─── Tick de bot ───────────────────────────────────────────────────────────────

function tickBot(id) {
    const bot    = players[id];
    const player = players[0];
    if (!bot || !player) return;

    // Sensor de sonido
    const rsq = SOUND_SENSOR_RADIUS * SOUND_SENSOR_RADIUS;
    if (distSq(bot.x, bot.z, player.x, player.z) <= rsq) {
        state_bots[id] = { x: player.x, y: player.y, z: player.z };
    }

    // Orientación hacia el jugador
    const target  = normalizeAngle(angleToTarget(bot.x, bot.z, player.x, player.z) + Math.PI);
    const current = normalizeAngle(-bot.rotY);

    let diff = current - target;
    if (diff >  Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    if      (diff >  0.15) send_action(id, MOVE_ACTIONS.camera_left.action_type);
    else if (diff < -0.15) send_action(id, MOVE_ACTIONS.camera_right.action_type);
    else                   send_action(id, MOVE_ACTIONS.forward.action_type);
}

// ─── Loop principal ────────────────────────────────────────────────────────────

function startSensorLoop() {
    setInterval(() => {
        for (const id_str in players) {
            const id = parseInt(id_str, 10);
            if (id === 0) continue;
            tickBot(id);
        }
    }, SENSOR_DT_MS);
}

// ─── SSE desde localhost:3000 ──────────────────────────────────────────────────

function connectSSE() {
    console.log(`[SSE] Conectando a ${LOCAL_HOST}:${LOCAL_PORT}/api/connect …`);

    let session;
    try {
        session = getSession();
    } catch (err) {
        console.error('[SSE] No se pudo obtener sesión:', err.message);
        setTimeout(connectSSE, 2000);
        return;
    }

    const req = session.request({
        ':method': 'GET',
        ':path':   '/api/connect',
        'accept':  'text/event-stream'
    });

    req.on('error', err => {
        console.error('[SSE] Error de stream:', err.message, '— Reintentando en 2 s…');
        setTimeout(connectSSE, 2000);
    });

    req.on('response', headers => {
        console.log('[SSE] Conexión establecida, status:', headers[':status']);
    });

    let buffer = '';

    req.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data:')) {
                const raw = line.slice(5).trim();
                try {
                    processAction(JSON.parse(raw));
                } catch (err) {
                    console.error('[SSE] parse error:', err.message, '| raw:', raw);
                }
            }
        }
    });

    req.on('end', () => {
        console.warn('[SSE] Stream cerrado. Reconectando en 2 s…');
        setTimeout(connectSSE, 2000);
    });

    req.end();
}

// ─── Procesado de acciones SSE ─────────────────────────────────────────────────

function processAction(action) {
    if (action.type_action === 'spawn' && action.id_bot !== 0) {
        console.log(`[spawn] bot ${action.id_bot}`);
        const v = action.value_action;
        players[action.id_bot] = { x: v.x, y: v.z, z: -v.y, rotY: 0 };
        process_state(action.id_bot, BOT_STATES.NO_ATTACK);
    }

    if (action.type_action === 'sync') {
        const v  = action.value_action;
        const id = action.id_bot;
        if (!players[id]) players[id] = { x: 0, y: 0, z: 0, rotY: 0 };
        players[id].x = v.x;
        players[id].y = v.z;
        players[id].z = -v.y;
        if (typeof v.r === 'number') {
            players[id].rotY = -(v.r / 256) * Math.PI * 2;
        }
    }

    if (action.type_action === 'die' && action.id_bot !== 0) {
        console.log(`[die] bot ${action.id_bot}`);
        delete players[action.id_bot];
        delete state_bots[action.id_bot];
        delete botPatrolData[action.id_bot];
    }
}

// ─── Inicio de sesión: envía ip/puerto del juego al backend ───────────────────
//
// El backend es quien se conecta al servidor del juego con esos datos.
// Nosotros solo se los pasamos y esperamos OK.

function recive_start(ip_server, port_server, num_bots) {
    return h2post('/api/recive_start', { ip_server, port_server, num_bots })
        .then(({ status, body }) => {
            if (status >= 200 && status < 300) {
                console.log(`[recive_start] OK (${status}):`, body);
            } else {
                throw new Error(`recive_start status ${status}: ${body}`);
            }
        });
}

// ─── Arranque ─────────────────────────────────────────────────────────────────
//  Uso:  node bot-controller.js <ip_servidor_juego> <puerto_juego> [num_bots]
//
//  ip_servidor_juego y puerto_juego se envían al backend para que él se conecte.
//  Este proceso siempre habla con localhost:3000.

if (require.main === module) {
    const ip_server   = process.argv[2] || '192.168.1.130';
    const port_server = parseInt(process.argv[3] || '8888', 10);
    const num_bots    = parseInt(process.argv[4] || '15',   10);

    console.log(`Backend local: ${LOCAL_HOST}:${LOCAL_PORT}`);
    console.log(`Servidor juego (para el backend): ${ip_server}:${port_server}  bots: ${num_bots}`);

    players[0] = { x: 0, y: 0, z: 0, rotY: 0 };

    recive_start(ip_server, port_server, num_bots)
        .then(() => {
            connectSSE();
            startSensorLoop();
        })
        .catch(err => {
            console.error('[recive_start] Error:', err.message);
            process.exit(1);
        });
}

// ─── Exportar ─────────────────────────────────────────────────────────────────

module.exports = {
    BOT_STATES,
    MOVE_ACTIONS,
    players,
    state_bots,
    send_action,
    process_state,
    processAction,
    connectSSE,
    startSensorLoop,
    recive_start,
    normalizeAngle,
    angleToTarget
};