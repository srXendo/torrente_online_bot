const routerApi = require("./router.api");
const fs = require('fs')





let AUsers = null
const dgram = require('dgram');
const BotService = require('./../services/bot.service')
const PacketQueue = require('./../helpers/packetQueue')
class publicApi {
  router = new routerApi('');
  bot = null
  ip_server = "";
  port_server = 0;

  num_bots = 0;
  mapper = {}
  id_bot_mapper = {}
  loggin = false
  bot_master = true
  packetQueue = null
  pathfinding = null
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
    this.router.set_route("GET", "/navmesh3.glb", this.get_navmesh.bind(this));
    this.router.set_route("GET", "/model.bot.obj", this.get_model.bind(this));
    this.router.set_route("GET", "/pathfinder.worker.js", this.pathfinder.bind(this));

    this.router.set_route("GET", "/api/connect", this.connect_client.bind(this));
    this.router.set_route("POST", "/api/recive_start", this.recive_start.bind(this))
    this.router.set_route("POST", "/api/action_bot", this.action_bot.bind(this))
    this.router.set_route("GET", "/api/disconnect", this.disconnect_from_api.bind(this))
  }

  async get_index(stream, headers, params) {
    const response = {
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
  async get_styles_css(stream, headers, params) {
    const response = {
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
  async pathfinder(stream, headers, params) {
    const response = {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/javascript; charset=utf-8',
      ":status": 200,
    }
    const index_js = fs.readFileSync('./public/pathfinder.worker.js');
    stream.respond(response)
    stream.write(index_js)
    stream.end()
    return null
  }
  async get_index_js(stream, headers, params) {
    const response = {
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

  async get_navmesh(stream, headers, params) {
    const response = {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/plain; charset=utf-8',
      ":status": 200,
    }
    const map = fs.readFileSync('./public/navmesh.glb');
    stream.respond(response)
    stream.write(map)
    stream.end()
    return null
  }
  async get_map(stream, headers, params) {
    const response = {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/plain; charset=utf-8',
      ":status": 200,
    }
    const map = fs.readFileSync('./public/map.obj');
    stream.respond(response)
    stream.write(map)
    stream.end()
    return null
  }
  async get_model(stream, headers, params) {
    const response = {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/plain; charset=utf-8',
      ":status": 200,
    }
    const model = fs.readFileSync('./public/model.bot.obj');
    stream.respond(response)
    stream.write(model)
    stream.end()
    return null
  }
  async connect_client(stream, headers, params) {

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
  starter() {
    if (this.number_bot_starts < this.num_bots) {
      console.log(`create new bot order! ${this.number_bot_starts}`)
      this.number_bot_starts++
      this.start_bots(() => this.starter(), this.number_bot_starts).then(async () => {
        const helloClient = Buffer.from("000221a5011242191fb8bb154e4401763631007932", "hex")
        const hello_response = await this.send_package_to_server(this.number_bot_starts, helloClient)
      }).catch(err => new Error(err))


    }
  }
  async recive_start(stream, headers, params) {
    const response = {
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


    this.bot_master = true

    this.number_bot_starts = 1
    this.packetQueue = new PacketQueue({
      mapper: {},
      idBotMapper: {},
      ipServer: this.ip_server,
      portServer: this.port_server,
      intervalMs: 5,
      logging: this.loggin
    })
    await this.start_bots(() => this.starter(), this.number_bot_starts)
    const helloClient = Buffer.from("000221a5011242191fb8bb154e4401763631007932", "hex")
    const hello_response = await this.send_package_to_server(this.number_bot_starts, helloClient)

    //stream.respond(response)
    stream.write('')
    stream.end()
    console.log("body", body)
    return Promise.resolve([false, 204])
  }
  async action_bot(stream, headers, params) {
    const response = {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }
    stream.respond(response)
    try {
      const body = await this.get_body(stream)

      if (body.state_bot === "navmesh_load" && body.data) {
        console.log('prepare pathfinding', body.data)
        const THREE = require('three');
        const { Pathfinding } = require('three-pathfinding');

        const ZONE = 'level';
        this.pathfinder = new Pathfinding();

        const { positions, index } = body.data;

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

        stream.write('')
        stream.end()
        return
      }

      const bot_port = this.packetQueue.idBotMapper[body.id_bot]
      if (body.state_bot === 'attack') {

        const change_gun = Buffer.from('3f006f0c000d05', 'hex')
        change_gun.writeInt8(body.id_bot, 4)
        await this.send_package_to_server(body.id_bot, change_gun)
        //const shot = Buffer.from('3f00f2320101803f104620c65b55b244608c08c64507f013','hex')


        await this.packetQueue.mapper[bot_port].bot.shot()
      }


      /*if ('forward_move' === body.state_bot) {

        await this.packetQueue.mapper[bot_port].bot.forward_move()

      }

      if (body.state_bot === "camera_right") {

        await this.packetQueue.mapper[bot_port].bot.camera_right()
      }
      if (body.state_bot === "camera_left") {

        await this.packetQueue.mapper[bot_port].bot.camera_left()
      }*/

      //stream.respond(response)
      stream.write('')
      stream.end()

      return Promise.resolve([false, 204])
    } catch (err) {
      console.error(new Error(err.stack))
      throw new Error(err)
    }
  }
  async start_bots(first_msg_callback, i) {
    const obj_starter = await this.get_server_and_port(i)
    if (this.loggin) {
      console.log(`new bot: id_bot${i} port: ${obj_starter.port}`);
    }
    this.packetQueue.mapper[obj_starter.port] = {
      server: obj_starter.server,
      number_bot: i,
      port_bot: obj_starter.port,
      bot: new BotService(i, this.bot, this.bot_master, this.pathfinder, this.ZONE)
    }
    this.packetQueue.mapper[obj_starter.port] = this.packetQueue.mapper[obj_starter.port]
    this.bot_master = false
    this.packetQueue.idBotMapper[i] = obj_starter.port
    this.packetQueue.mapper[obj_starter.port].is_first_msg = false
    this.packetQueue.mapper[obj_starter.port].bot.emit_start.on('user_start', () => {
      first_msg_callback()
    });
    this.packetQueue.mapper[obj_starter.port].bot.emit_start.on('user_set_number_bot', (number_bot) => {
      
    });
    this.packetQueue.mapper[obj_starter.port].server.on('message', (msg, rconf) => {
      const now = new Date();

      const pad = (n) => n.toString().padStart(2, '0');

      const formattedDate =
          pad(now.getDate()) + '/' +
          pad(now.getMonth() + 1) + '/' +
          now.getFullYear() + ' ' +
          pad(now.getHours()) + ':' +
          pad(now.getMinutes()) + ':' +
          pad(now.getSeconds()) + '.' +
          now.getMilliseconds().toString().padStart(3, '0');
      console.log(`${formattedDate}: Nuevo mensaje recibido bot_${i}: `, msg.toString('hex'))
      this.handler_message(msg, rconf, obj_starter)
    })

    return Promise.resolve()

  }
  get_server_and_port(i) {
    return new Promise((resolve, reject) => {

      const server = dgram.createSocket('udp4');

      server.on('listening', () => {
        const address = server.address();
        resolve({ server: server, port: address.port })

      });
      server.on('error', (err) => {
        console.error(`Error en el servidor: ${err.message}`);
        server.close();
      });
      const HOST = '0.0.0.0';
      server.bind(HOST);
    })
  }

  async handler_message(msg, rconf, addr) {
    if (this.loggin) {
      console.log(`Mensaje recibido: id_bot:  ${this.packetQueue.mapper[addr.port].number_bot} ${addr.port} \n${msg.toString('hex')}`);

      console.log('handler_message')
    }
    const responses = this.packetQueue.mapper[addr.port].bot.handler_message(msg, rconf)
    const id_bot = this.packetQueue.mapper[addr.port].number_bot
    if (!responses) {
      console.log(`[handler_message]: bot nº ${id_bot} msg not recognize`, msg.toString('hex'))
      console.error(new Error(`[handler_message]: bot nº ${id_bot} msg not recognize`))
      return
    }

    for (let msg_to_server of responses) {
      if (!msg_to_server.is_external) {
        const now = new Date();

        const pad = (n) => n.toString().padStart(2, '0');
        const formattedDate =
            pad(now.getDate()) + '/' +
            pad(now.getMonth() + 1) + '/' +
            now.getFullYear() + ' ' +
            pad(now.getHours()) + ':' +
            pad(now.getMinutes()) + ':' +
            pad(now.getSeconds()) + '.' +
            now.getMilliseconds().toString().padStart(3, '0');
        console.log(`${formattedDate}: Nueva resupuesta enviada bot_${id_bot}: ${msg_to_server.toString('hex')} al mensaje: ${msg.toString('hex')}`)
        await this.send_package_to_server(id_bot, msg_to_server)
      } else {
        for (let respawn of msg_to_server.arr_respawns) {
          const bot_port = this.packetQueue.idBotMapper[respawn.bot]
          if (!this.packetQueue.mapper[bot_port].bot.in_game) {
            console.log(`bot no spawn: ${this.packetQueue.mapper[bot_port].bot}`)
            //mapper[bot_port].bot.spawn(respawn.cords)
          }

        }
      }

    }


  }
  send_package_to_server(id_bot, buf) {
    return new Promise((resolve, reject) => {
      this.packetQueue.mapper[this.packetQueue.idBotMapper[id_bot]].server.send(buf, this.port_server, this.ip_server, (err) => {
        if (err) {
          console.error(`Error al clientHello: ${err.message}`);
          resolve(false)
        } else {
          if (this.loggin) {
            console.log(`Mensaje enviado: id_bot: ${id_bot} ${this.packetQueue.idBotMapper[id_bot]} \n${buf.toString('hex')}`);

            console.log('handler_message')
          }
          resolve(true)

        }
      });
    }) //this.packetQueue.send(id_bot, buf);

  }
  get_body(stream) {
    return new Promise((resolve, reject) => {
      let body = ''
      stream.on('data', (chunk) => { body = body + chunk })
      stream.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch (err) {
          resolve(false)
        }
      })
    })
  }
  async disconnect_from_api(stream, headers, params) {
    console.log('!disconnect all bots')

    for (let bot of Object.values(this.packetQueue.mapper)) {
      const responses = await bot.bot.disconnect()


    }
    stream.write('')
    stream.end()

    return []
  }
  async disconnect(stream, headers, params) {

    for (let bot of Object.values(this.packetQueue.mapper)) {
      const responses = await bot.bot.disconnect()

    }


  }
}

module.exports = publicApi;