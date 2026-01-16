let spawn_ex = Buffer.from('3f00252b010e000004ee864155beb844c69f1d46f90f494000020610020e0000e17ac9c441f34344aaaa54416132fd3f01020610030e0000261370c522beb644d58c1dc614ae473f01020610040e000097ba59c1400cc14135daa7440000000000020610050e0000395b1dc622beb644ae4a3fc5fbcb963f01020610060e0000f0b8a4440e2104410dd9f8c16132fd3f00020610070e0000487384c1c6373a443708bcc50000000001020610080e0000de3dc7447b3142448fdad3c16132fdbf00020610090e00005be72dc622beb64427182ec614ae473f010206100a0e0000e55e1d4655beb844ba37d045fbcb16c000020610','hex')

extractAllPlayers(spawn_ex)
function extractAllPlayers(buffer){
    const arr = splitBuffer(buffer, Buffer.from([0x0e, 0x00, 0x00]))
    const first_ele = arr.shift();
    console.log('number players respawn', arr.length)
    if(arr.length === 1){
        return [extractRespawnXZR(arr[0], first_ele.readUInt8(first_ele.length - 1), 0)]
    }
    const result = {}
    let id_bot = null
    for(let idx_entity in arr){
        console.log(idx_entity, idx_entity == 0)
        if(idx_entity == 0){
            id_bot = first_ele.readUInt8(first_ele.length - 1)
        }
        console.log(id_bot)
        let row = arr[idx_entity]
        result[id_bot] = extractRespawnXZR(row, id_bot, 0)
        id_bot = row.readUInt8(row.length - 1)
    }
}
function extractRespawnXZR(buffer, bot, baseOffset = 8) {

    const x = buffer.readFloatLE(baseOffset);
    const z = buffer.readFloatLE(baseOffset + 4);
    const y = buffer.readFloatLE(baseOffset + 8);
    const r = buffer.readUInt8(baseOffset + 13);

    return { x, y, z, r, bot};

}
function splitBuffer(buffer, delimiter) {
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
