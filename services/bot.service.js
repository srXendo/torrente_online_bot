
const { Console } = require('console');
const EventEmitter = require('events');
const THREE = require('three')
const { parentPort, workerData } = require('worker_threads');
 class BotService {
    #server;
    #ip_server = '192.168.1.134'
    #port_server = 8888
    #number_bot = NaN
    buffer_session = 'cac340'
    party = {}
    user_bot = null
    max_name_byte = 16
    max_map_name_byte = 21
    start = false
    arr_actions = []
    in_game = false
    bot_forware_start = false
    last_byte_send = null
    last_byte_send_next = null
    bot_master = null
    can_shot = false
    can_response = true
    emit_start = new EventEmitter()
    pathfinder = null
    waypoints = null
    last_bnSeq = null
    can_move = false
    bot_helper = {send_event: (obj_json)=>{
        this.#send_msg_worker("msg_to_frontend", this.#number_bot, obj_json)
    }}
    last_bnRecv = null
    constructor(number_bot, bot_helper, bot_master, body_data, ZONE, none, ip, port) {
        const dgram = require('dgram')
        this.#server = dgram.createSocket('udp4');
        
        this.bot_master = bot_master
        this.can_response = true
        this.body_data = body_data

        this.#number_bot = number_bot
        this.#ip_server = ip
        console.log('port server : ', port, ip)
        this.#port_server = port
        this.buffer_session = (this.buffer_session + `${number_bot}`.padStart(2, '0'))
        this.user_bot = Buffer.from(('Bot' + `${number_bot}`.padStart(2, "0")), 'ascii')
        const THREE = require('three');
        const { Pathfinding } = require('three-pathfinding');
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

        const zone = Pathfinding.createZone(geometry);
        this.pathfinder.setZoneData(ZONE, zone);

    }
    #send_msg_worker(type, number_worker, data){
        try{
            parentPort.postMessage(JSON.stringify({type, number_worker, data}))
        }catch(err){
            console.error(new Error(err.stack))
            throw new Error(err)
        }
    }
    start_bot(){
        this.#server.on('listening', () => {
            const address = this.#server.address();
            this.#send_msg_worker('listening', this.#number_bot, {port: address.port})
            this.connect_bot(undefined, this.#ip_server, this.#port_server)
            
        });
        this.#server.on('error', (err) => {
            console.error(`Error en el servidor: ${err.message}`);
            this.#server.close();
        });
        this.#server.on('message', (msg)=>{
            console.log(`bot recv msg ${this.#number_bot}: `, msg.toString('hex'))
            const responses = this.handler_message(msg)
            if(responses){
                for(let msg_to_server of responses){
                    if(!msg_to_server.is_external){
                        console.log(`bot send msg  ${this.#number_bot}: `, msg_to_server.toString('hex'))
                        this.#server.send(msg_to_server, this.#port_server, this.#ip_server, (err)=>{
                            if(err){
                                console.error(new Error(err))
                                throw new Error(err.stack)
                            }
                        })
                    }
                }
            }
        })
        const HOST = '0.0.0.0';
        this.#server.bind(HOST);
    }
    handler_message(msg, rconf) {
        const headers = msg.readUInt16BE(0)
        switch (headers) {
            case 0x3f03:
            case 0x3f01:
            case 0x3701:
                /*let action_response = Buffer.from("3f020c0c" + this.buffer_session, 'hex')
                return this.process_msg(action_response, msg, msg.readUInt8(3), msg.readUInt8(2))*/
                const ok3 = Buffer.from('8006010690b00009d043b03', 'hex')

                ok3.writeUint8((msg.readUint8(2)) & 0xFF, 5)

                ok3.writeUint8(msg.readUint8(3), 4)
                return [ok3]
                break;
            case 0x3700:
            //console.log('msg: No uknow: ', '0x3700')

            /*const ok = Buffer.from("3f020404"+this.buffer_session, 'hex')
            ok.writeUint8(msg.readUint8(3), 2)
            ok.writeUint8(msg.readUint8(2), 3)*/

            case 0x3f00:
                let user_responses = []
                if (headers == 0x3f00) {
                    user_responses = this.users_actions(msg)
                }
                const ok2 = []

                ok2.push(Buffer.from("3f020404" + this.buffer_session, 'hex'))

                ok2[0].writeUint8((msg.readUint8(2) + 1) & 0xFF, 3)

                ok2[0].writeUint8((msg.readUint8(3)), 2)
                /*const ok2_aux = Buffer.from('80060101690b00009d043b03', 'hex')
                ok2_aux.writeUint8((msg.readUint8(2) + 1) & 0xFF, 5)
1: 3f020099cac34001 al mensaje: 8006030099ff0000f7ac6e0001000000
                ok2_aux.writeUint8(msg.readUint8(3), 4)*/

                //this.arr_actions.push([ ...ok2])// this.process_msg(user_responses, msg, msg.readUInt8(2), msg.readUInt8(3))
                return [...user_responses, ...ok2]
                break;
            case 0x8006:
                //console.log('msg: main bucle: ', '0x8006')

                let action_response = this.get_action(msg)
                return this.process_msg(action_response, msg, msg.readUInt8(4), msg.readUInt8(5))
    
                break;
            case 0x7f00:
                const first_stage2 = Buffer.from("7f000202c3000000", 'hex')
                first_stage2.writeUInt8(msg.readUInt8(3), 2)
                first_stage2.writeUInt8(0, 3)
                if (msg.readUInt8(2) + 1 <= 255) {
                    first_stage2.writeUInt8(msg.readUInt8(2) + 1, 3)
                }

                if (msg.readUInt8(4) !== 0xdf) {
                    //this.dpnid = msg.slice(164, 167)

                    const before_name = Buffer.from("3f0003020000", 'hex')

                    before_name.writeUInt8(msg.readUInt8(3) + 1, 2)
                    before_name.writeUInt8(msg.readUInt8(2), 3)

                    const name = Buffer.from(this.user_bot.toString('hex').padEnd(this.max_name_byte * 2, "0"), 'hex')
                    const after_name_before_map_name = Buffer.from('0b0200000000000000000000080600000003', 'hex')

                    const map_name = Buffer.from(this.party.mapNameBuff.toString('hex').padEnd(this.max_map_name_byte * 2, "0"), 'hex')//Buffer.from("000000034d505f444d545f5645525449474f0000000000",'hex')
                    const after_map_name = Buffer.from('90b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903', 'hex')
                    return [first_stage2, this.replace_name_map((Buffer.concat([before_name, name, after_name_before_map_name, map_name, after_map_name])), this.party.mapName, this.party.currentPlayers, this.party.maxPlayers)]
                } else {

                    return this.disconnect()
                }
                break;
            case 0x3f02:

                //console.log('msg: ping: ', '0x3f02')
                return []
                break;
            case 0x8802:
                
                //console.log('msg: firstStage: ', "0x8802")
                const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000', 'hex')
                const pre1 = Buffer.from("8002010006000100" + this.buffer_session + "e665f602", "hex")
                const pre2 = Buffer.from("3f020000" + this.buffer_session + "", 'hex')
                this.last_bnSeq = 0x01
                this.last_bnRecv = 0x00
                return [pre1, pre2, session]
                break;
            case 0x0003:
                this.party = this.extract_data(msg)
                console.log(this.party)
                this.#number_bot = this.party.currentPlayers
                return [Buffer.from("8801000006000100" + this.buffer_session + "c2091002", 'hex')]
                break;
            case 0x3f08:
                return []
                break;
            default:
                console.log("err: msg not recognice: ", msg)
                return false
                break;
        }
    }
    users_actions(msg) {

        const bot = msg.readUInt8(4)
        const action = msg.readUInt8(5) //action player byte
        let responses = []
        const ok2 = Buffer.from("3f020404" + this.buffer_session, 'hex')
        ok2.writeUint8(msg.readUint8(3), 2)
        ok2.writeUint8(msg.readUint8(2), 3)
        //console.log('action, bot: ', action, this.#number_bot)
        switch (action) {
            case 0xd2:

  
                
               
                if (msg.readUInt8(msg.length - 1) === 0xde) {


                        setTimeout(()=>{

                        }, 200)
                        
                        

                    //this.player_cords = this.predecirMovimientoForward(this.player_cords, 10)

                }
                    this.emit_start.emit('user_start');
                    this.#send_msg_worker('next', this.#number_bot, null)
                    
                break;
            case 0xd4:

                

                break;
            case 0xd8:
                console.log('bot can shot: ')
                this.can_shot = true

            //this.send_signal_die()

            case 0xfb:

                return []
                break;
            case 0x0d:
                //console.log('player change gun ', bot, this.#number_bot)
                
                break;
            case 0x0c:
                //this.follow_cam()
                //console.log("move any: ", msg)
                //this.follow_cam()
                if (msg.readUInt8(6) === 0x03 && this.#number_bot === 0) {
                    //this.player_cords = this.predecirMovimientoForward(this.player_cords, 10)

                }

                break;
            case 0x0a:
                //console.log('camera any: ', msg)

                //this.user_camera(msg)
                break;
            case 0xfc:
                console.log(`${this.user_bot} ha sido impactado por: other user. 2222`)
                console.log(`${this.user_bot} vida restante2222: `, msg.readUInt8(10), bot)
                if (this.#number_bot === msg.readUint8(4)) {

                    const have_life = msg.readUInt8(10)
                    console.log(`${this.user_bot} ha sido impactado por: other user. `)
                    console.log(`${this.user_bot} vida restante: `, msg.readUInt8(10))
                    if (msg.readUInt8(10) === 0) {
                        console.log(`ha muerto: ${this.user_bot}`)
                        this.can_move = false
                        
                        if (this.bot_action_interval) {
                            clearInterval(this.bot_action_interval)
                            this.bot_action_interval = null
                            
                        }
                        this.send_signal_die()
                        this.can_shot = false


                    }
                    if (msg.readUInt8(10) === 255) {
                        console.log(`ha muerto: ${this.user_bot}`)
                        
                        if (this.bot_action_interval) {
                            clearInterval(this.bot_action_interval)
                            this.bot_action_interval = null
                        }
                        this.send_signal_die()
                        this.can_shot = false
                    }

                }

                break;
            case 0xfe:
                const pj_response = Buffer.from('3f020504e03f74a0'.replace('e03f74a0', this.buffer_session.toString('hex')), 'hex')
                pj_response.writeUInt8(this.#number_bot, 4)


                this.arr_actions.push(pj_response)

                
                break;
            case 0xff:
                console.log(`cambio de id?: ${this.#number_bot} : ${msg.readUInt8(4)}`)
                this.#number_bot = msg.readUInt8(4)
                this.user_bot = Buffer.from(('Bot' + `${this.#number_bot }`.padStart(2, "0")), 'ascii')

                

                //this.send_waypoints()
                //this.ia_bot_start()
                break;
            case 0xed:
                if (this.bot_master) {

                    console.log('any player death')
                }

                break;
            case 0x0e:
                //throw new Error('spwan palyer!!!')

                const arr_respawns = this.extractAllPlayers(msg)
                //console.log('spawns: ', arr_respawns.length, arr_respawns.map(i=>i.bot))
                const that_bot = arr_respawns.filter(row => row.bot === this.#number_bot)[0]
                const player_respawn = arr_respawns.filter(row => row.bot === 0)[0]

                if (bot === 0) {

                    console.log('player spawn ', bot)
                    this.player_cords = this.extractRespawnXZR(msg, bot)
                    //this.start_move()
                }
                
                if (this.#number_bot === bot) {
                    
                    this.can_shot = true
                    console.log('bot spawn ', this.#number_bot)
                    this.in_game = true
                    
                    const bot_cords = this.extractRespawnXZR(msg, bot)
                    //const pj_response = Buffer.from('3f00800d010d1000010000e55e1d465c55b244ba37d045f6a30000', 'hex')
                    //pj_response.writeInt8(this.#number_bot, 4)
                    this.bot_cords = bot_cords
                    this.bot_helper.send_event(JSON.stringify({ type_action: 'spawn', value_action: bot_cords, id_bot: this.#number_bot }))
                    try {

                        const ping_ce = Buffer.from('80060100ac240000ee8b4503', 'hex')
                        ping_ce.writeUInt8((msg.readUInt8(2)) & 0xff, 5)
                        ping_ce.writeUInt8(msg.readUInt8(3), 4)
                        //this.send_waypoints()
                        this.can_move = true
                        this.ia_bot_start()
                        
                    
                        this.start = true
                        //responses.push(ping_ce)
                    } catch (err) {
                        console.error(new Error(err.stack))
                        throw new Error(err)
                    }

                    //this.arr_actions.push(pj_response)

                    //this.spawn(that_bot.cords)
                    //const all_players = this.extractAllPlayers(msg)

                    //this.cb_spawn(all_players)
                    //responses.push({is_external: true, arr_respawns: arr_respawns})
                    //ok2.writeUint8(msg.readUint8(2), 3)
                }

                break;
            case 0x26:
                // console.log('shot air', msg)    
                break;
            case 0x00:

                break;
            case 0x01:
                const bot_cords = this.extractRespawnXZR(msg, bot)

                if (bot == 0) {
                    //console.log('sync player bot number: ', msg)
                    this.player_cords = bot_cords
                    //this.send_waypoints()
                    //this.follow_cam()


                }

                //console.log('sync package: ', this.#number_bot, bot, this.bot_master, msg)

                if (this.bot_master) {

                    this.bot_helper.send_event(JSON.stringify({ type_action: 'sync', value_action: { bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r }, id_bot: bot }))
                }

                if (bot == this.#number_bot) {

                    this.in_game = true
                    //this.bot_cords = this.extractRespawnXZR(msg, bot)
                    this.bot_helper.send_event(JSON.stringify({ type_action: 'sync', value_action: { bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r }, id_bot: bot }))

                    //this.follow_cam()

                    //this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: {bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r}, id_bot: bot}))




                    //this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: {bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r}, id_bot: bot}))

                    //this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: this.extractRespawnXZR(msg, bot), id_bot: this.#number_bot}))

                }


                break;
            case 0xce:
                //

                const ping_ce = Buffer.from('80060100ac240000ee8b4503', 'hex')
                ping_ce.writeUInt8(msg.readUInt8(2), 5)
                ping_ce.writeUInt8(msg.readUInt8(3), 4)
                this.arr_actions.push(this.try_other_spawn())
                /*setTimeout(()=>{
                    
                        if(!this.bot_action_interval){
                            this.ia_bot_start()
                        }
                }, 200)*/

                break;
            default:

                break;
        }

        return responses
    }

    lastTargetKey = null;
    lastGroup = null;
    lastPlayerPos = null
    send_waypoints() {
        const playerPos = this.player_cords;
        if (!playerPos) return;

        const botPos = this.bot_cords;
        if (!botPos) return;

        const pp = this.get_vector(playerPos.x, playerPos.y);
        const bp = this.get_vector(botPos.x, botPos.y);

        const playerGroup = this.pathfinder.getGroup('level', pp, true);
        if (playerGroup == null) return;
        if(this.lastPlayerPos){
            const dx = playerPos.x - this.lastPlayerPos.x;
            const dz = playerPos.z - this.lastPlayerPos.z;
            const distSq = dx * dx + dz * dz;

            // Si no se movió lo suficiente, no recalcular
            if (distSq <= 200) return;
        }

        this.lastPlayerPos = { x: playerPos.x, z: playerPos.z };

        const newPath = this.pathfinder.findPath(bp, pp, 'level', playerGroup);
        if (!newPath || newPath.length === 0) return;

        this.waypoints = { path: newPath, group: playerGroup };

        /*this.bot_helper.send_event(JSON.stringify({
            type_action: 'waypoints',
            value_action: { path: newPath, group: playerGroup },
            id_bot: this.#number_bot
        }));*/
    }
    get_vector(x, z) {
        const bx = ((x / (1000 * 9.98)) * 15) + -3.90;
        const bz = -(((z / (1000 * 8.47508)) * 15) + -1.60);
        const pp = new THREE.Vector3(bx, 0.5, bz);
        return pp
    }
    last_time_execute = 0
    ia_bot_start() {
        this.bot_action_interval = setInterval(() => {
            //console.log('interval start!')
            const now = new Date().getTime()
            if(now - this.last_time_execute > 250){
                this.send_sync()
                this.last_time_execute = now
            }
            
            const playerPos = this.player_cords;
            if (!playerPos) return;
            //console.log('interval start!', 2)
            const pp = this.get_vector(playerPos.x, playerPos.y)

            //console.log('interval start!', 3)
            if (!this.bot_cords) return;
            //console.log('interval start!', 4)
            const botPos = this.get_vector(this.bot_cords.x, this.bot_cords.y)
     

            const dxp = playerPos.x - botPos.x;
            const dzp = playerPos.y - botPos.z;
            const distToPlayer = dxp * dxp + dzp * dzp;
            if ((!this.waypoints || this.waypoints.path.length === 0)){
                const playerPos = this.player_cords;
                if (!playerPos) return;
                const pp = this.get_vector(playerPos.x, playerPos.y)



                if (!this.bot_cords) return;

                const botPos = this.get_vector(this.bot_cords.x, this.bot_cords.y)

                const waypointPos = pp//this.waypoints.path[0];

                const dx = waypointPos.x - botPos.x;
                const dz = waypointPos.z - botPos.z;
                const distSq = dx * dx + dz * dz;
                if(distSq < 0.02){
                    this.shot()
                }
                // ¿Llegamos al waypoint?
                /*if (distSq <= 0.09) {
                    this.waypoints.path.shift();
                    return;
                }*/

                const target = this.normalizeAngle(
                    this.angleToTargetFront(botPos.x, botPos.z, waypointPos.x, waypointPos.z)
                    + Math.PI / 2   // ← corrección de 90°
                );
                const r = -(this.bot_cords.r / 256) * Math.PI * 2
                const current = this.normalizeAngle(-r);

                let diff = current - target;
                if (diff > Math.PI) diff -= 2 * Math.PI;
                if (diff < -Math.PI) diff += 2 * Math.PI;
                //console.log('diff: ', diff, ' --- botR: ', this.bot_cords.r, ' --- playerR: ', this.player_cords.r)
                if(this.can_move){

                    if (diff > 0.05) {
                        if(this.bot_forware_start){
                            this.forward_move_stop()
                        }
                        
                        this.camera_left()

                    } else if (diff < -0.05) {
                        if(this.bot_forware_start){
                            this.forward_move_stop()
                        }
                        this.camera_right()

                    } else {

                        this.forward_move()
                    }
                }
            }else if((this.waypoints && this.waypoints.path.length > 0) && distToPlayer > 400){
                
                const waypointPos = this.waypoints.path[0];

                const dx = waypointPos.x - botPos.x;
                const dz = waypointPos.z - botPos.z;
                console.log('interval start!', 5)       
                // ¿Llegamos al waypoint?
                const distSq = dx * dx + dz * dz;
                if (distSq <= 0.09) {
                    this.waypoints.path.shift();
                    return;
                }

                const target = this.normalizeAngle(this.angleToTargetFront(botPos.x, botPos.z, waypointPos.x, waypointPos.z) + Math.PI);
                const r = -(this.bot_cords.r / 256) * Math.PI * 2
                const current = this.normalizeAngle(-r);

                let diff = current - target;
                if (diff > Math.PI) diff -= 2 * Math.PI;
                if (diff < -Math.PI) diff += 2 * Math.PI;
                if(this.can_move){
                    if (diff > 0.05) {
                        if(this.bot_forware_start){
                            this.forward_move_stop()
                        }
                        this.camera_left()

                    } else if (diff < -0.05) {
                        if(this.bot_forware_start){
                            this.forward_move_stop()
                        }
                        this.camera_right()

                    } else {

                        this.forward_move()
                    }
                }
            };
            

        }, 88)
    }
    normalizeAngle(a) {
        return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }

    angleToTargetFront(botX, botZ, targetX, targetZ) {
        return Math.atan2(targetZ - botZ, targetX - botX);
    }
    
    generarPaqueteBot(botData) {
        // Calcular movimiento hacia adelante
            if(!this.bot_forware_start){
                const speed = 45.1;
                const radian = (botData.r / 256) * Math.PI * 2;  // O SIN EL NEGATIVO, LO QUE FUNCIONE

                const newX = botData.x + Math.sin(radian) * speed;
                const newZ = botData.z ;
                const newY = botData.y + Math.cos(radian) * speed;


                // 2. BUFFER DE 26 BYTES
                const buffStart = Buffer.from('3f00fb0d000c03', 'hex')

                this.bot_cords.x = newX;
                this.bot_cords.y = newY;
                this.bot_cords.z = newZ;

                // 3. ENVIAR JSON CON LAS COORDENADAS NUEVAS
                /*this.bot_helper.send_event(JSON.stringify({
                    type_action: 'sync',
                    value_action: {
                        bot: this.#number_bot,
                        x: newX,  // ✅ X NUEVA
                        y: newY,  // ✅ Y NUEVA
                        z: newZ,  // ✅ Z NUEVA
                        r: newR   // ✅ R NUEVA
                    },
                    id_bot: this.#number_bot
                }));*/
                buffStart.writeUInt8(this.#number_bot, 4)

                this.bot_forware_start = true
                //this.arr_actions.push(buffStart)
                
                setTimeout(()=>{
                    this.forward_move_stop()
                    
                },20)
            }
        return [];
    }
    generate_pack_camera_right(botData) {
        let view = 0        // Calcular movimiento hacia adelante

        if (this.bot_cords.r + 2 > 255) {
            this.bot_cords.r = (this.bot_cords.r + 2) - 255
        } else {
            this.bot_cords.r = this.bot_cords.r + 2
        }


        // 2. BUFFER DE 26 BYTES


        // 3. ENVIAR JSON CON LAS COORDENADAS NUEVAS
        this.bot_helper.send_event(JSON.stringify({
            type_action: 'sync',
            value_action: {
                bot: this.#number_bot,
                x: botData.x,  // ✅ X NUEVA
                y: botData.y,  // ✅ Y NUEVA
                z: botData.z,  // ✅ Z NUEVA
                r: this.bot_cords.r   // ✅ R NUEVA
            },
            id_bot: this.#number_bot
        }));
        const row = Buffer.from('3f00720a000abf4cd6ab00f8', 'hex')
        row.writeUInt8(this.#number_bot, 4)
        //row.writeUint16LE( Math.floor(Math.random() * 180) , 8)
        row.writeUint8(this.bot_cords.r, 7)
        //this.arr_actions.push(buf)



        return row;
    }
    generate_pack_camera_left(botData) {
        let view = 0        // Calcular movimiento hacia adelante

        if (this.bot_cords.r - 2 < 0) {
            this.bot_cords.r = (this.bot_cords.r - 2) + 255
        } else {
            this.bot_cords.r = this.bot_cords.r - 2
        }


        // 3. ENVIAR JSON CON LAS COORDENADAS NUEVAS
        this.bot_helper.send_event(JSON.stringify({
            type_action: 'sync',
            value_action: {
                bot: this.#number_bot,
                x: botData.x,  // ✅ X NUEVA
                y: botData.y,  // ✅ Y NUEVA
                z: botData.z,  // ✅ Z NUEVA
                r: this.bot_cords.r   // ✅ R NUEVA
            },
            id_bot: this.#number_bot
        }));
        const row = Buffer.from('3f00720a000abf4cd6ab00f8', 'hex')
        row.writeUInt8(this.#number_bot, 4)
        //row.writeUint16LE( Math.floor(Math.random() * 180) , 8)
        row.writeUint8(this.bot_cords.r, 7)
        //this.arr_actions.push(buf)
        return row;
    }
    send_signal_die() {
        console.log('send signal die: ')
        const header = Buffer.from('3F00831001FBFF', 'hex')
        const text = Buffer.from(`Hola soy el bot ${this.#number_bot}: he muerto`, 'ascii')
        const end_buf = Buffer.from('001F71DA0C01000000020000004022250CA436061000000000', 'hex')
        const chat = Buffer.concat([header, text, end_buf])

        chat.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(chat)
        this.bot_helper.send_event(JSON.stringify({ type_action: 'die', id_bot: this.#number_bot }))
        // 3f00bd30000c15000d1000017f554004254690571541062da5c5bbb2d5d5
        if (this.bot_cords) {
            this.send_signal_drop_gun()
        }
        const pj_setup = Buffer.from('3f005f0c010e000000000000000000000363011070b21900020b0610'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        pj_setup.writeUInt8(0x02, 25) //modelo byte 0x00 torrente 0x0b yonki
        //pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo


        pj_setup.writeFloatLE(this.bot_cords.x, 8);
        pj_setup.writeFloatLE(this.bot_cords.z, 8 + 4);
        pj_setup.writeFloatLE(this.bot_cords.y, 8 + 8);
        pj_setup.writeUInt8(this.bot_cords.r, 8 + 13);



        this.arr_actions.push(pj_setup)

    }
    send_signal_drop_gun() {
        //3f001874cefa05101c000000
        const drop_gun_to_flor = Buffer.from(`3f00f23fce050532dbac9745000000006ef7f9c4`, 'hex')
        drop_gun_to_flor.writeUInt8(this.#number_bot, 4)
        const baseOffset = 8
        drop_gun_to_flor.writeFloatLE(this.bot_cords.x, baseOffset);
        drop_gun_to_flor.writeFloatLE(this.bot_cords.z, baseOffset + 4);
        drop_gun_to_flor.writeFloatLE(this.bot_cords.y, baseOffset + 8);
        this.arr_actions.push(drop_gun_to_flor)
        return
    }
    get_action(msg) {

        const ping = Buffer.from("3f020c0c" + this.buffer_session, 'hex')
        let result = []

        if (this.arr_actions.length > 0) {
            console.log(`${this.#number_bot}_actions: `, this.arr_actions.length)
            result.push(this.arr_actions.shift())
        } else {
            result.push(ping)
        }
        return result
    }
    try_other_spawn() {
        const pj_setup = Buffer.from('3f005f0c010e000000000000000000000363011070b21900020b0610'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        pj_setup.writeUInt8(0x02, 25) //modelo byte 0x00 torrente 0x0b yonki
        //pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo

        //pj_setup.writeUInt8(0x02, pj_setup.length- 10) //numero de jugador 0x01 jugador 1 0x02 jugador 2
        return pj_setup
    }
    try_die() {
        const pj_setup = Buffer.from('3f00454c100510786281e7c5209aeb40df8477c5'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        //pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00


        //pj_setup.writeUInt8(0x02, pj_setup.length- 10) //numero de jugador 0x01 jugador 1 0x02 jugador 2
        return pj_setup

    }
    follow_cam() {
        //console.log(this.bot_cords, this.player_cords)
        if (this.bot_cords && this.player_cords) {
            const view = this.angleToTarget(this.bot_cords.x, this.bot_cords.y, this.player_cords.x, this.player_cords.y)
            //console.log('bot view to: ', view)
            const before_view = this.bot_cords.r
            this.bot_cords.r = view
            const row = Buffer.from('3f002e1d000a77b3d60a', 'hex')
            row.writeUInt8(this.#number_bot, 4)
            //row.writeUint16LE( Math.floor(Math.random() * 180) , 8)
            row.writeUint8(view, 7)
            this.arr_actions.push(row)




        }

    }
    angleToTarget(botX, botY, targetX, targetY) {
        const dx = botX - targetX
        const dy = targetY - botY

        let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
        if (angleDeg < 0) angleDeg += 360
        angleDeg = (angleDeg + 270) % 360;
        const packed = Math.floor(angleDeg / 360 * 256)
        return packed;
    }
    extractAllPlayers(buffer) {
        const arr = this.splitBuffer(buffer, Buffer.from([0x0e, 0x00, 0x00]))
        const first_ele = arr.shift();
        //console.log('number players respawn', arr.length)
        if (arr.length === 1) {
            return [this.extractRespawnXZR(arr[0], first_ele.readUInt8(first_ele.length - 1), 0)]
        }
        const result = []
        let id_bot = null
        for (let idx_entity in arr) {

            if (idx_entity == 0) {
                id_bot = first_ele.readUInt8(first_ele.length - 1)
            }
            let row = arr[idx_entity]
            result.push({ bot: id_bot, cords: this.extractRespawnXZR(row, id_bot, 0) })
            id_bot = row.readUInt8(row.length - 1)
        }
        return result
    }
    spawn(cords) {
        console.log('bot spawn: ', this.#number_bot)
        //this.bot_cords = cords
        //const pj_response = Buffer.from('3f00800d000d1000010000e55e1d465c55b244ba37d045f6a30000'.replace('261370c5', this.buffer_session.toString('hex')), 'hex')
        //pj_response.writeUInt8(this.bot_number+1, 4)

        //pj_response.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        //this.arr_actions.push(pj_response)
        //this.bot_helper.send_event(JSON.stringify({type_action: 'spawn', value_action: cords, id_bot: this.#number_bot}))
    }
    extractRespawnXZR(buffer, bot, baseOffset = 8) {

        const x = buffer.readFloatLE(baseOffset);
        const z = buffer.readFloatLE(baseOffset + 4);
        const y = buffer.readFloatLE(baseOffset + 8);
        const r = buffer.readUInt8(baseOffset + 13);

        return { x, y, z, r, bot };

    }

    splitBuffer(buffer, delimiter) {
        const parts = [];
        let start = 0;
        let index;

        while ((index = buffer.indexOf(delimiter, start)) !== -1) {
            parts.push(buffer.slice(start, index));
            start = index + delimiter.length;
        }

        if (start < buffer.length) {
            parts.push(buffer.slice(start));
        }

        return parts;
    }
    process_msg(arr, msg, count_prev, next_prev) {
        const results = []
        for (let idx = 0; idx < arr.length; idx++) {
            const row = arr[idx]
            if (!row.is_external) {
            
                row.writeUint8( (next_prev + idx) & 0xFF, 2)

                row.writeUint8(count_prev , 3)




            }
            results.push(row)
        }
        return results
    }
    extract_data(buffer) {
        let offsetByte = buffer.readUInt8(4);
        let nameStartIdx = 0;

        // Ajuste de offset si hay separadores especiales
        if (buffer.readUInt8(offsetByte + 1) !== 0x00 && buffer.readUInt8(offsetByte + 2) === 0x00) {
            offsetByte += 2;
        }
        /** */
        // Busca el inicio del nombre de la sala
        for (let i = offsetByte + 1; i < buffer.length; i++) {
            const byte = buffer.readUInt8(i);
            if (byte > 0x20 && byte < 0x7E && byte !== 0x00) {
                nameStartIdx = i;
                break;
            }
        }

        const currentPlayers = buffer.readUInt8(nameStartIdx - 2);
        const maxPlayers = buffer.readUInt8(nameStartIdx - 1);

        // Detectar nombre de mapa desde "MP_"
        const mapSignature = Buffer.from('4d505f', 'hex');
        const mapOffset = buffer.indexOf(mapSignature);
        let mapName = null;
        let mapNameBuff = null
        if (mapOffset !== -1) {
            const chars = [];
            for (let i = mapOffset; i < buffer.length; i++) {
                const byte = buffer[i];
                if (byte === 0x00 || byte < 0x20 || byte > 0x7E) break;
                chars.push(String.fromCharCode(byte));
            }
            const nameCandidate = chars.join('');
            if (nameCandidate.startsWith('MP_')) {

                mapName = nameCandidate;
                mapNameBuff = Buffer.from(nameCandidate, 'ascii')
            } else {
                console.warn('⚠️ Nombre de mapa inválido:', nameCandidate);
            }
        } else {
            console.warn('⚠️ No se encontró la firma "MP_" en el buffer');
        }

        ////console.log('Encontrado nombre idx:', nameStartIdx, currentPlayers, maxPlayers, mapName);

        return {
            currentPlayers,
            maxPlayers,
            mapName,
            mapNameBuff
        };
    }
    replace_name_map(buffer, new_name_map, current_player, max_player) {
        // Actualiza nombre de mapa si está disponible
        const copy = Buffer.from(buffer);
        if (new_name_map) {
            const mapSignature = Buffer.from('4d505f', 'hex');
            const mapOffset = copy.indexOf(mapSignature);
            if (mapOffset !== -1) {
                const mapBytes = Buffer.from(new_name_map, 'ascii');
                mapBytes.copy(copy, mapOffset);
                if (mapBytes.length < 20) {
                    copy.fill(0x00, mapOffset + mapBytes.length, mapOffset + 20);

                    if (new_name_map.startsWith('MP_DMT')) copy.writeUInt8(0x03, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_DM')) copy.writeUInt8(0x00, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_B')) copy.writeUInt8(0x01, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_DO')) copy.writeUInt8(0x02, mapOffset - 1);
                }
            }
            copy.writeUInt8(current_player, mapOffset - 2);
            copy.writeUInt8(max_player, mapOffset - 1);
        }

        return copy
    }
    async shot() {

        console.log('shot bot')
        const dificult = 0.3 //'hen' // 0.00 to 1.00 1.23 is god value
        const random = Math.random()

        const random_shot =  dificult > random
        console.log('shot test!', random_shot, random, this.can_shot)
        if(this.can_shot){
            if(random_shot){
                const shot = Buffer.from('3f00d8af01fc120d1403001905','hex')
                shot.writeUInt8(this.#number_bot, 4)
                this.arr_actions.push(shot)
            }else{
                const fail_shot = Buffer.from('3f00790e00262602714ea644f91e2143860ed745','hex')
                
                fail_shot.writeFloatLE(this.player_cords.x, 8);
                fail_shot.writeFloatLE(this.player_cords.y, 8 + 8);
                this.arr_actions.push(fail_shot)
            }
            this.in_shot ++
        }

           
        
    }
    send_sync(){
        const buf = Buffer.from('3f009e7b01017f55b58a1bc5e1ec564493ebe845769ad5d5010ac1927421', 'hex');
        if(this.bot_cords){
            // X (8-11)
            buf.writeFloatLE(this.bot_cords.x, 8);
            buf.writeFloatLE(this.bot_cords.z, 12);
            buf.writeFloatLE(this.bot_cords.y, 16);

            // R (20) - uint8, no float32
            buf.writeUInt8(this.bot_cords.r, 21);
            buf.writeUInt8(this.#number_bot, 4);
            this.arr_actions.push(buf)
        }
        return
    }
    async forward_move() {

        /*const buf_forware = Buffer.from('3f008e10000c03','hex')
        buf_forware.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(buf_forware)

        const buf_sforware = Buffer.from('3f009610000c15','hex')
        buf_sforware.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(buf_sforware)*/

        this.generarPaqueteBot(this.bot_cords)

        //this.arr_actions.push(sync_pack[1])
        //this.bot_cords = 
        return
    }
    async forward_move_stop(){
        const buffStop = Buffer.from('3f00da0b0027', 'hex')
        buffStop.writeUInt8(this.#number_bot, 4)

        this.arr_actions.push(buffStop)
        this.bot_forware_start = false
        return
    }
    camera_right() {

        const sync_pack = this.generate_pack_camera_right(this.bot_cords)
        sync_pack.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(sync_pack)
        return
    }
    camera_left() {
        const sync_pack = this.generate_pack_camera_left(this.bot_cords)
        sync_pack.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(sync_pack)
        return
    }
    disconnect() {
        /*
        client action:  <Buffer 3f 03 dc 0e e1 db 66 1e>
        client action:  <Buffer 3f 01 dd 0e 00 02>
        client action:  <Buffer 3f 08 de 0e>
        */
        const disconnect = Buffer.from('3f001f170102', 'hex')
        const after_disconnect = Buffer.from('3f08f618', 'hex')
        disconnect.writeUint8(this.#number_bot, 4)
        this.arr_actions.push(disconnect)
        this.arr_actions.push(after_disconnect)
        this.can_response = false

        return [
            disconnect,
            after_disconnect
        ]

    }
    connect_bot(number_bot, ip, port){


        const helloClient = Buffer.from("0002F18A011242191FB8BB154E4401763631007932","hex")
        console.log('sended hello client: ', helloClient)
        console.log('port server: ', ip, typeof port)
        this.#server.send(helloClient, this.#port_server, this.#ip_server, (err)=>{
            if(err){
                console.error(new Error(err))
                throw new Error(err.stack)
            }
            
        })
    }
}
module.exports = workerData
console.log( workerData.ip_connect, typeof workerData.port_connect, workerData)
const botService = new BotService(workerData.number_bot, undefined, workerData.bot_master, false, workerData.body_data, workerData.ZONE, workerData.ip_connect, workerData.port_connect)
parentPort.on("message", (msg_worker)=>{
    try{
        const {type, data} = JSON.parse(msg_worker)
        switch(type){
            case 'connect':
                botService.connect_bot(data, workerData.ip_connect, workerData.port_connect)
            break;
            case 'disconnect':
                botService.disconnect()
                break;
            default:
                
                break;
        }
    }catch(err){
        console.error(new Error(err.stack))
        throw new Error(err)
    }
})
botService.start_bot()