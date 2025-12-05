// extract_vertices_with_count.js
// Detecta bloques que contienen un uint32 count/length seguido de count vertices (3 floats c/u).
// Genera verts_detected.obj con todos los vértices encontrados (sin caras).
const fs = require('fs');
const path = require('path');

const INPUT = 'MP_DM_VERTIGO.opt'; // cambia si usas .OPT o .HM
const OUT = './verts_detected.obj';
const MAX_COUNT = 20000; // límite razonable de vértices por bloque
const MIN_COUNT = 1;
const MAX_COORD = 1e7;
const MIN_COORD = -1e7;
const buf = fs.readFileSync(INPUT);
const len = buf.length;

function isValidFloat(f) {
  if (!Number.isFinite(f)) return false;
  if (f > MAX_COORD || f < MIN_COORD) return false;
  // descartar valores ridículamente pequeños típicos de basura subnormal
  if (Math.abs(f) < 1e-30) return false;
  return true;
}

function validateVertexBlock(startOffset, count) {
  // startOffset should point at first float of first vertex
  if (count < MIN_COUNT || count > MAX_COUNT) return false;
  const needed = count * 12;
  if (startOffset + needed > len) return false;
  // validate first few and a sample spread
  const samples = Math.min(count, 12);
  for (let i = 0; i < samples; i++) {
    const off = startOffset + i * 12;
    const x = buf.readFloatLE(off);
    const y = buf.readFloatLE(off + 4);
    const z = buf.readFloatLE(off + 8);
    if (!(isValidFloat(x) && isValidFloat(y) && isValidFloat(z))) return false;
  }
  // also sample at tail to avoid false positives
  if (count > 12) {
    const off = startOffset + (count - 1) * 12;
    const x = buf.readFloatLE(off);
    const y = buf.readFloatLE(off + 4);
    const z = buf.readFloatLE(off + 8);
    if (!(isValidFloat(x) && isValidFloat(y) && isValidFloat(z))) return false;
  }
  return true;
}

const foundBlocks = [];

// Heurística: en cada posición posible, leer un uint32 LE que pueda ser 'count'.
// Intentaremos interpretarlo en varias posiciones alrededor (pos, pos-4, pos-8, pos+4),
// y para cada intento validamos si luego hay count * 12 bytes de tri-floats plausibles.
console.log(`Analizando ${INPUT} (${len} bytes) ...`);
for (let pos = 0; pos + 4 <= len; pos += 1) {
  // lee un posible count en pos
  const tryPositions = [pos, pos - 4, pos - 8, pos + 4];
  for (const p of tryPositions) {
    if (p < 0 || p + 4 > len) continue;
    const count = buf.readUInt32LE(p);
    if (count < MIN_COUNT || count > MAX_COUNT) continue;

    // si count plausible, prueba distintos "start" donde pueden comenzar floats
    // frecuentemente los floats empiezan justo después del count (p+4), o con 8/12/16 bytes de header
    const candidateStarts = [p + 4, p + 8, p + 12, p + 16, p + 20];
    for (const start of candidateStarts) {
      if (validateVertexBlock(start, count)) {
        // comprobar que no duplicamos un bloque ya encontrado (overlap fuerte)
        const existing = foundBlocks.find(b =>
          (Math.abs(b.start - start) < 4 && b.count === count) ||
          (start >= b.start && start < b.start + b.count * 12) ||
          (b.start >= start && b.start < start + count * 12)
        );
        if (!existing) {
          foundBlocks.push({ headerPos: p, start, count });
          console.log(`Bloque detectado: header@${p}, start@${start}, count=${count}`);
        }
      }
    }
  }
}

// Si no hemos encontrado bloques mediante uint32, probamos heurística buscando el "06 00 00 00"
// (el 6 que mencionaste) pero validando que justo después existan 6 vértices válidos
if (foundBlocks.length === 0) {
  console.log('No se detectaron bloques por count uint32. Probando patrón 06 00 00 00...');
  for (let i = 0; i + 4 <= len; i++) {
    if (buf[i] === 0x06 && buf[i+1] === 0x00 && buf[i+2] === 0x00 && buf[i+3] === 0x00) {
      const start = i + 4;
      if (validateVertexBlock(start, 6)) {
        // dedupe
        const exists = foundBlocks.find(b => Math.abs(b.start - start) < 4);
        if (!exists) {
          foundBlocks.push({ headerPos: i, start, count: 6 });
          console.log(`Patrón 06 detectado -> start@${start}, count=6`);
        }
      }
    }
  }
}

if (foundBlocks.length === 0) {
  console.log('No se detectaron bloques de vértices con heurísticas. Vamos a hacer un escaneo "sliding" en busca de run de floats.');
  // escaneo de runs: buscar runs largos de floats válidos en offsets alineados a 4 bytes
  let runs = [];
  for (let pos = 0; pos + 12 <= len; pos += 4) {
    let count = 0;
    let p = pos;
    while (p + 12 <= len) {
      const x = buf.readFloatLE(p), y = buf.readFloatLE(p+4), z = buf.readFloatLE(p+8);
      if (isValidFloat(x) && isValidFloat(y) && isValidFloat(z)) { count++; p += 12; }
      else break;
    }
    if (count >= 6) runs.push({ start: pos, count });
  }
  // seleccionar las runs más largas
  runs.sort((a,b)=>b.count-a.count);
  runs.slice(0,10).forEach(r => {
    foundBlocks.push({ headerPos: r.start - 4, start: r.start, count: r.count });
    console.log(`Run detectada start@${r.start}, count=${r.count}`);
  });
}

// Si aún nada, salir
if (foundBlocks.length === 0) {
  console.error('No se localizaron bloques de vértices. Por favor pásame un trozo del archivo alrededor de donde esperas la geometría (por ejemplo 512 bytes) y lo analizo manualmente.');
  process.exit(1);
}

// Merge: extraer vértices de cada bloque pero evitar duplicados muy cercanos
const allVerts = [];
const seen = new Map(); // key rounded -> index
function roundKey(x,y,z,prec=4) {
  return `${x.toFixed(prec)}|${y.toFixed(prec)}|${z.toFixed(prec)}`;
}

for (const b of foundBlocks) {
  for (let i = 0; i < b.count; i++) {
    const off = b.start + i * 12;
    if (off + 12 > len) break;
    const x = buf.readFloatLE(off);
    const y = buf.readFloatLE(off + 4);
    const z = buf.readFloatLE(off + 8);
    if (!(isValidFloat(x) && isValidFloat(y) && isValidFloat(z))) continue;
    const k = roundKey(x,y,z,4);
    if (!seen.has(k)) {
      seen.set(k, allVerts.length);
      allVerts.push([x,y,z]);
    }
  }
}

if (allVerts.length === 0) {
  console.error('Se detectaron bloques pero no se extrajeron vértices válidos.');
  process.exit(1);
}

// escribir OBJ
let out = '';
allVerts.forEach(v => {
  if(v[1]>= 0){
      out += `v ${v[0]} ${v[1]} ${v[2]}\n`;
  }

});
fs.writeFileSync(OUT, out);
console.log(`OBJ escrito: ${OUT} con ${allVerts.length} vértices (de ${foundBlocks.length} bloques detectados).`);
console.log('Detalles bloques detectados:', foundBlocks);
