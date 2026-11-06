const fs = require('node:fs');
const path = require('node:path');

const sources = [
 ['snapshot-criando-fichas-t3er.json', 'Criação de Fichas'],
 ['snapshot-terras-selvagens-t3er.json', 'Terras Selvagens']
];
const input = process.argv[2];
if (!input) throw Error('Informe a pasta com os dois snapshots dos compêndios.');
const dataRoot = process.argv[3];
const publicRoot = process.argv[4];

function xxxImage(value) {
 if (!/^(icons\/|systems\/tagmar_rpg\/)/.test(value ?? '')) return;
 let decoded;
 try {
  decoded = decodeURIComponent(value);
 } catch {
  return;
 }
 if (/[\\:?#\x00-\x1f]/.test(decoded) || decoded.split('/').some(part => !part || part === '.' || part === '..')) return;
 const root = decoded.startsWith('icons/') ? publicRoot : dataRoot;
 if (root && !fs.statSync(path.join(root, decoded), {throwIfNoEntry:false})?.isFile()) return;
 return value;
}

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const types = new Set(read(path.join(__dirname, '../vendor/schema.json')).Item.types);
const removeImages = (key, value) => typeof value === 'string'
 ? value.replace(/<img\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi, '')
 : value;
const catalog = sources.flatMap(([file, source]) => {
 const {documents, folders} = read(path.join(input, file));
 const foldersById = new Map(folders.map(folder => [folder._id, folder]));
 function folderPath(id) {
  const names = [];
  const visited = new Set();
  for (let folder = foldersById.get(id); folder && !visited.has(folder._id); folder = foldersById.get(folder.folder)) {
   names.unshift(folder.name);
   visited.add(folder._id);
  }
  return names;
 }
 return documents.filter(item => types.has(item.type) && item.flags?.tagmarSync?.official !== false)
  .map(({name, type, system, folder, img}) => {
   const folders = folderPath(folder);
   const section = folders[0]?.match(/^\d{2}(?= - )/)?.[0];
   if (!section) throw Error(`Categoria ausente para ${name} em ${source}.`);
   const category = source === 'Terras Selvagens' && section === '08' ? '10' : section;
   return {name, type, system, source, category, folders, imgXXX:xxxImage(img)};
  });
});
catalog.sort((a,b) => a.name.localeCompare(b.name,'pt-BR') || a.source.localeCompare(b.source,'pt-BR'));
fs.writeFileSync(path.join(__dirname, '../vendor/catalogo-tagmar.json'), JSON.stringify(catalog, removeImages) + '\n');
console.log(`${catalog.length} itens no catálogo.`);
