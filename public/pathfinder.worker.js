/**
 * bot.worker.js
 * Lógica pesada de bots: raycasting puro JS, waypoints, ángulos.
 * SIN imports — compatible con Web Workers.
 */

// ─── Geometría pura ────────────────────────────────────────────────────────────

function v3(x, y, z) { return { x, y, z }; }
function sub(a, b)   { return v3(a.x-b.x, a.y-b.y, a.z-b.z); }
function add(a, b)   { return v3(a.x+b.x, a.y+b.y, a.z+b.z); }
function scale(v, s) { return v3(v.x*s, v.y*s, v.z*s); }
function dot(a, b)   { return a.x*b.x + a.y*b.y + a.z*b.z; }
function cross(a, b) { return v3(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x); }
function length(v)   { return Math.sqrt(dot(v,v)); }
function normalize(v){ const l = length(v)||1; return scale(v, 1/l); }
function clone(v)    { return v3(v.x, v.y, v.z); }

/**
 * Möller–Trumbore.
 * Retorna t > 0 si hay intersección, -1 si no.
 */
function rayTriangle(ro, rd, v0, v1, v2) {
    const EPSILON = 1e-8;
    const e1 = sub(v1, v0);
    const e2 = sub(v2, v0);
    const h  = cross(rd, e2);
    const a  = dot(e1, h);
    if (Math.abs(a) < EPSILON) return -1;
    const f = 1/a;
    const s = sub(ro, v0);
    const u = f * dot(s, h);
    if (u < 0 || u > 1) return -1;
    const q = cross(s, e1);
    const v = f * dot(rd, q);
    if (v < 0 || u+v > 1) return -1;
    const t = f * dot(e2, q);
    return t > EPSILON ? t : -1;
}

/**
 * Lanza un rayo contra una lista de meshes.
 * meshList: [{ tris: Float32Array [9 floats/tri], type: string }]
 * Retorna { hit, t, type }
 */
