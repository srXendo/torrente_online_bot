
const THREE = require('three')
const { parentPort, workerData } = require('worker_threads');
class WaypointsService {
    pathfinder = null

    constructor(body_data, ZONE) {
        const THREE = require('three');
        const { Pathfinding } = require('three-pathfinding');

        this.body_data = body_data
        this.ZONE = 'level'
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
        this.pathfinder.setZoneData(this.ZONE, zone);
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
    get_waypoints(target_position, bot_cords) {
        console.log("waypoints 1:")
        if (!target_position) return;
        console.log("waypoints 2:")

        const botPos = bot_cords;
        if (!botPos) return;


        const pp = this.get_vector(target_position.x, target_position.y);
        const bp = this.get_vector(botPos.x, botPos.y);
        console.log(pp, bp)
        console.log("waypoints 3:", pp)
        const playerGroup = this.pathfinder.getGroup(this.ZONE, pp, true);
        if (playerGroup == null) return;
        console.log("waypoints 4:")

        console.log("waypoints 5:")

        const newPath = this.pathfinder.findPath(bp, pp, this.ZONE, playerGroup);
        if (!newPath || newPath.length === 0) return;
        console.log("waypoints 6:")
        return { path: newPath, group: playerGroup };

    }
    send_waypoints(waypoints, number_worker) {
        this.#send_msg_worker('waypoints', number_worker, { waypoints })
    }
    get_patrol_points(bot_cords) {
        const botPos = this.get_vector(bot_cords.x, bot_cords.y);

        const groupID = this.pathfinder.getGroup(
            this.ZONE,
            botPos,
            true
        );

        if (groupID == null) return null;

        const zone = this.pathfinder.zones[this.ZONE];
        const group = zone.groups[groupID];

        if (!group || group.length < 4) return null;

        const patrolPoints = [];

        // Punto inicial
        patrolPoints.push({
            x: botPos.x,
            y: botPos.y,
            z: botPos.z
        });

        let currentPos = botPos;
        const usedNodes = new Set();

        for (let i = 0; i < 2; i++) {
            let selected = null;

            for (let attempt = 0; attempt < 30; attempt++) {

                const node =
                    group[Math.floor(Math.random() * group.length)];

                if (usedNodes.has(node.id))
                    continue;

                const center = node.centroid;

                const path = this.pathfinder.findPath(
                    currentPos,
                    center,
                    this.ZONE,
                    groupID
                );

                if (!path || path.length === 0)
                    continue;

                selected = center;
                usedNodes.add(node.id);
                break;
            }

            if (!selected)
                return null;

            patrolPoints.push({
                x: selected.x,
                y: selected.y,
                z: selected.z
            });

            currentPos = selected;
        }

        // Último punto = volver al inicio
        patrolPoints.push({
            x: botPos.x,
            y: botPos.y,
            z: botPos.z
        });

        return patrolPoints.map(patroPoint=>this.get_server_coords(patroPoint.x, patroPoint.z));
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
    get_server_coords(x, z) {
        return {
            x: ((x + 3.90) / 15) * (1000 * 9.98),
            y: 0.5,
            z: ((1.60 - z) / 15) * (1000 * 8.47508)
        };
    }
}


module.exports = workerData
console.log("worker_waypoints start")
const waypointsService = new WaypointsService(workerData.body_data, workerData.ZONE)
parentPort.on("message", (msg_worker) => {
    try {
        
        const { type, data, number_bot } = JSON.parse(msg_worker)
        console.log(`waypoints recive msg: `, type)
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
                console.error(`msg_worker_waypoints_no_recognice ${type}`)
                break;
        }
    } catch (err) {
        console.error(new Error(err.stack))
        throw new Error(err.stack)
    }
})