const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const electron = require('./main.js')
electron(apis)

