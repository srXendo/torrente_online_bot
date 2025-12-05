module.exports = class bot_helper{
    #stream = null
    constructor(){
    }
    set_stream(stream){
        this.#stream = stream
    }
    send_event(json_string){
        if(this.#stream){
            this.#stream.write(`data: ${json_string}\n\n`)
        }
        
    }
}