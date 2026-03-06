'use strict';

/**
 * PacketQueue — envía paquetes UDP con un rate limit de 1 paquete cada 50 ms.
 *
 * Uso:
 *   const queue = new PacketQueue({ mapper, idBotMapper, portServer, ipServer, logging });
 *   const ok = await queue.send(idBot, buf);
 */
class PacketQueue {
    /**
     * @param {object}  opts
     * @param {object}  opts.mapper        - Mapa de servidores UDP (this.mapper)
     * @param {object}  opts.idBotMapper   - Mapa id_bot → índice (this.id_bot_mapper)
     * @param {number}  opts.portServer    - Puerto destino
     * @param {string}  opts.ipServer      - IP destino
     * @param {boolean} [opts.logging]     - Activa logs (default: false)
     * @param {number}  [opts.intervalMs]  - Ms entre paquetes (default: 50)
     */
    constructor({ mapper, idBotMapper, portServer, ipServer, logging = false, intervalMs = 50 }) {
        this.mapper      = mapper;
        this.idBotMapper = idBotMapper;
        this.portServer  = portServer;
        this.ipServer    = ipServer;
        this.logging     = logging;
        this.intervalMs  = intervalMs;

        /** @type {Array<{idBot: *, buf: Buffer, resolve: Function}>} */
        this._queue   = [];
        this._running = false;
    }

    // ─────────────────────────────────────────────
    //  API pública
    // ─────────────────────────────────────────────

    /**
     * Encola un paquete y devuelve una Promise que se resuelve con
     * `true` (enviado) o `false` (error de envío).
     *
     * @param {*}      idBot
     * @param {Buffer} buf
     * @returns {Promise<boolean>}
     */
    send(idBot, buf) {
        return new Promise((resolve) => {
            this._queue.push({ idBot, buf, resolve });
            this._startLoop();
        });
    }

    // ─────────────────────────────────────────────
    //  Internals
    // ─────────────────────────────────────────────

    _startLoop() {
        if (this._running) return;
        this._running = true;
        this._tick();
    }

    _tick() {
        if (this._queue.length === 0) {
            this._running = false;
            return;
        }

        const { idBot, buf, resolve } = this._queue.shift();

        this._sendPacket(idBot, buf)
            .then(resolve)
            .finally(() => {
                setTimeout(() => this._tick(), this.intervalMs);
            });
    }

    /**
     * Envía un único paquete UDP de forma asíncrona.
     *
     * @param {*}      idBot
     * @param {Buffer} buf
     * @returns {Promise<boolean>}
     */
    _sendPacket(idBot, buf) {
        const mapKey = this.idBotMapper[idBot];
        const server = this.mapper[mapKey]?.server;

        if (!server) {
            console.error(`PacketQueue: no se encontró servidor para id_bot=${idBot}`);
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            server.send(buf, this.portServer, this.ipServer, (err) => {
                if (err) {
                    console.error(`PacketQueue: error al enviar paquete — ${err.message}`);
                    resolve(false);
                    return;
                }

                if (this.logging) {
                    console.log(
                        `PacketQueue: paquete enviado | id_bot=${idBot} mapKey=${mapKey}\n` +
                        buf.toString('hex')
                    );
                }

                resolve(true);
            });
        });
    }
}

module.exports = PacketQueue ;