const routerApi = require("./router.api");
const fs = require('fs')
const { Worker } = require('worker_threads');




let AUsers = null
const path = require('path')
const dgram = require('dgram');
//const BotService = require('./../services/bot.service')
const PacketQueue = require('./../helpers/packetQueue')
class publicApi {
  router = new routerApi('');
  bot = null
  ip_server = "";
  port_server = 0;
  #path_worker = path.join(__dirname, './../services/bot.service.js')
  #path_waypoints_worker = path.join(__dirname, './../services/waypoints.service.js')
  #workers = []
  #waypoints_worker = null
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

    const indexpath = path.join(__dirname, './../public/index.html');
    const html = fs.readFileSync(indexpath);
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
    const csspath = path.join(__dirname, './../public/styles.css');
    const style_css = fs.readFileSync(csspath);
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
    const pathworker = path.join(__dirname, './../public/pathfinder.worker.js');
    const index_js = fs.readFileSync(pathworker);
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
    const pathjs = path.join(__dirname, './../public/index.js');
    const index_js = fs.readFileSync(pathjs);
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

    const pathmap = path.join(__dirname, './../public/navmesh.glb');
    const map = fs.readFileSync(pathmap);
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
    const pathmap = path.join(__dirname, './../public/map.obj');
    const map = fs.readFileSync(pathmap);
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
    const pathmodel = path.join(__dirname, './../public/model.bot.obj');
    const model = fs.readFileSync(pathmodel);
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
      }).catch(err => new Error(err))


    }
  }
  action_msg(obj_msg, first_msg_callback, number_worker_dad) {
    const { type, number_worker, data } = obj_msg
    switch (type) {
      case 'listening':
        console.log(type, number_worker, data)

        break;
      case 'start':

        break;
      case 'msg_to_frontend':
        this.bot.send_event(data)
        break;
      case 'next':
        first_msg_callback()
        break;
      case 'calc_waypoints':
        this.#waypoints_worker.postMessage(JSON.stringify({ type: 'calc_waypoints', data: { player_cords: data.player_cords, bot_cords: data.bot_cords, number_worker: number_worker_dad } }))
        break;
      case 'waypoints':
        console.log('data', data, "'set_waypoints', { waypoints: data.waypoints }': ", 'set_waypoints', { waypoints: data.waypoints }, number_worker)
        this.#send_msg_to_worker(number_worker, 'set_waypoints', { waypoints: data.waypoints })
        break;
      default:
        const err = new Error(`worker msg type ${type} not recongnice:`)
        console.error(err)
        throw new Error(err)
        break;
    }

  }
  #send_msg_to_worker(number_worker, type, data) {
    try {
      console.log(`this.#workers[number_worker]: ${this.#workers.length}: number_worker: ${number_worker}`)
      this.#workers[number_worker].postMessage(JSON.stringify({
        type,
        data
      }));
    } catch (err) {
      console.error(new Error(err.stack))
      throw new Error(err.stack)
    }
  }
  process_msg(str_msg) {
    try {
      return JSON.parse(str_msg)
    } catch (err) {
      console.error(new Error(err.stack))
      throw new Error(err.stack)
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

    await this.start_bots(() => this.starter(), this.number_bot_starts)

    //const helloClient = Buffer.from("000221a5011242191fb8bb154e4401763631007932", "hex")
    //const hello_response = await this.send_package_to_server(this.number_bot_starts, helloClient)

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

        this.#waypoints_worker = new Worker(this.#path_waypoints_worker, {
          workerData: { body_data: body.data, ZONE: this.ZONE }
        });
        this.#waypoints_worker.on('message', (msg_worker) => {
          this.action_msg(this.process_msg(msg_worker))
        });
        this.#waypoints_worker.on('error', (err) => {
          console.error(new Error(err.stack))
          throw new Error(err.stack)
        });
        this.#waypoints_worker.on('exit', (code) => {
          if (code !== 0)
            return Promise.reject(new Error(`Worker stopped with exit code ${code}`));
        });
        stream.write('')
        stream.end()
        return
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
    const worker = new Worker(this.#path_worker, {
      workerData: { number_bot: i, body_data: this.body_data, bot_master: this.bot_master, bot_helper: this.bot, ZONE: this.ZONE, ip_connect: this.ip_server, port_connect: this.port_server }
    });

    this.bot_master = false
    this.#workers.push(worker)
    const number_worker = this.#workers.length -1
    worker.on('message', (msg_worker) => {
      this.action_msg(this.process_msg(msg_worker), first_msg_callback, number_worker)
    });
    worker.on('error', (err) => {
      console.error(new Error(err.stack))
      throw new Error(err.stack)
    });
    worker.on('exit', (code) => {
      if (code !== 0)
        return Promise.reject(new Error(`Worker stopped with exit code ${code}`));
    });

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
    for (let bot in this.#workers) {
      this.#send_msg_to_worker(bot, 'disconnect')
    }
    stream.write('')
    stream.end()

    return []
  }
  async disconnect(stream, headers, params) {

    for (let bot in this.#workers) {
      this.#send_msg_to_worker(bot, 'disconnect')
    }


  }
}

module.exports = publicApi;