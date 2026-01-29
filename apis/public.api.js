const routerApi = require("./router.api");
const fs = require('fs')





let AUsers = null
const dgram = require('dgram');
const BotService = require('./../services/bot.service')
class publicApi {
  router = new routerApi('');
  bot = null
  ip_server = "";
  port_server = 0;

  num_bots = 0;
  mapper = {}
  id_bot_mapper = {}
  loggin = true
  bot_master = true
  constructor(bot) {
    this.bot = bot
    this.registerRoutes();
  }

  registerRoutes() {
    // index
    this.router.set_route("GET", "/", this.get_index.bind(this));
    this.router.set_route("GET", "/index.js", this.get_index_js.bind(this));
    this.router.set_route("GET", "/styles.css", this.get_styles_css.bind(this));
    this.router.set_route("GET", "/map.obj", this.get_map.bind(this));
    this.router.set_route("GET", "/model.bot.obj", this.get_model.bind(this));
    this.router.set_route("GET", "/api/connect", this.connect_client.bind(this));
    this.router.set_route("POST", "/api/recive_start", this.recive_start.bind(this))
    this.router.set_route("POST", "/api/action_bot", this.action_bot.bind(this))
    this.router.set_route("GET", "/api/disconnect", this.disconnect_from_api.bind(this))
  }
 
