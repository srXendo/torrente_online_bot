const fs = require('fs');

class TEXAnalyzer {
  constructor(filePath) {
    this.filePath = filePath;
    this.buffer = null;
  }

  readFile() {
    this.buffer = fs.readFileSync(this.filePath);
    console.log(`Archivo: ${this.filePath}`);
    console.log(`Tamaño: ${this.buffer.length} bytes\n`);
  }

  // Analiza el header completo
  analyzeHeader() {
    console.log('=== HEADER ANALYSIS ===');
    const magic = this.buffer.toString('ascii', 0, 4);
    console.log(`Magic: "${magic}"`);
    
    if (magic !== 'TeX2') {
      console.warn('⚠️  No es un archivo TeX2 estándar\n');
      return;
    }

    // Leer valores del header
    const values = [];
    for (let i = 0; i < 16; i=i+2) {
      const offset = i * 4;
      const u32 = this.buffer.readUInt32LE(offset);
      const i32 = this.buffer.readInt32LE(offset);
      const f32 = this.buffer.readFloatLE(offset);
      
      values.push({
        offset: `0x${offset.toString(16).padStart(4, '0')}`,
        hex: u32.toString(16).padStart(8, '0'),
        uint32: u32,
        int32: i32,
        float: Number.isFinite(f32) ? f32.toFixed(6) : 'invalid'
      });
    }

    console.log('\nOffset | Hex      | UInt32      | Int32       | Float');
    console.log('-------+----------+-------------+-------------+------------');
    values.forEach(v => {
      console.log(`${v.offset} | ${v.hex} | ${v.uint32.toString().padStart(11)} | ${v.int32.toString().padStart(11)} | ${v.float}`);
    });

    // Buscar posibles contadores de vértices/caras
    console.log('\n=== POSIBLES CONTADORES ===');
    values.forEach((v, i) => {
      if (v.uint32 > 10 && v.uint32 < 100000) {
        const bytesNeeded = v.uint32 * 12; // mínimo para posiciones
        if (bytesNeeded < this.buffer.length) {
          console.log(`Offset 0x${(i*4).toString(16)}: ${v.uint32} (podría ser contador de vértices)`);
        }
      }
    });
  }

  // Busca patrones de datos empaquetados
  findPackedData() {
    console.log('\n=== BÚSQUEDA DE DATOS EMPAQUETADOS ===');
    
    const len = this.buffer.length;
    const patterns = {
      int16sequences: [],
      int8sequences: [],
      floatsequences: []
    };

    // Buscar secuencias de int16 que parezcan coordenadas normalizadas
    for (let offset = 64; offset < Math.min(5000, len - 100); offset += 2) {
      const values = [];
      let valid = true;

      for (let i = 0; i < 9; i++) { // 3 vértices * 3 componentes
        const v = this.buffer.readInt16LE(offset + i * 2);
        if (Math.abs(v) > 32767) {
          valid = false;
          break;
        }
        values.push(v);
      }

      if (valid) {
        // Normalizar a rango -1..1 o escalar
        const normalized = values.map(v => v / 32767.0);
        const scaled = values.map(v => v / 100.0);
        
        patterns.int16sequences.push({
          offset: offset,
          offsetHex: '0x' + offset.toString(16),
          values: values,
          normalized: normalized,
          scaled: scaled
        });
      }
    }

    if (patterns.int16sequences.length > 0) {
      console.log(`\n✓ Encontradas ${patterns.int16sequences.length} secuencias de Int16`);
      console.log('\nPrimeras 3 secuencias:');
      patterns.int16sequences.slice(0, 3).forEach((seq, idx) => {
        console.log(`\n${idx + 1}. Offset ${seq.offsetHex}:`);
        console.log(`   Raw: [${seq.values.slice(0, 6).join(', ')}...]`);
        console.log(`   Normalized (-1..1): [${seq.normalized.slice(0, 3).map(v => v.toFixed(3)).join(', ')}]`);
        console.log(`   Scaled (/100): [${seq.scaled.slice(0, 3).map(v => v.toFixed(2)).join(', ')}]`);
      });
    }
  }

