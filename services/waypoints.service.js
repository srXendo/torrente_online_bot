
const THREE = require('three')
const { parentPort, workerData } = require('worker_threads');
class WaypointsService {
    pathfinder = null

    constructor(body_data, ZONE) {
        const THREE = require('three');
        const { Pathfinding } = require('three-pathfinding');

        this.body_data = body_data
        this.ZONE = ZONE
        this.pathfinder = new Pathfinding();

        const { positions, index } = body_data;

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array(positions),
                3
            )
        );

        if (index) {
            geometry.setIndex(
                new THREE.BufferAttribute(
                    new Uint32Array(index),
                    1
                )
            );
        }
        console.log('positions, index: ', positions, index)
        const zone = Pathfinding.createZone(geometry);
        console.log('geometry: ', geometry)
        this.pathfinder.setZoneData(ZONE, zone);
        console.log("waypoints zones: ", this.pathfinder.zones, geometry)

    }
    #send_msg_worker(type, number_worker, data) {
        try {
            parentPort.postMessage(JSON.stringify({ type, number_worker, data }))
        } catch (err) {
            console.error(new Error(err.stack))
            throw new Error(err)
        }
    }
    get_waypoints(player_cords, bot_cords) {
        console.log("waypoints 1:")
        const playerPos = player_cords;
        if (!playerPos) return;
        console.log("waypoints 2:")

        const botPos = bot_cords;
        if (!botPos) return;


        const pp = this.get_vector(playerPos.x, playerPos.y);
        const bp = this.get_vector(botPos.x, botPos.y);
        console.log(pp, bp)
        console.log("waypoints 3:", pp)
        const playerGroup = this.pathfinder.getGroup(this.ZONE, pp, true);
        if (playerGroup == null) return;
        console.log("waypoints 4:")

        console.log("waypoints 5:")

        const newPath = this.pathfinder.findPath(bp, pp, this.ZONE, playerGroup);
        if (!newPath || newPath.length === 0) return;

        return { path: newPath, group: playerGroup };

    }
    send_waypoints(waypoints, number_worker) {
        this.#send_msg_worker('waypoints', number_worker, { waypoints })
    }
    get_patrol_points(bot_cords) {
        const startPos = this.get_vector(bot_cords.x, bot_cords.y);

        const group = this.pathfinder.getGroup(
            this.ZONE,
            startPos,
            true
        );

        if (group == null) return [];

        const zone = this.pathfinder.zones[this.ZONE];
        const nodes = zone.groups[group];

        if (!nodes?.length) return [];

        const points = [];
        let currentPos = startPos.clone();

        const MIN_DISTANCE = 3;
        const MAX_DISTANCE = 12;

        for (let i = 0; i < 3; i++) {
            let selected = null;

            for (let attempt = 0; attempt < 100; attempt++) {

                const node =
                    nodes[Math.floor(Math.random() * nodes.length)];

                const candidate = node.centroid;

                const dx = candidate.x - currentPos.x;
                const dz = candidate.z - currentPos.z;

                const distance = Math.sqrt(dx * dx + dz * dz);

                if (
                    distance < MIN_DISTANCE ||
                    distance > MAX_DISTANCE
                ) {
                    continue;
                }

                // evitar puntos repetidos
                const tooClose = points.some(p => {
                    const ddx = p.x - candidate.x;
                    const ddz = p.z - candidate.z;

                    return Math.sqrt(ddx * ddx + ddz * ddz) < 2;
                });

                if (tooClose) continue;

                const path = this.pathfinder.findPath(
                    currentPos,
                    candidate,
                    this.ZONE,
                    group
                );

                if (!path || path.length === 0) {
                    continue;
                }

                selected = candidate;
                break;
            }

            if (!selected) break;

            points.push({
                x: selected.x,
                y: selected.y,
                z: selected.z
            });

            currentPos = selected.clone();
        }

        // verificar que puede volver al inicio
        const returnPath = this.pathfinder.findPath(
            currentPos,
            startPos,
            this.ZONE,
            group
        );

        if (!returnPath || returnPath.length === 0) {
            return [];
        }

        points.push({
            x: startPos.x,
            y: startPos.y,
            z: startPos.z
        });

        return points;
    }
    send_patrol_points(patrol_points, number_worker) {
        this.#send_msg_worker('patrol_points', number_worker, { patrol_points })
    }
    get_vector(x, z) {
        const bx = ((x / (1000 * 9.98)) * 15) + -3.90;
        const bz = -(((z / (1000 * 8.47508)) * 15) + -1.60);
        const pp = new THREE.Vector3(bx, 0.5, bz);
        return pp
    }
}


module.exports = workerData
console.log("worker_waypoints start")
const waypointsService = new WaypointsService(workerData.body_data, workerData.ZONE)
parentPort.on("message", (msg_worker) => {
    try {
        const { type, data, number_bot } = JSON.parse(msg_worker)
        switch (type) {
            case 'calc_waypoints':
                console.log('calc_waypoints: ', data, 'number_bot: ', data.number_worker)
                const res_waypoints = waypointsService.get_waypoints(data.player_cords, data.bot_cords)
                waypointsService.send_waypoints(res_waypoints, data.number_worker)
                break;
            case 'calc_patrol_points':
                const res_patrol_points = waypointsService.get_patrol_points(data.bot_cords)
                waypointsService.send_patrol_points(res_patrol_points, data.number_worker)
                break;
            default:

                break;
        }
    } catch (err) {
        console.error(new Error(err.stack))
        throw new Error(err.stack)
    }
})