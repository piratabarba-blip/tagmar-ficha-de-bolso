// Copia somente o sistema Tagmar e a biblioteca livre Handlebars, nunca o core Foundry.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=process.argv[2]; const hbs=process.argv[3];
if(!source||!hbs)throw Error('Informe a pasta do sistema Tagmar e da biblioteca Handlebars.');
const files={
 'modules/sheets/actorUtils.js':'rules.mjs',
 'templates/sheets/personagem-sheet.hbs':'sorteio.hbs',
 'templates/sheetsPoints/personagem-sheet.hbs':'pontos.hbs',
 'template.json':'schema.json',
 'css/bootstrap-grid.css':'grid.css',
 'css/sheet.css':'sheet.css',
 'css/foundry-sheet.css':'foundry-theme.css',
 'templates/sheets/img/logo.png':'logo.png',
 'LICENSE.md':'TAGMAR-LICENSE.md'
};
fs.mkdirSync(path.join(root,'vendor'),{recursive:true});
const hashes={};
for(const [from,to] of Object.entries(files)) {
 const data=fs.readFileSync(path.join(source,from));fs.writeFileSync(path.join(root,'vendor',to),data);
 hashes[from]=crypto.createHash('sha256').update(data).digest('hex');
}
fs.copyFileSync(path.join(hbs,'dist/handlebars.runtime.min.js'),path.join(root,'vendor/handlebars.runtime.min.js'));
fs.copyFileSync(path.join(hbs,'LICENSE'),path.join(root,'vendor/HANDLEBARS-LICENSE.txt'));
fs.writeFileSync(path.join(root,'vendor/provenance.json'),JSON.stringify({systemVersion:JSON.parse(fs.readFileSync(path.join(source,'system.json'))).version,hashes},null,2));
console.log('Templates, cálculos, esquema e créditos copiados.');
