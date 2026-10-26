const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const hbs=require(process.argv[2]||'handlebars');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const source=read('vendor/rules.mjs');
const ruleExports=[...source.matchAll(/export function (\w+)/g)].map(m=>m[1]);
const rules=`const rules=(()=>{${source.replace(/export function /g,'function ')}\nreturn {${ruleExports.join(',')}};})();`;
const model=read('src/model.mjs').replace(/^import .*\n/gm,'').replace(/export /g,'');
const templates={};
const logo='data:image/png;base64,'+fs.readFileSync(path.join(root,'vendor/logo.png')).toString('base64');
for(const mode of ['pontos','sorteio']){
 const text=read(`vendor/${mode}.hbs`).replace(/src="systems\/[^"\n]+\/logo\.png"/g,`src="${logo}"`);
 templates[mode]=`Handlebars.template(${hbs.precompile(text)})`;
}
const templateCode=`const TEMPLATES={pontos:${templates.pontos},sorteio:${templates.sorteio}};`;
// Temas próprios do sistema; URLs externas e fontes dependentes do Foundry são removidas.
const css=[read('vendor/grid.css'),read('vendor/sheet.css').replace(/@font-face\s*\{[^}]*\}/g,'').replace(/url\([^)]*\)/g,'none'),read('vendor/foundry-theme.css'),read('src/app.css')].join('\n');
const script=read('vendor/handlebars.runtime.min.js')+'\n(()=>{\nconst schema='+read('vendor/schema.json')+';\n'+rules+'\n'+model+'\n'+templateCode+'\n'+read('src/app.js')+'\n})();';
const notices=['LICENSE.md','vendor/GPL-3.0.txt','vendor/TAGMAR-LICENSE.md','vendor/HANDLEBARS-LICENSE.txt','vendor/BOOTSTRAP-LICENSE.txt'].map(file=>file+'\n\n'+read(file)).join('\n\n--------------------\n\n');
const noticeHtml=notices.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const html=read('src/shell.html').replace('/* STYLES */',()=>css).replace('/* SCRIPT */',()=>script.replace(/<\/script/gi,'<\\/script')).replace('</body>',()=>`<template id="license-notices"><pre>${noticeHtml}</pre></template></body>`);
fs.writeFileSync(path.join(root,'Ficha de Bolso.html'),html,'utf8');
console.log(`HTML offline construído: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB. Nenhuma dependência de rede.`);