  async get_index(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }
    const html = fs.readFileSync('./public/index.html');
    stream.respond(response)
    stream.write(html)
    stream.end()
    return null
  }
  async get_styles_css(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/css; charset=utf-8',
      ":status": 200,
    }
    const style_css = fs.readFileSync('./public/styles.css');
    stream.respond(response)
    stream.write(style_css)
    stream.end()
    return null
  }
  async get_index_js(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/javascript; charset=utf-8',
      ":status": 200,
    }
    const index_js = fs.readFileSync('./public/index.js');
    stream.respond(response)
    stream.write(index_js)
    stream.end()
    return null
  }
  async get_map(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }
    const map = fs.readFileSync('./public/map.obj');
    stream.respond(response)
    stream.write(map)
    stream.end()
    return null
  }
  async get_model(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }
    const model = fs.readFileSync('./public/model.bot.obj');
    stream.respond(response)
    stream.write(model)
    stream.end()
    return null
  }
  async connect_client(stream, headers, params){

    stream.respond({
      'content-type': 'text/event-stream; charset=utf-8',
      ':status': 200, 
    });
    const msg_event = JSON.stringify({
      hello: 'world'
    })
    this.bot.set_stream(stream)
    this.bot.send_event(msg_event)

  }
  async recive_start(stream, headers, params){
        const response =  {
        "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
        "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
        'Access-Control-Allow-Credentials': true,
        "access-control-allow-headers": "Content-Type, Cookies",
        'content-type': 'text/html; charset=utf-8',
        ":status": 200,
      }

      const body = await this.get_body(stream)

      this.ip_server = body.ip_server;
      this.port_server = body.port_server;


      this.num_bots = body.num_bots;
      this.mapper = {}
      this.id_bot_mapper = {}

      this.bot_master = true
      

      const arr_bots = await this.start_bots()
      this.mapper = arr_bots
      for(let bot of Object.values(arr_bots)){
          const helloClient = Buffer.from("00026128011242191fb8bb154e4401763631007932","hex")
          const hello_response = await this.send_package_to_server(bot.number_bot, helloClient)
      }


      //stream.respond(response)
      stream.write('')
      stream.end()
      console.log("body", body)
      return Promise.resolve([false, 204])
  }
  async action_bot(stream, headers, params){

      const body = await this.get_body(stream)
      if(body.state_bot === 'attack'){
        const header = Buffer.from('3F00831001FBFF', 'hex')
        const text = Buffer.from(`Hola soy el bot ${body.id_bot}: te voy a matar`, 'ascii')
        const end_buf = Buffer.from('001F71DA0C01000000020000004022250CA436061000000000','hex')
        const chat = Buffer.concat([header, text, end_buf])
        
        chat.writeUInt8(body.id_bot, 4)
        await this.send_package_to_server(body.id_bot, chat)
        const change_gun = Buffer.from('3f006f0c000d05', 'hex')
        change_gun.writeInt8(body.id_bot, 4)
        await this.send_package_to_server(body.id_bot, change_gun)
        //const shot = Buffer.from('3f00f2320101803f104620c65b55b244608c08c64507f013','hex')

        const bot_port = this.id_bot_mapper[body.id_bot]
        await this.mapper[bot_port].bot.shot()
      }
      //stream.respond(response)
      stream.write('')
      stream.end()

      return Promise.resolve([false, 204])
  }
  async start_bots(){
      const ports_bots_map = {}
      for(let i = 1; i < this.num_bots+1; i++){
          
          const obj_starter = await this.get_server_and_port()
          if(this.loggin){
              console.log(`new bot: id_bot${i} port: ${obj_starter.port}`);
          }
          this.mapper[obj_starter.port] = {
              server: obj_starter.server,
              number_bot: i,
              port_bot: obj_starter.port,
              bot: new BotService(i, this.bot, this.bot_master)
          }
          ports_bots_map[obj_starter.port] = this.mapper[obj_starter.port]
          this.bot_master = false
          this.id_bot_mapper[i] = obj_starter.port,
          ports_bots_map[obj_starter.port].server.on('message', (msg, rconf)=>this.handler_message(msg, rconf, obj_starter))

      }

      return ports_bots_map
  }
  get_server_and_port(){
    return new Promise((resolve, reject)=>{

        const server = dgram.createSocket('udp4');

        server.on('listening', () => {
            const address = server.address();
            resolve({server: server, port: address.port})
            
        });
        server.on('error', (err) => {
            console.error(`Error en el servidor: ${err.message}`);
            server.close();
        });
        const HOST = '0.0.0.0';
        server.bind(HOST);
    })
  }

  async handler_message(msg, rconf, addr){
      if(this.loggin){
          console.log(`Mensaje recibido: id_bot: ${this.mapper[addr.port].number_bot} ${addr.port} \n${msg.toString('hex')}`);
      
          console.log('handler_message')
      }
      const responses = this.mapper[addr.port].bot.handler_message(msg, rconf)
      const id_bot = this.mapper[addr.port].number_bot
      if(!responses){
          console.error(new Error(`[handler_message]: bot nº ${id_bot} msg not recognize`))
          return
      }
      for(let msg_to_server of responses){
          if(!msg_to_server.is_external){
              await this.send_package_to_server(id_bot, msg_to_server)
          }else{
              for(let respawn of msg_to_server.arr_respawns){
                  const bot_port = this.id_bot_mapper[respawn.bot]
                  if(!this.mapper[bot_port].bot.in_game){
                      console.log(`bot no spawn: ${this.mapper[bot_port].bot}`)
                      //mapper[bot_port].bot.spawn(respawn.cords)
                  }
                  
              }
          }
      }
      
  }
  send_package_to_server(id_bot, buf){
      return new Promise((resolve, reject)=>{
          this.mapper[this.id_bot_mapper[id_bot]].server.send(buf, this.port_server, this.ip_server, (err) => {
              if (err) {
                  console.error(`Error al clientHello: ${err.message}`);
                  resolve(false)
              } else {
                  if(this.loggin){
                      console.log(`Mensaje enviado: id_bot: ${id_bot} ${this.id_bot_mapper[id_bot]} \n${buf.toString('hex')}`);
                  
                      console.log('handler_message')
                  }
                  resolve(true)
                  
              }
          });
      })

  }
  get_body(stream){
    return new Promise((resolve, reject)=>{
      let body = ''
      stream.on('data', (chunk)=>{body = body+chunk})
      stream.on('end', ()=>{
        try{
          resolve(JSON.parse(body))
        }catch(err){
          resolve(false)
        }
      })
    })
  }
  async disconnect_from_api(stream, headers, params){
    console.log('!disconnect all bots')
    
    for(let bot of Object.values(this.mapper)){
        const responses = bot.bot.disconnect()


    }
    stream.write('')
    stream.end()
    return []
  }
  async disconnect(stream, headers, params){
    
      for(let bot of Object.values(this.mapper)){
          const responses = bot.bot.disconnect()
          this.send_package_to_server(bot.number_bot, responses[0])
          this.send_package_to_server(bot.number_bot, responses[1])
      }


  }
}

module.exports = publicApi;