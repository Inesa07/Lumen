// Copies static/js/places.js (the drawings of Lumi's places) into the Mac widget, between
// "// <places>" and "// </places>", because an Übersicht widget is a single file.
// Run: npm run widget
import { readFileSync, writeFileSync } from 'node:fs';

const WIDGET = 'desktop-widget/lumen.widget/index.jsx';
const places = readFileSync('static/js/places.js', 'utf8').replace(/^'use strict';\n/m, '');
const src = readFileSync(WIDGET, 'utf8');
const out = src.replace(/\/\/ <places>[\s\S]*?\/\/ <\/places>/, `// <places>\n${places.trim()}\n// </places>`);
if (out === src && !src.includes('// <places>')) throw new Error('markers not found in ' + WIDGET);
writeFileSync(WIDGET, out);
console.log('widget updated with places.js');
