
module.exports = class BotService{
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
    bot_helper = null
    last_byte_send= null
    last_byte_send_next = null
    bot_master = null
    constructor(number_bot, bot_helper, bot_master){
        this.bot_master = bot_master

        setTimeout(()=>{
            if(!this.in_game){
                this.in_game = true
                this.arr_actions.push(this.try_other_spawn())
            }
        },1000 * number_bot)
        this.bot_helper = bot_helper
        this.#number_bot = number_bot
        this.buffer_session = (this.buffer_session + `${number_bot}`.padStart(2, '0'))
        this.user_bot = Buffer.from(('Bot'+`${number_bot}`.padStart(2, "0")), 'ascii') 
    }
    handler_message(msg, rconf){
        const headers = msg.readUInt16BE(0)
        switch(headers){
            case 0x3701:

            case 0x3700:
                //console.log('msg: No uknow: ', '0x3700')
                
                /*const ok = Buffer.from("3f020404"+this.buffer_session, 'hex')
                ok.writeUint8(msg.readUint8(3), 2)
                ok.writeUint8(msg.readUint8(2), 3)*/
                return []

                break;
            case 0x3f00:

                const user_responses = this.users_actions(msg)
                const ok2 = Buffer.from("3f020404"+this.buffer_session, 'hex')
                if(msg.readUint8(2)+1 > 255){
                    ok2.writeUint8(0, 3)
                }else{
                    ok2.writeUint8(msg.readUint8(2), 3)
                }
                
                ok2.writeUint8(msg.readUint8(3), 2)
                return [ok2]// this.process_msg(user_responses, msg, msg.readUInt8(2), msg.readUInt8(3))

            break;
            case 0x8006:
                //console.log('msg: main bucle: ', '0x8006')
                let action_response = this.get_action(msg)
                return this.process_msg(action_response, msg, msg.readUInt8(4), msg.readUInt8(5))
            break;
            case 0x7f00:
                //this.dpnid = msg.slice(164, 167)
                const first_stage2 = Buffer.from("7f000202c3000000", 'hex')
                first_stage2.writeUInt8(msg.readUInt8(3), 2)
                first_stage2.writeUInt8(msg.readUInt8(2), 3)
                const before_name = Buffer.from("3f0003020000",'hex')

                before_name.writeUInt8(msg.readUInt8(3)+1, 2)
                before_name.writeUInt8(msg.readUInt8(2), 3)

                const name = Buffer.from(this.user_bot.toString('hex').padEnd(this.max_name_byte * 2, "0"), 'hex')
                const after_name_before_map_name = Buffer.from('0b0200000000000000000000080600000003', 'hex')

                const map_name = Buffer.from(this.party.mapNameBuff.toString('hex').padEnd(this.max_map_name_byte * 2, "0"), 'hex')//Buffer.from("000000034d505f444d545f5645525449474f0000000000",'hex')
                const after_map_name = Buffer.from('90b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903','hex')
                return [first_stage2, this.replace_name_map((Buffer.concat([before_name, name, after_name_before_map_name, map_name, after_map_name])), this.party.mapName, this.party.currentPlayers, this.party.maxPlayers)]
                
                break;
            case 0x3f02:
                const first_stage = Buffer.from("7f000202c3000000", 'hex')
                first_stage.writeUInt8(msg.readUInt8(3), 2)
                first_stage.writeUInt8(msg.readUInt8(2), 3)
                //console.log('msg: ping: ', '0x3f02')
                return [first_stage]
            break;
            case 0x8802:
                //console.log('msg: firstStage: ', "0x8802")
                const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000','hex')
                const pre1 = Buffer.from("8002010006000100"+this.buffer_session+"e665f602", "hex")
                const pre2 = Buffer.from("3f020000"+this.buffer_session+"", 'hex')
                return [ pre1, pre2, session]
            break;
            case 0x0003: 
                this.party = this.extract_data(msg)
                return [Buffer.from("8801000006000100"+this.buffer_session+"c2091002", 'hex')]
            break;
            case 0x3f08:
                return []
            break;
            default:
                console.log("err: msg not recognice: ",msg)
                return false
            break;
        }
    }
    users_actions(msg){

        const bot = msg.readUInt8(4)
        const action = msg.readUInt8(5) //action player byte
        let responses = []
        const ok2 = Buffer.from("3f020404"+this.buffer_session, 'hex')
        ok2.writeUint8(msg.readUint8(3), 2)
        ok2.writeUint8(msg.readUint8(2), 3)
        //console.log('action, bot: ', action, this.#number_bot)
        switch(action){
            case 0xfb:
                break;
            case 0x0d:
                console.log('player change gun ', bot, this.#number_bot)    
            break;
            case 0x0c:
                this.follow_cam()
                console.log("move any", msg)
            break;
            case 0x0a:
                //this.user_camera(msg)
            break;
            case 0xfc:

                if(this.#number_bot === msg.readUint8(4)){

                    const have_life = msg.readUInt8(10)
                    console.log(`${this.user_bot} ha sido impactado por: other user. `)
                    console.log(`${this.user_bot} vida restante: `, msg.readUInt8(10))
                    if(msg.readUInt8(10) === 0){
                        console.log(`ha muerto: ${this.user_bot}`)
                        responses.push(this.try_other_spawn())

                    }
                    if(msg.readUInt8(10) === 255){
                        console.log(`ha muerto: ${this.user_bot}`)
                        responses.push(this.try_other_spawn())

                    }
                    
                }
                
                break;
            case 0xfe:
                
                break;
            case 0xed:
                if(this.bot_master){
                    console.log('any player death')
                }
                break;
            case 0x0e:
                //throw new Error('spwan palyer!!!')
                
                const arr_respawns = this.extractAllPlayers(msg)
                //console.log('spawns: ', arr_respawns.length, arr_respawns.map(i=>i.bot))
                const that_bot = arr_respawns.filter(row=>row.bot === this.#number_bot)[0]
                const player_respawn = arr_respawns.filter(row=>row.bot === 0)[0]
                
                if(player_respawn){
                    
                    console.log('player spawn ', bot)
                    this.player_cords = player_respawn
                    //this.start_move()
                }
                
                if(that_bot){

                    console.log('bot spawn ', this.#number_bot, that_bot)
                    this.in_game = true
                    this.start = true
                    const pj_response = Buffer.from('3f00800d010d1000010000e55e1d465c55b244ba37d045f6a30000'.replace('261370c5', this.buffer_session.toString('hex')), 'hex')
                    pj_response.writeInt8(this.#number_bot, 4)
                    this.bot_cords = that_bot
                    this.bot_helper.send_event(JSON.stringify({type_action: 'spawn', value_action: that_bot, id_bot: this.#number_bot}))
                
                    this.arr_actions.push(pj_response)
                    const change_gun = Buffer.from('3f006f0c000d05', 'hex')
                    change_gun.writeInt8(this.#number_bot, 4)
                    this.arr_actions.push(change_gun)
                    //this.spawn(that_bot.cords)
                    //const all_players = this.extractAllPlayers(msg)

                    //this.cb_spawn(all_players)
                    //responses.push({is_external: true, arr_respawns: arr_respawns})
                    ok2.writeUint8(msg.readUint8(2), 3)
                }
                
                break;
            case 0x26:
               // console.log('shot air', msg)    
            break;
            case 0x01:
                const bot_cords = this.extractRespawnXZR(msg, bot)

                if(bot===0){
                    //console.log('sync player bot number: ', msg)
                    

                    
                    //-this.follow_cam()

                    
                }
                if( bot==0 ){
                    //console.log('sync player bot number: ', msg)
                    this.player_cords = this.extractRespawnXZR(msg, 0)
                    this.follow_cam()

                }
                if(msg.readUInt16LE(6) === 0){
                    console.log('bot spawn in other bot')
                }
                if(this.loggin){
                    console.log('sync package: ', this.#number_bot, bot, this.bot_master, msg)
                }
                if(this.bot_master && bot==0 ){
                    
                    this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: {bot: bot, x: bot_cords.x, y: bot_cords.y, z: bot_cords.z, r: bot_cords.r}, id_bot: bot}))
                }
                if(bot == this.#number_bot){
                    
                    this.in_game = true
                    this.bot_cords = this.extractRespawnXZR(msg, bot)
                   

                    //this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: this.extractRespawnXZR(msg, bot), id_bot: this.#number_bot}))
                    
                }
                
                break;
            case 0xce:

                const ping_ce = Buffer.from('80060100ac240000ee8b4503', 'hex')
                ping_ce.writeUInt8(msg.readUInt8(2), 5)
                ping_ce.writeUInt8(msg.readUInt8(3), 4)

                //responses.push(ping_ce)
                //ok2.writeUint8(msg.readUint8(2), 3)
                //responses.push(ping_ce)
                break;
            default:

            break;
        }
        responses.push(ok2)
        return responses
    }
    
    get_action(msg){
        this.last_byte_send = msg.readUInt8(4)
        this.last_byte_send_next = msg.readUInt8(5)
        const ping = Buffer.from("3f020c0c"+this.buffer_session, 'hex')
        const result = [ping]
        if(this.arr_actions.length > 0){
            const returned = this.arr_actions.shift(0);
            result.push(returned)
        }else{
            
        }

        return result
    }
    try_other_spawn(){
        const pj_setup = Buffer.from('3f00181a0e0e000000000000000000000363011070b21900021c0610'.replace('123123332323133313213', this.buffer_session.toString('hex')), 'hex')
        //console.log('send spawn: ', this.#number_bot)
        pj_setup.writeUInt8(this.#number_bot, 4) //byte ultimo numero de jugadores en partida 0x00
        pj_setup.writeUInt8(0x02, 25) //modelo byte 0x00 torrente 0x0b yonki
        pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo
       
        //pj_setup.writeUInt8(0x02, pj_setup.length- 10) //numero de jugador 0x01 jugador 1 0x02 jugador 2
        return pj_setup
    }
    follow_cam(){
        //console.log(this.bot_cords, this.player_cords)
        if(this.bot_cords  && this.player_cords){
            const view = this.angleToTarget(this.bot_cords.x, this.bot_cords.y, this.player_cords.x, this.player_cords.y)
            //console.log('bot view to: ', view)
            const row = Buffer.from('3f002e1d000a77b3d60a','hex')
            row.writeUInt8(this.#number_bot, 4)
            //row.writeUint16LE( Math.floor(Math.random() * 180) , 8)
            row.writeUint8(view , 7)
            this.arr_actions.push(row)
            this.bot_cords.r = view
            this.bot_helper.send_event(JSON.stringify({type_action: 'sync', value_action: {bot: this.#number_bot, x: this.bot_cords.x, y: this.bot_cords.y, z: this.bot_cords.z, r: this.bot_cords.r}, id_bot: this.#number_bot}))
            
        }

    }
    angleToTarget(botX, botY, targetX, targetY) {
        const dx =  botX - targetX
        const dy = targetY - botY

        let angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
        if (angleDeg < 0) angleDeg += 360
        angleDeg = (angleDeg + 270) % 360;
        const packed = Math.floor(angleDeg / 360 * 256)
        return packed;
    }
    extractAllPlayers(buffer){
        const arr = this.splitBuffer(buffer, Buffer.from([0x0e, 0x00, 0x00]))
        const first_ele = arr.shift();
        //console.log('number players respawn', arr.length)
        if(arr.length === 1){
            return [this.extractRespawnXZR(arr[0], first_ele.readUInt8(first_ele.length - 1), 0)]
        }
        const result = []
        let id_bot = null
        for(let idx_entity in arr){

            if(idx_entity == 0){
                id_bot = first_ele.readUInt8(first_ele.length - 1)
            }
            let row = arr[idx_entity]
            result.push({bot: id_bot, cords: this.extractRespawnXZR(row, id_bot, 0)})
            id_bot = row.readUInt8(row.length - 1)
        }
        return result
    }
    spawn(cords){
        console.log('bot spawn: ', this.#number_bot)
        this.start = true
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

        return { x, y, z, r, bot};

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
    process_msg(arr, msg, count_prev, next_prev){
        const results = []
        for(let idx = 0; idx < arr.length; idx++){
            const row = arr[idx]
            if(!row.is_external){
                if( next_prev+idx > 255){
                    row.writeUint8(next_prev, 2)

                }else{
                    row.writeUint8(next_prev+idx, 2)
                   
                }
                
                row.writeUint8(count_prev, 3)
                
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
    replace_name_map(buffer, new_name_map, current_player, max_player){
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
    async shot(){
        const baseOffset = 8;
        console.log('shot bot')
        for(let i = 0; i < 1; i++){
            setTimeout(()=>{
                const shot = Buffer.from('3f00790e00262602714ea644f91e2143860ed745 ','hex')
                shot.writeUInt8(this.#number_bot, 4)
                shot.writeFloatLE(this.player_cords.x, 8);
                shot.writeFloatLE(this.player_cords.y, 8 + 8);
                this.arr_actions.push(shot)
            }, i * 1000)
        }
    }
    disconnect(){
        /*
        client action:  <Buffer 3f 03 dc 0e e1 db 66 1e>
        client action:  <Buffer 3f 01 dd 0e 00 02>
        client action:  <Buffer 3f 08 de 0e>
        */
       this.arr_actions.push(Buffer.from('3f001f170102', 'hex'))
       this.arr_actions.push(Buffer.from('3f08f618', 'hex'))
        return [Buffer.from('3f001f170102', 'hex'),
        Buffer.from('3f08f618', 'hex')]
    }
}