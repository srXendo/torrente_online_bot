
const { Console } = require('console');
const EventEmitter = require('events');
const THREE = require('three');
const { Value } = require('three/examples/jsm/inspector/ui/Values.js');
const { parentPort, workerData } = require('worker_threads');
 class BotService {
    #arr_names = ['','Gunner!!!', 'Weewoo', 'SrXendo', 'Bayman_LK', 'Keygen.7z', 'Koin', 'Milu', 'AngelitoF1', 'theblast3r', 'Dynasty', 'PetroleroVT', 'Flopa', 'Patoke', 'P.S', 'BetaRose', 'BuRnN', 'FrOsT', 'Hisoka']
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
    waypoints = {path: []}
    last_bnSeq = null
    can_move = false
    bot_helper = {send_event: (obj_json)=>{
        this.#send_msg_worker("msg_to_frontend", this.#number_bot, obj_json)
    }}
    last_bnRecv = null
    bots_can_talk = true
    difficult = null
    #id_bot = null
    constructor(difficult, bots_can_talk, number_bot, bot_helper, bot_master, body_data, ZONE, ip, port) {
        const dgram = require('dgram')
        this.#server = dgram.createSocket('udp4');
        
        this.bot_master = bot_master
        this.can_response = true


        this.#number_bot = number_bot
        this.#ip_server = ip
        console.log('port server : ', port, ip, ' ---> ', number_bot)
        this.#port_server = port
        this.buffer_session = (this.buffer_session + `${number_bot}`.padStart(2, '0'))
        this.user_bot = Buffer.from(('Bot' + `${number_bot}`.padStart(2, "0")), 'ascii')
        if(typeof this.#arr_names[number_bot] !== 'undefined'){
            this.user_bot = Buffer.from(this.#arr_names[number_bot], 'ascii')
        }
        this.bots_can_talk = bots_can_talk
        this.difficult = difficult;
        this.#id_bot = number_bot
        
    }
    #send_msg_worker(type, number_worker, data){
        try{
            parentPort.postMessage(JSON.stringify({type, number_worker: this.#id_bot , data}))
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
                        console.log(`bot send msg ${this.#number_bot}: `, msg_to_server.toString('hex'))
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
        const timestamp = Date.now() & 0xFFFFFFFF;
        switch (headers) {
            case 0x3f09:
                this.#server.close(()=>{
                    clearInterval(this.bot_action_interval)
                })
            break;
            case 0x3f03:
                    const ok4 = []

                    ok4.push(Buffer.from("3f020404" + this.buffer_session, 'hex'))

                    ok4[0].writeUint8((msg.readUint8(2) + 1) & 0xFF, 3)

                    ok4[0].writeUint8((msg.readUint8(3)), 2)
                    return ok4
                break;
            case 0x3f01:
            case 0x3701:
                /*let action_response = Buffer.from("3f020c0c" + this.buffer_session, 'hex')
                return this.process_msg(action_response, msg, msg.readUInt8(3), msg.readUInt8(2))*/
                const ok3 = Buffer.from('8006010690b00009d043b03', 'hex')

                ok3.writeUint8((msg.readUint8(2)) & 0xFF, 5)

                ok3.writeUint8(msg.readUint8(3), 4)
                  
                

                ok3.writeUInt32LE(timestamp >>> 0, 7);
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
                first_stage2.writeUInt8((msg.readUInt8(2) + 1) & 0xff, 3)


                if (msg.readUInt8(4) !== 0xdf) {
                    //this.dpnid = msg.slice(164, 167)

                    const before_name = Buffer.from("3f0003020000", 'hex')

                    before_name.writeUInt8((msg.readUInt8(3) + 1)  & 0xff, 2)
                    before_name.writeUInt8(msg.readUInt8(2), 3)

                    const name = Buffer.from(this.user_bot.toString('hex').padEnd(this.max_name_byte * 2, "0"), 'hex')
                    const after_name_before_map_name = Buffer.from('0b0200000000000000000000080600000003', 'hex')

                    const map_name = Buffer.from(this.party.mapNameBuff.toString('hex').padEnd(this.max_map_name_byte * 2, "0"), 'hex')//Buffer.from("000000034d505f444d545f5645525449474f0000000000",'hex')
                    const after_map_name = Buffer.from('90b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903', 'hex')
                    return [first_stage2, this.replace_name_map((Buffer.concat([before_name, name, after_name_before_map_name, map_name, after_map_name])), this.party.mapName, this.party.currentPlayers, this.party.maxPlayers)]
                } else {

                    return []//this.disconnect()
                }
                break;
            case 0x3f02:

                //console.log('msg: ping: ', '0x3f02')

                return []
                break;
            case 0x8802:
                //console.log('msg: firstStage: ', "0x8802")
                //console.log('start party!')
                const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000', 'hex')
                const pre1 = Buffer.from("8002010006000100" + this.buffer_session + "e665f602", "hex")
                
                //pre1.writeUInt32LE(Date.now() & 0xFFFFFFFF >>> 0, 12);
                const pre2 = Buffer.from("3f020000" + this.buffer_session + "", 'hex')
                this.last_bnSeq = 0x01
                this.last_bnRecv = 0x00
                return [pre1, pre2, session]
                break;
            case 0x0003:
                this.party = this.extract_data(msg)
                //console.log(this.party)
                this.#number_bot = this.party.currentPlayers
                let packet = Buffer.from("8801000006000100" + this.buffer_session + "c2091002", 'hex')


                packet.writeUInt32LE(timestamp >>> 0, 12);
                return [packet]
                break;
            case 0x3f08:
                const response_end_party = Buffer.from("88010000060001005b378ac5a6af3100", 'hex')
                response_end_party.writeUInt32LE(timestamp >>> 0, 12);
                response_end_party.writeUint8((msg.readUInt8(2)+1) & 0xff , 6)
                response_end_party.writeUint8((msg.readUInt8(3)), 5)
                console.log('end party!')
                return [response_end_party]
                break;
            default:
                console.log("err: msg not recognice: ", msg)
                return false
                break;
        }
    }
    count_retry = 0
    users_actions(msg) {

        const bot = msg.readUInt8(4)
        const action = msg.readUInt8(5) //action player byte
        let responses = []

        //console.log('action, bot: ', action, this.#number_bot)
        switch (action) {
            case 0xf8:

                break;
            case 0xd5: 
                
                this.interval_retry = setInterval(()=>{
                    if(this.count_retry > 4){


                        clearInterval(this.interval_retry)
                        clearInterval(this.bot_action_interval)
                        const response_end_party = Buffer.from("88010000060001005b378ac5a6af3100", 'hex')
                        const timestamp = Date.now() & 0xFFFFFFFF;
                        response_end_party.writeUInt32LE(timestamp >>> 0, 12);
                        response_end_party.writeUint8((msg.readUInt8(2)+this.count_retry) & 0xff , 5)
                        response_end_party.writeUint8((msg.readUInt8(3)), 4)
                        console.log('end party!2')
                        this.#server.send(response_end_party, this.#port_server, this.#ip_server, (err)=>{
                            if(err){
                                console.error(new Error(err))
                                throw new Error(err.stack)
                            }
                            
                        })

                    }else{
                        const response_end_party = Buffer.from("3f008c1202f8", 'hex')
                        response_end_party.writeUint8((msg.readUInt8(2)+this.count_retry) & 0xff , 3)
                        response_end_party.writeUint8((msg.readUInt8(3)), 2)
                        console.log('end party!')
                        this.#server.send(response_end_party, this.#port_server, this.#ip_server, (err)=>{
                            if(err){
                                console.error(new Error(err))
                                throw new Error(err.stack)
                            }
                            
                        })
                        this.count_retry = this.count_retry + 1
                    }
                },45)

            break;
            case 0xd2:

  
                
               
                if (!(~msg.toString('ascii').indexOf(this.user_bot.toString('ascii')))) {



                        
                    if(!this.next_start){
                        this.next_start = true
                        this.emit_start.emit('user_start');
                        this.#send_msg_worker('next', this.#number_bot, null)
                    }                        

                    //this.player_cords = this.predecirMovimientoForward(this.player_cords, 10)

                }

                    
                break;
            case 0xd4:

                

                break;
            case 0xd8:
               // console.log('bot can shot: ')
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
                //console.log(`${this.user_bot} ha sido impactado por: other user. 2222`)
                //console.log(`${this.user_bot} vida restante2222: `, msg.readUInt8(10), bot)
                if (this.#number_bot === msg.readUint8(4)) {

                    const have_life = msg.readUInt8(10)
                    //console.log(`${this.user_bot} ha sido impactado por: other user. `)
                    //console.log(`${this.user_bot} vida restante: `, msg.readUInt8(10))
                    if (msg.readUInt8(10) === 0) {
                        //console.log(`ha muerto: ${this.user_bot}`)
                        this.can_move = false
                        
                        if (this.bot_action_interval) {
                            clearInterval(this.bot_action_interval)
                            this.bot_action_interval = null
                            
                        }
                        this.send_signal_die()
                        this.can_shot = false


                    }
                    if (msg.readUInt8(10) === 255) {
                        //console.log(`ha muerto: ${this.user_bot}`)
                        
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
                //console.log(`cambio de id?: ${this.#number_bot} : ${msg.readUInt8(4)}`)
                if(0xfb !==  msg.readUInt8(4)){
                    /*this.user_bot = Buffer.from(('Bot' + `${this.#number_bot }`.padStart(2, "0")), 'ascii')
                    this.#number_bot = msg.readUInt8(4)*/

                }
                    //

                

                //this.send_waypoints()
                //this.ia_bot_start()
                break;
            case 0xed:
                if (this.bot_master) {

                    //console.log('any player death')
                }

                break;
            case 0xfd:
                
                break;
            case 0x0e:
                //throw new Error('spwan palyer!!!')



                const arr_respawns = this.extractAllPlayers(msg)
                //console.log('spawns: ', arr_respawns.length, arr_respawns.map(i=>i.bot))
                const that_bot = arr_respawns.filter(row => row.bot === this.#number_bot)[0]
                const player_respawn = arr_respawns.filter(row => row.bot === 0)[0]

                if (bot === 0) {

                    //console.log('player spawn ', bot)
                    this.player_cords = this.extractRespawnXZR(msg, bot)
                    //this.start_move()
                }
                
                if (this.#number_bot === bot) {
                    
                    this.can_shot = true
                    //console.log('bot spawn ', this.#number_bot)
                    this.in_game = true

                    const bot_cords = this.extractRespawnXZR(msg, bot)
                    //const pj_response = Buffer.from('3f00800d010d1000010000e55e1d465c55b244ba37d045f6a30000', 'hex')
                    //pj_response.writeInt8(this.#number_bot, 4)
                    this.bot_cords = bot_cords
                    this.bot_helper.send_event(JSON.stringify({ type_action: 'spawn', value_action: bot_cords, id_bot: this.#number_bot }))
                    try {
                        

                        //this.send_waypoints()
                        
                        this.can_move = true
                        this.ia_planing()
                        this.ia_bot_start()
                        
                    
                        this.start = true

                        
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
                //this.send_sync()
                if (bot == 0) {
                    //console.log('sync player bot number: ', msg)
                    this.player_cords = bot_cords
                    
                    //this.follow_cam()
                    //this.send_waypoints()

                }

                //console.log('sync package: ', this.#number_bot, bot, this.bot_master, msg)

                if (this.bot_master) {

                    this.bot_helper.send_event(JSON.stringify({ type_action: 'sync', value_action: { bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r }, id_bot: bot }))
                }

                if (bot == this.#number_bot) {

                    this.in_game = true
                    this.bot_cords = this.extractRespawnXZR(msg, bot)
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
  
                const timestamp = Date.now() & 0xFFFFFFFF;

                ping_ce.writeUInt32LE(timestamp >>> 0, 7);
                ping_ce.writeUInt8(msg.readUInt8(2), 5)
                ping_ce.writeUInt8((msg.readUInt8(3)+1) & 0xff, 4)
                
 
                
                responses.push(ping_ce)
                this.arr_actions.push(this.try_other_spawn())



                break;
            case 0x27:
                break;
            default:
                console.error(new Error('action no recognize: ').stack)
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
        this.#send_msg_worker("calc_waypoints", this.#number_bot, {player_cords:  this.player_cords, bot_cords: this.bot_cords})
    }
    prepare_waypoints(target_position, start_position){
  
        if (!target_position) return;
        
        if (!start_position) return;
        //console.log('prepare_waypoints', target_position, start_position)

        if (!target_position) return;

        if (!start_position) return;
        this.#send_msg_worker("calc_waypoints", this.#number_bot, {player_cords:  target_position, bot_cords: start_position})
        return true
    }
    set_waypoints(waypoints){
        
        //console.log('set_waypoints: ', waypoints)
        if(waypoints && waypoints.path.length > 0){
            
            //console.log('waypoints: ',waypoints)
            this.waypoints = waypoints
            this.#bot_state = this.states.FOLLOW_TARGET
            this.bot_helper.send_event(JSON.stringify({
                type_action: 'waypoints',
                value_action: { path: waypoints.path, group: waypoints.group },
                id_bot: this.#number_bot
            }));
             
        }

    }
    calc_patrol_points(){
        const start_position = this.bot_cords;
        if (!start_position) return;
        this.#send_msg_worker("calc_patrol_points", this.#id_bot, {player_cords:  null, bot_cords: start_position})
    }
    set_patrol_points(patrol_points){
        this.patrol_points = patrol_points
        //console.log('set_patrol_points: ', patrol_points)
        
        this.prepare_waypoints(patrol_points[0], this.bot_cords)
        this.patrol_points.shift()
        
        /*if(patrol_points){
            console.log('patrol_points: ',patrol_points)
            this.bot_helper.send_event(JSON.stringify({
                type_action: 'patrol_points',
                value_action: { path: patrol_points.path, group: patrol_points.group },
                id_bot: this.#number_bot
            }));
        }*/
    }
    get_vector(x, z) {
        const bx = ((x / (1000 * 9.98)) * 15) + -3.90;
        const bz = -(((z / (1000 * 8.47508)) * 15) + -1.60);
        const pp = new THREE.Vector3(bx, 0.5, bz);
        return pp
    }
    last_time_execute = 0
    states = {
        FOLLOW_TARGET: 'FOLLOW_TARGET',
        SHOT_TARGET: 'SHOT_TARGET',
        PATROL_ZONE: 'PATROL_ZONE',
        WAIT_WAYPOINTS: 'WAIT_WAYPOINTS',
        PREPARE_FIND_TARGET: 'PREPARE_FIND_TARGET'
    }
    #_bot_state = null
    #_last_bot_state = null
    #last_bot_state
    set #bot_state(value){
        //console.log('change bot_state: ', value)
        if(this.states.PATROL_ZONE === this.#bot_state  || this.states.PREPARE_FIND_TARGET === this.#bot_state ){
            this.#_last_bot_state = this.#_bot_state
        }
        
        this.#_bot_state = value
    }
    get #bot_state(){
        return this.#_bot_state
    }
    ia_planing(){
        this.#bot_state = this.states.PATROL_ZONE
        this.#last_bot_state = this.states.PATROL_ZONE
    }

    ia_bot_start() {
        
        
        this.bot_action_interval = setInterval(() => {
             //this.camera_left()

            
            let response = undefined
            switch(this.#bot_state){
                case this.states.FOLLOW_TARGET:
                    this.#_last_bot_state = this.states.FOLLOW_TARGET
                    response = this.ia_follow_target()
                    
                    if(!response) return;

                    
                    return true
                    break;
                case this.states.SHOT_TARGET:
                    this.ia_shot_target();
                    break;
                case this.states.PATROL_ZONE:
                    this.ia_patrol_zone();
                    break;
                case this.states.WAIT_WAYPOINTS:
                    break;
                case this.states.PREPARE_FIND_TARGET:
                    this.prepare_waypoints_to_target()    
                break;
            }
        }, 100 )
    }
    ia_patrol_zone(){
        if(!this.waypoints.path || this.waypoints.path.length < 1){
            this.calc_patrol_points()
            this.#bot_state = this.states.WAIT_WAYPOINTS
            this.#last_bot_state = this.states.PATROL_ZONE
                

            
        }
        if(this.patrol_points && this.patrol_points.length > 0){
            //this.#bot_state = this.states.FOLLOW_TARGET
            
            //console.log('llega al punto: ')
            //this.patrol_points.shift()
            
        
        }

    }
    prepare_waypoints_to_target(){
        if(this.prepare_waypoints(this.player_cords, this.bot_cords)){
            this.#bot_state = this.states.WAIT_WAYPOINTS
            
        }
        
    }
    move_to(next_pos){
        const now = new Date().getTime()
        if(now - this.last_time_execute > 200){
            //this.send_sync()
            this.last_time_execute = now
        }
        
        const patrolPos = next_pos;
        if (!patrolPos) return;
        //console.log('interval start!', 2)
        const pp = this.get_vector(next_pos.x, next_pos.z)

        if (!this.bot_cords) return;

        const botPos = this.get_vector(this.bot_cords.x, this.bot_cords.y)


        const dx = pp.x - botPos.x;
        const dz = pp.z - botPos.z;
        const distSq = dx * dx + dz * dz;
        if(distSq < 0.02){
            return true
        }


        const target = this.normalizeAngle(
            this.angleToTargetFront(botPos.x, botPos.z, pp.x, pp.z)
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
                
                this.camera_left(diff)

            } else if (diff < -0.05) {
                if(this.bot_forware_start){
                    this.forward_move_stop()
                }
                this.camera_right(diff)

            } else {


                this.forward_move()

            

                setTimeout(()=>{
                        //this.forward_move_stop()
                    this.send_sync()
                }, 65)
            }
        }

        return false
    }
    ia_shot_target(){
               
        const playerPos = this.player_cords;
        if (!playerPos) return;
        //console.log('interval start!', 2)
        const pp = this.get_vector(playerPos.x, playerPos.y)

        if (!this.bot_cords) return;

        const botPos = this.get_vector(this.bot_cords.x, this.bot_cords.y)

        const dx = pp.x - botPos.x;
        const dz = pp.z - botPos.z;
        const distSq = dx * dx + dz * dz;
        if(distSq < 0.02){
            
            return this.shot()
        }
        return
    }
    ia_follow_target(){
        const now = new Date().getTime()
        //console.log('ia_follow_target')
        if(now - this.last_time_execute > 200){
            //this.send_sync()
            this.last_time_execute = now
        }
        
        const playerPos = this.player_cords;
        if (!playerPos) return;
        //console.log('ia_follow_target 2')
        //console.log('interval start!', 2)
        const pp = this.get_vector(playerPos.x, playerPos.y)

        if (!this.bot_cords) return;
        //console.log('ia_follow_target 3')
        const botPos = this.get_vector(this.bot_cords.x, this.bot_cords.y)

        const dx = pp.x - botPos.x;
        const dz = pp.z - botPos.z;
        const distSq = dx * dx + dz * dz;
        if(distSq < 0.02){
            this.forward_move_stop()
            this.#bot_state = this.states.SHOT_TARGET
            return false
        }
        if(distSq < 125 && this.#_last_bot_state === this.states.FOLLOW_TARGET){
            if((this.waypoints && this.waypoints.path.length < 1)){
                this.forward_move_stop()
                this.prepare_waypoints_to_target()
                return false

            }
        }
        if(this.waypoints && this.waypoints.path.length < 1){
            this.forward_move_stop()
            this.#_bot_state = this.states.PATROL_ZONE
            return false
        }
        //console.log('ia_follow_target 4')

        //console.log('ia_follow_target 5', this.waypoints)

        const waypointPos = this.waypoints.path[0];

        const dxw = waypointPos.x - botPos.x;
        const dzw = waypointPos.z - botPos.z;
        const distSqw = dxw * dxw + dzw * dzw;
        if(distSqw < 0.02){
            this.forward_move_stop()                 
            this.waypoints.path.shift();
            if(this.waypoints.path.length < 1){
                return true
            }
            return false;


        }
        //console.log('ia_follow_target 9')
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
        //console.log('ia_follow_target 10')
        if(this.can_move){
            //console.log('ia_follow_target 11: ', diff)
            if (diff > 0.05) {
                if(this.bot_forware_start){
                    this.forward_move_stop()
                }
                
                this.camera_left(diff)

            } else if (diff < -0.05) {
                if(this.bot_forware_start){
                    this.forward_move_stop()
                }
                this.camera_right(diff)

            } else {

                
                    this.forward_move()
                    setTimeout(()=>{
                        //this.forward_move_stop()
                        this.send_sync()
                    }, 65)
        
                

            }
        }

        return false
    }
    normalizeAngle(a) {
        return ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    }

    angleToTargetFront(botX, botZ, targetX, targetZ) {
        return Math.atan2(targetZ - botZ, targetX - botX);
    }
    
    generarPaqueteBot(botData) {
        // Calcular movimiento hacia adelante
                    
        const speedX = 150 - 3.9;
        const speedZ = 150 - 1.6;

        const radian = (botData.r / 256) * Math.PI * 2;

        const newX = botData.x + Math.sin(radian) * speedX;
        const newZ = botData.z ;
        const newY = botData.y + Math.cos(radian) * speedZ;


                // 2. BUFFER DE 26 BYTES
                const buffStart = Buffer.from('3f00410f000c03', 'hex')

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
                        r: this.bot_cords.r   // ✅ R NUEVA
                    },
                    id_bot: this.#number_bot
                }));*/
                buffStart.writeUInt8(this.#number_bot, 4)

                
                if(!this.bot_forware_start){
                    this.arr_actions.push(buffStart)
                }
                this.bot_forware_start = true
                //this.arr_actions.push(buf)

            
        return [];
    }
    generate_pack_camera_right(botData, diff) {
        let view = 0;

        const turn = Math.max(
            1,
            Math.round((Math.abs(diff) / (2 * Math.PI)) * 256)
        );

        if (this.bot_cords.r + turn > 255) {
            this.bot_cords.r = this.bot_cords.r + turn - 255;
        } else {
            this.bot_cords.r = this.bot_cords.r + turn;
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
    generate_pack_camera_left(botData, diff) {
        let view = 0;

        const turn = Math.max(
            1,
            Math.round((Math.abs(diff) / (2 * Math.PI)) * 256)
        );

        if (this.bot_cords.r - turn < 0) {
            this.bot_cords.r = this.bot_cords.r - turn + 256;
        } else {
            this.bot_cords.r = this.bot_cords.r - turn;
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
        //console.log('send signal die: ')
        const header = Buffer.from('3F00831001FBFF', 'hex')
        const text = Buffer.from(`Hola soy el bot ${this.#number_bot}: he muerto`, 'ascii')
        const end_buf = Buffer.from('001F71DA0C01000000020000004022250CA436061000000000', 'hex')
        const chat = Buffer.concat([header, text, end_buf])

        chat.writeUInt8(this.#number_bot, 4)
        if(this.bots_can_talk){
            this.arr_actions.push(chat)
        }
        this.bot_helper.send_event(JSON.stringify({ type_action: 'die', id_bot: this.#number_bot }))
        // 3f00bd30000c15000d1000017f554004254690571541062da5c5bbb2d5d5
        if (this.bot_cords) {
            this.send_signal_drop_gun()
        }
        const pj_setup = Buffer.from('3f005f0c010e000000000000000000000363011070b21900020b0610'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        pj_setup.writeUInt8(0x00+this.#number_bot + 2, 25) //modelo byte 0x00 torrente 0x0b yonki
        //pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo
        this.bot_cords = this.extractRespawnXZR(pj_setup)
        if(this.bot_cords){
            pj_setup.writeFloatLE(this.bot_cords.x, 8);
            pj_setup.writeFloatLE(this.bot_cords.z, 8 + 4);
            pj_setup.writeFloatLE(this.bot_cords.y, 8 + 8);
            pj_setup.writeUInt8(this.bot_cords.r, 8 + 13);

        }




        this.arr_actions.push(pj_setup)

    }
    send_signal_drop_gun() {
        //3f001510000510784f8a2546905715416652a6c5
        const dificult = this.difficult //'hen' // 0.00 to 1.00 1.23 is god value
        const random = Math.random()
        const random2 = Math.random()

        const random_drop =  dificult < random
        if(random_drop){
            const baseOffset = 8
            if(random > random2){
                let drop_gun_to_flor_2 = Buffer.from(`3f001510000510784f8a2546905715416652a6c5`, 'hex')
                drop_gun_to_flor_2.writeUInt8(this.#number_bot, 4)
                drop_gun_to_flor_2.writeFloatLE(this.bot_cords.x, baseOffset);
                drop_gun_to_flor_2.writeFloatLE(this.bot_cords.z, baseOffset + 4);
                drop_gun_to_flor_2.writeFloatLE(this.bot_cords.y, baseOffset + 8);
                this.arr_actions.push(drop_gun_to_flor_2)
            }
            let drop_gun_to_flor = Buffer.from(`3f00f23fce050532dbac9745000000006ef7f9c4`, 'hex')

            drop_gun_to_flor.writeUInt8(this.#number_bot, 4)
            
            drop_gun_to_flor.writeFloatLE(this.bot_cords.x, baseOffset);
            drop_gun_to_flor.writeFloatLE(this.bot_cords.z, baseOffset + 4);
            drop_gun_to_flor.writeFloatLE(this.bot_cords.y, baseOffset + 8);
            this.arr_actions.push(drop_gun_to_flor)
        }


        return
    }
    get_action(msg) {

        const ping = Buffer.from("3f020000" + this.buffer_session, 'hex')
        let result = []

        if (this.arr_actions.length > 0) {
            result.push(this.arr_actions.shift())
        } else {
            result.push(ping)
        }
        //

        return result.map((row, index)=>{
            if(row[0] === 0x80){
                row.writeUInt8((msg.readUInt8(4))  & 0xff, 5)
                row.writeUInt8((msg.readUInt8(5)), 4)
            }else if(row[0] === 0x3f){
                row.writeUInt8((msg.readUInt8(4)) & 0xff, 3)
                row.writeUInt8((msg.readUInt8(5)), 2)
            }
            return row
        })
    }
    try_other_spawn() {
        const pj_setup = Buffer.from('3f005f0c010e000000000000000000000363011070b21900020b0610'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        pj_setup.writeUInt8(0x00+this.#number_bot + 1, 25) //modelo byte 0x00 torrente 0x0b yonki
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
        //console.log('bot spawn: ', this.#number_bot)
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
                console.log(row)
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

        //console.log('shot bot')
        const dificult = this.difficult //'hen' // 0.00 to 1.00 1.23 is god value
        const random = Math.random()
        const now = new Date().getTime()

        const random_shot =  dificult > random
        //console.log('shot test!', random_shot, random, this.can_shot)
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
            this.can_shot = false
            this.last_time_shot = now
        }else if(!this.can_shot && now - this.last_time_shot > 120){
            this.can_shot = true
        }

           
        
    }
    send_sync(){
        const buf = Buffer.from('3f009e7b01017f55b58a1bc5e1ec564493ebe845769a00d5010ac1927421', 'hex');
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
        const buffStop = Buffer.from('3f00410f000c15', 'hex')
        buffStop.writeUInt8(this.#number_bot, 4)

        this.arr_actions.push(buffStop)
        this.bot_forware_start = false
        return
    }
    camera_right(diff) {

        const sync_pack = this.generate_pack_camera_right(this.bot_cords, diff)
        sync_pack.writeUInt8(this.#number_bot, 4)
        this.arr_actions.push(sync_pack)
        return
    }
    camera_left(diff) {
        const sync_pack = this.generate_pack_camera_left(this.bot_cords, diff)
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
        if (this.bot_action_interval) {
            clearInterval(this.bot_action_interval)
            this.bot_action_interval = null
            
        }
        const disconnect = Buffer.from('3f001f170102', 'hex')
        const after_disconnect = Buffer.from('3f08f618', 'hex')
        disconnect.writeUint8(this.#number_bot, 4)
        this.arr_actions.push(disconnect)
        this.arr_actions.push(after_disconnect)

        //this.arr_actions.push(Buffer.from(`80040100755a000045e88100`, 'hex'))
        
        return [
            disconnect,
            after_disconnect
        ]
        
    }
    connect_bot(number_bot, ip, port){


        const helloClient = Buffer.from("0002F18A011242191FB8BB154E4401763631007932","hex")
        //console.log('sended hello client: ', helloClient)

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
const botService = new BotService(workerData.difficult, workerData.bots_can_talk, workerData.number_bot, undefined, workerData.bot_master, workerData.body_data, workerData.ZONE, workerData.ip_connect, workerData.port_connect)
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
            case 'set_waypoints': 
                //console.log("set_waypoints", data)
                botService.set_waypoints(data.waypoints)
                break;
            case 'set_patrol_points':
                
                botService.set_patrol_points(data.patrol_points)
            break; 
            default:
                
                break;
        }
    }catch(err){
        console.error(new Error(err.stack))
        throw new Error(err.stack)
    }
})
botService.start_bot()