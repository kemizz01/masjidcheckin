/**
 * Post-build patch for face-api chunk.
 *
 * face-api.esm.js bundles tfjs-core which has PlatformNode that does:
 *   this.util = E()  // E should be require('util') but is an empty stub
 *   this.textEncoder = new this.util.TextEncoder  // crashes
 *
 * This script finds the affected chunk in .next/server/chunks/ and replaces
 * the empty E=z(()=>{}) stub with a factory that actually requires Node's util.
 */

const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, '..', '.next', 'server', 'chunks');

if (!fs.existsSync(CHUNKS_DIR)) {
  console.log('[patch-chunk] No chunks dir — skipping');
  process.exit(0);
}

const files = fs.readdirSync(CHUNKS_DIR).filter((f) => f.endsWith('.js'));
let patched = 0;

for (const file of files) {
  const filePath = path.join(CHUNKS_DIR, file);
  let source = fs.readFileSync(filePath, 'utf8');

  // The face-api chunk contains the PlatformNode class with this.util=E()
  if (!source.includes('this.util=E()')) continue;

  const before = source;

  // Replace empty stubs. The pattern in the bundled output is:
  //   ,D=z(()=>{}),E=z(()=>{}),F=z((a,b)=>{...})
  // We replace D and E so they properly require their Node modules.
  source = source.replace(
    /([,;])E=z\(\(\)=>\{\}\)/g,
    "$1E=z(function(e,t){t.exports=require('util')})"
  );

  source = source.replace(
    /([,;])D=z\(\(\)=>\{\}\)/g,
    "$1D=z(function(e,t){t.exports=require('node-fetch')})"
  );

  fs.writeFileSync(filePath, source, 'utf8');
  patched++;
  console.log(
    `[patch-chunk] ✓ Patched ${file} — injected require('util') and require('node-fetch')`
  );
}

if (patched === 0) {
  console.log('[patch-chunk] ⚠ No face-api chunk found with this.util=E() pattern');
  // List all chunks as fallback info
  const allChunks = files.filter((f) =>
    fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8').includes('.util=')
  );
  if (allChunks.length > 0) {
    console.log('[patch-chunk] Found chunks with .util=:', allChunks);
  }
} else {
  console.log(`[patch-chunk] ✓ Patch complete (${patched} file${patched > 1 ? 's' : ''})`);
}

process.exit(0);