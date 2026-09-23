const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname, '..',
  'node_modules', '@vladmandic', 'face-api', 'dist', 'face-api.esm.js'
);

const content = fs.readFileSync(target, 'utf8');

// Backup original
const backup = target + '.backup';
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, content);
  console.log('Created backup at', backup);
}

// Patch: replace AR=Vt(()=>{}) with proper require('util')
// AR is the node 'util' module reference
const oldAr = ',AR=Vt(()=>{})';
const newAr = ",AR=Vt(function(e,t){t.exports=require('util')})";

if (content.indexOf(oldAr) >= 0) {
  const patched = content.replace(oldAr, newAr);
  
  // Also patch _R (node-fetch) for completeness - Node 18+ has native fetch
  // but the fallback should work for older Node
  const oldR = ',_R=Vt(()=>{})';
  const newR = ",_R=Vt(function(e,t){t.exports=require('node-fetch')})";
  if (patched.indexOf(oldR) >= 0) {
    const final = patched.replace(oldR, newR);
    fs.writeFileSync(target, final, 'utf8');
    console.log('Patched both _R and AR in face-api.esm.js');
    console.log('  _R -> require("node-fetch")');
    console.log('  AR -> require("util")');
  } else {
    fs.writeFileSync(target, patched, 'utf8');
    console.log('Patched AR (util) only');
  }
} else {
  console.log('ERROR: Pattern not found! File may have been patched already.');
  const arIdx = content.indexOf(',AR=Vt(');
  if (arIdx >= 0) {
    console.log('Found AR at', arIdx, ':', content.substring(arIdx, arIdx + 30));
  } else {
    console.log('AR not found at all');
  }
  const vIdx = content.indexOf('Vt=(e,t)=');
  console.log('Vt def at', vIdx);
}

// Verify the patch
const verified = fs.readFileSync(target, 'utf8');
if (verified.indexOf("require('util')") > 0 && verified.indexOf("require('node-fetch')") > 0) {
  console.log('\n✓ Verification passed: both requires found in patched file');
} else {
  console.log('\n⚠ Verification had issues');
}