function castRay(origin, direction, meshList, maxDist) {
    let minT    = maxDist;
    let hitType = null;

    for (const mesh of meshList) {
        const tris = mesh.tris;
        const n    = tris.length / 9;
        for (let i = 0; i < n; i++) {
            const b  = i * 9;
            const v0 = v3(tris[b],   tris[b+1], tris[b+2]);
            const v1 = v3(tris[b+3], tris[b+4], tris[b+5]);
            const v2 = v3(tris[b+6], tris[b+7], tris[b+8]);
            const t  = rayTriangle(origin, direction, v0, v1, v2);
            if (t > 0 && t < minT) { minT = t; hitType = mesh.type; }
        }
    }
    return { hit: hitType !== null, t: minT, type: hitType };
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const SENSOR_HEIGHT         = 10;
const FORWARD_OFFSET        = 30;
const SENSOR_LENGTH         = 200;
const SOUND_SENSOR_RADIUS_SQ = 560;

const BOT_STATES  = { NO_ATTACK:'no_attack', ATTACK:'attack' };
const MOVE_ACTIONS = { camera_right:'camera_right', camera_left:'camera_left', forward:'forward_move' };

// ─── Estado global ─────────────────────────────────────────────────────────────

let mapMeshes = [];   // [{ tris: Float32Array, type: 'wall' }]
let botMeshes = [];   // [{ tris: Float32Array, type: 'bot'|'player', id }]
let botStates = {};   // id → { pos, rotY, stateName, nextWaypoint, historyWaypoint }

// ─── Ángulos ───────────────────────────────────────────────────────────────────

function normalizeAngle(a) {
    return ((a % (2*Math.PI)) + 2*Math.PI) % (2*Math.PI);
}

function angleToTarget(bx, bz, tx, tz) {
    return Math.atan2(tz - bz, tx - bx) - Math.PI/2;
}

/**
 * Forward del bot en world-space.
 * Three.js getWorldDirection devuelve -Z local → multiply -1 → (sin rotY, 0, cos rotY).
 * IMPORTANTE: preservamos la convención original del main.
 */
function getBotForward(rotY) {
    return normalize(v3(Math.sin(rotY), 0, Math.cos(rotY)));
}

// ─── get_next_waypoint ─────────────────────────────────────────────────────────

function get_next_waypoint(nowWP, playerPos, prevWP, depth, history) {
    const origin = v3(nowWP.x, nowWP.y + SENSOR_HEIGHT, nowWP.z);

    let backDir = null;
    if (prevWP) {
        backDir = normalize(v3(prevWP.x - nowWP.x, 0, prevWP.z - nowWP.z));
    }

    const ANGLE_STEP        = 10;
    const BACKTRACK_PENALTY = 2.0;
    const HISTORY_PENALTY   = 1.0;

    let bestScore = -Infinity;
    let bestWP    = null;

    for (let a = 0; a < 360; a += ANGLE_STEP) {
        const angle = (a / 360) * Math.PI * 2;
        const dir   = normalize(v3(Math.cos(angle), 0, Math.sin(angle)));

        const hit = castRay(origin, dir, mapMeshes, SENSOR_LENGTH);
        if (hit.hit && hit.type === 'wall') continue;

        const candidate = add(nowWP, scale(dir, SENSOR_LENGTH));

        const toPlayer = normalize(v3(playerPos.x - nowWP.x, 0, playerPos.z - nowWP.z));
        let score = dot(dir, toPlayer);

        if (backDir) {
            score -= Math.max(0, dot(dir, backDir)) * BACKTRACK_PENALTY;
        }

        for (let i = 0; i < history.length; i++) {
            const hd = normalize(v3(history[i].x - nowWP.x, 0, history[i].z - nowWP.z));
            const recency = (i + 1) / history.length;
            score -= Math.max(0, dot(dir, hd)) * HISTORY_PENALTY * recency;
        }

        if (score > bestScore) { bestScore = score; bestWP = candidate; }
    }

    // Enviar al hilo principal para renderWaypoint(depth, wp)
    if (bestWP) {
        self.postMessage({ type: 'waypoint', depth, wp: { x: bestWP.x, y: bestWP.y, z: bestWP.z } });
    }

    if (bestWP && depth > 1) {
        const newHistory = [...history, nowWP];
        history = get_next_waypoint(bestWP, playerPos, nowWP, depth - 1, newHistory);
    } else if (depth <= 1) {
        history.push(bestScore);
    }

    return history;
}

// ─── Update individual de bot ──────────────────────────────────────────────────

function updateBot(id, playerPos) {
    const bs = botStates[id];
    if (!bs) return;

    const pos   = bs.pos;
    const rotY  = bs.rotY;

    // ── Sensor forward (para detectar jugador/pared) ──
    const origin  = v3(pos.x, pos.y + SENSOR_HEIGHT, pos.z);
    const forward = getBotForward(rotY);
    const start   = add(origin, scale(forward, FORWARD_OFFSET));

    const others  = botMeshes.filter(m => m.id !== id);
    const allMesh = [...mapMeshes, ...others];
    const hit     = castRay(start, forward, allMesh, SENSOR_LENGTH);

    if (hit.hit && hit.type === 'player') {
        self.postMessage({ type: 'action', id, action: BOT_STATES.ATTACK });
    }

    // ── Sin waypoint inicial ──
    if (!bs.nextWaypoint) {
        const hist = get_next_waypoint(clone(pos), playerPos, null, 20, []);
        bs.historyWaypoint = hist;
        bs.nextWaypoint    = hist.shift() || null;
    }

    if (bs.stateName === 'SCAN') {
        const hist = get_next_waypoint(clone(pos), playerPos, null, 20, []);
        bs.historyWaypoint = hist;
        bs.nextWaypoint    = hist.shift() || null;
        bs.stateName       = 'ACTION';
        return;
    }

    if (bs.stateName === 'ACTION') {
        const nx = bs.nextWaypoint;
        if (!nx) return;

        const dx = nx.x - pos.x;
        const dz = nx.z - pos.z;

        if (dx*dx + dz*dz <= SOUND_SENSOR_RADIUS_SQ) {
            if (bs.historyWaypoint.length <= 2) {
                bs.stateName = 'SCAN';
                return;
            }
            bs.nextWaypoint = bs.historyWaypoint.shift() || null;
        }

        if (bs.stateName === 'SCAN') return;

        const newAngle = angleToTarget(pos.x, pos.z, bs.nextWaypoint.x, bs.nextWaypoint.z);
        const target   = normalizeAngle(newAngle + Math.PI);
        const current  = normalizeAngle(-rotY);

        let diff = current - target;
        if (diff >  Math.PI) diff -= 2*Math.PI;
        if (diff < -Math.PI) diff += 2*Math.PI;

        if      (diff >  0.15) self.postMessage({ type: 'action', id, action: MOVE_ACTIONS.camera_left  });
        else if (diff < -0.15) self.postMessage({ type: 'action', id, action: MOVE_ACTIONS.camera_right });
        else                   self.postMessage({ type: 'action', id, action: MOVE_ACTIONS.forward      });
    }
}

// ─── Receptor de mensajes ──────────────────────────────────────────────────────

self.onmessage = function(e) {
    const msg = e.data;

    switch (msg.type) {

        /**
         * Enviar toda la geometría del mapa (una vez al inicio).
         * msg.meshes = [{ tris: Float32Array, type: 'wall' }, ...]
         */
        case 'init_map':
            mapMeshes = msg.meshes;
            break;

        /**
         * Añadir/actualizar mesh de colisión de un bot.
         * msg = { id, tris: Float32Array, botType: 'bot'|'player' }
         */
        case 'set_bot_mesh':
            botMeshes = botMeshes.filter(m => m.id !== msg.id);
            botMeshes.push({ tris: msg.tris, type: msg.botType, id: msg.id });
            break;

        case 'remove_bot_mesh':
            botMeshes = botMeshes.filter(m => m.id !== msg.id);
            break;

        /**
         * Spawn: crear estado para un bot nuevo.
         * msg = { id, x, y, z }
         * NOTA: coordenadas ya en espacio Three.js (y invertido fuera si hace falta)
         */
        case 'spawn_bot':
            botStates[msg.id] = {
                pos:             v3(msg.x, msg.y, msg.z),
                rotY:            0,
                stateName:       'ACTION',
                nextWaypoint:    null,
                historyWaypoint: []
            };
            break;

        /**
         * Sync de posición desde servidor.
         * msg = { id, x, y, z, rotY }
         */
        case 'sync_bot':
            if (botStates[msg.id]) {
                botStates[msg.id].pos  = v3(msg.x, msg.y, msg.z);
                botStates[msg.id].rotY = msg.rotY;
            }
            break;

        /** Bot muerto. */
        case 'die_bot':
            delete botStates[msg.id];
            botMeshes = botMeshes.filter(m => m.id !== msg.id);
            break;

        /**
         * Tick del loop principal.
         * msg = { playerPos: { x, y, z } }
         * El worker procesa TODOS los bots y emite mensajes 'action' y 'waypoint'.
         */
        case 'tick':
            for (const idStr in botStates) {
                updateBot(parseInt(idStr), msg.playerPos);
            }
            break;
    }
};