  // Busca bloques de datos por entropía
  findDataBlocks() {
    console.log('\n=== ANÁLISIS DE BLOQUES DE DATOS ===');
    
    const blockSize = 512;
    const len = this.buffer.length;
    const blocks = [];

    for (let offset = 0; offset < len; offset += blockSize) {
      const end = Math.min(offset + blockSize, len);
      const block = this.buffer.slice(offset, end);
      
      // Calcular estadísticas del bloque
      let zeros = 0;
      let variance = 0;
      const bytes = Array.from(block);
      const mean = bytes.reduce((a, b) => a + b, 0) / bytes.length;
      
      bytes.forEach(b => {
        if (b === 0) zeros++;
        variance += Math.pow(b - mean, 2);
      });
      variance /= bytes.length;

      blocks.push({
        offset: offset,
        offsetHex: '0x' + offset.toString(16),
        size: end - offset,
        zeros: zeros,
        zeroPercent: (zeros / (end - offset) * 100).toFixed(1),
        variance: variance.toFixed(2),
        mean: mean.toFixed(2)
      });
    }

    // Mostrar bloques con alta varianza (probable datos geométricos)
    const dataBlocks = blocks
      .filter(b => b.variance > 5000 && b.zeroPercent < 20)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 5);

    if (dataBlocks.length > 0) {
      console.log('\nBloques con probable geometría (alta varianza, pocos ceros):');
      console.log('\nOffset   | Tamaño | Ceros | Varianza | Media');
      console.log('---------+--------+-------+----------+-------');
      dataBlocks.forEach(b => {
        console.log(`${b.offsetHex} | ${b.size.toString().padStart(6)} | ${b.zeroPercent.padStart(5)}% | ${b.variance.padStart(8)} | ${b.mean}`);
      });
    }
  }

  // Muestra hexdump mejorado de una sección
  hexdump(startOffset, length = 256) {
    console.log(`\n=== HEXDUMP: Offset ${startOffset} (0x${startOffset.toString(16)}) ===\n`);
    
    const end = Math.min(startOffset + length, this.buffer.length);
    
    for (let i = startOffset; i < end; i += 16) {
      const hex = [];
      const ascii = [];
      const decoded = [];
      
      for (let j = 0; j < 16 && i + j < end; j++) {
        const byte = this.buffer[i + j];
        hex.push(byte.toString(16).padStart(2, '0'));
        ascii.push(byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '.');
      }
      
      // Intentar interpretar como int16
      if (i + 6 <= end) {
        const v1 = this.buffer.readInt16LE(i);
        const v2 = this.buffer.readInt16LE(i + 2);
        const v3 = this.buffer.readInt16LE(i + 4);
        decoded.push(`i16:[${v1},${v2},${v3}]`);
      }

      console.log(`${i.toString(16).padStart(8, '0')}: ${hex.join(' ').padEnd(48)} |${ascii.join('')}| ${decoded.join(' ')}`);
    }
  }

  // Intenta extraer vértices con diferentes formatos
  tryExtractVertices() {
    console.log('\n=== INTENTANDO EXTRAER VÉRTICES ===');
    
    const formats = [
      { name: 'Float XYZ (12 bytes)', stride: 12, reader: this.readFloat3.bind(this) },
      { name: 'Float XYZ+NxNyNz (24 bytes)', stride: 24, reader: this.readFloat6.bind(this) },
      { name: 'Float XYZ+NxNyNz+UV (32 bytes)', stride: 32, reader: this.readFloat8.bind(this) },
      { name: 'Int16 XYZ (6 bytes)', stride: 6, reader: this.readInt16_3.bind(this) },
      { name: 'Int16 XYZ+NxNyNz (12 bytes)', stride: 12, reader: this.readInt16_6.bind(this) }
    ];

    for (const format of formats) {
      console.log(`\nProbando formato: ${format.name}`);
      
      // Probar desde diferentes offsets
      for (const startOffset of [0x10, 0x20, 0x40, 0x60, 0x80, 0x100]) {
        if (startOffset >= this.buffer.length) continue;
        
        const vertices = [];
        let offset = startOffset;
        let validCount = 0;

        for (let i = 0; i < 20; i++) {
          if (offset + format.stride > this.buffer.length) break;
          
          const data = format.reader(offset);
          if (data && this.isPlausibleVertex(data)) {
            vertices.push(data);
            validCount++;
          } else {
            break;
          }
          
          offset += format.stride;
        }

        if (validCount >= 5) {
          console.log(`  ✓ Offset 0x${startOffset.toString(16)}: ${validCount} vértices válidos`);
          console.log(`    Primeros 3:`);
          vertices.slice(0, 3).forEach((v, i) => {
            const coords = v.slice(0, 3).map(n => n.toFixed(3)).join(', ');
            console.log(`      ${i + 1}. (${coords})`);
          });
        }
      }
    }
  }

  readFloat3(offset) {
    try {
      return [
        this.buffer.readFloatLE(offset),
        this.buffer.readFloatLE(offset + 4),
        this.buffer.readFloatLE(offset + 8)
      ];
    } catch { return null; }
  }

  readFloat6(offset) {
    try {
      return [
        this.buffer.readFloatLE(offset),
        this.buffer.readFloatLE(offset + 4),
        this.buffer.readFloatLE(offset + 8),
        this.buffer.readFloatLE(offset + 12),
        this.buffer.readFloatLE(offset + 16),
        this.buffer.readFloatLE(offset + 20)
      ];
    } catch { return null; }
  }

  readFloat8(offset) {
    try {
      return [
        this.buffer.readFloatLE(offset),
        this.buffer.readFloatLE(offset + 4),
        this.buffer.readFloatLE(offset + 8),
        this.buffer.readFloatLE(offset + 12),
        this.buffer.readFloatLE(offset + 16),
        this.buffer.readFloatLE(offset + 20),
        this.buffer.readFloatLE(offset + 24),
        this.buffer.readFloatLE(offset + 28)
      ];
    } catch { return null; }
  }

  readInt16_3(offset) {
    try {
      const scale = 100.0;
      return [
        this.buffer.readInt16LE(offset) / scale,
        this.buffer.readInt16LE(offset + 2) / scale,
        this.buffer.readInt16LE(offset + 4) / scale
      ];
    } catch { return null; }
  }

  readInt16_6(offset) {
    try {
      const scale = 100.0;
      return [
        this.buffer.readInt16LE(offset) / scale,
        this.buffer.readInt16LE(offset + 2) / scale,
        this.buffer.readInt16LE(offset + 4) / scale,
        this.buffer.readInt16LE(offset + 6) / 32767.0,
        this.buffer.readInt16LE(offset + 8) / 32767.0,
        this.buffer.readInt16LE(offset + 10) / 32767.0
      ];
    } catch { return null; }
  }

  isPlausibleVertex(data) {
    if (!data || data.length < 3) return false;
    const [x, y, z] = data;
    return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) &&
           Math.abs(x) < 10000 && Math.abs(y) < 10000 && Math.abs(z) < 10000;
  }

  // Análisis completo
  fullAnalysis() {
    this.readFile();
    this.analyzeHeader();
    this.findDataBlocks();
    this.findPackedData();
    this.tryExtractVertices();
    
    // Mostrar hexdump de secciones interesantes
    console.log('\n' + '='.repeat(80));
    this.hexdump(0, 128);
    this.hexdump(64, 256);
  }
}

// === MAIN ===
const args = process.argv.slice(2);

console.log('='.repeat(80));
console.log('  ANALIZADOR DE FORMATO TEX - Detector de Geometría');
console.log('='.repeat(80) + '\n');

if (args.length === 0) {
  console.log('Uso: node analyze_tex.js <archivo.tex>\n');
  console.log('Ejemplo:');
  console.log('  node analyze_tex.js demo.vpk/texs/ballenato.tex\n');
  process.exit(0);
}

const texFile = args[0];

if (!fs.existsSync(texFile)) {
  console.error(`❌ No se encuentra: ${texFile}\n`);
  process.exit(1);
}

try {
  const analyzer = new TEXAnalyzer(texFile);
  analyzer.fullAnalysis();
  
  console.log('\n' + '='.repeat(80));
  console.log('✓ Análisis completado');
  console.log('='.repeat(80) + '\n');
  
} catch (error) {
  console.error(`\n❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}