import * as rules from '../vendor/rules.mjs';
import schema from '../vendor/schema.json' with {type:'json'};

export const VERSION='0.1.0';
export const ATTRS=['INT','AUR','CAR','FOR','FIS','AGI','PER'];
export const TYPES=schema.Item.types;
export const clone=value=>structuredClone(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const forbidden=new Set(['__proto__','prototype','constructor']);
export function validateTree(value,depth=0) {
 if(depth>50)throw Error('O arquivo tem estruturas profundas demais.');
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Há um número inválido na ficha.');
 if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)) {
  if(forbidden.has(key))throw Error('O arquivo contém uma chave reservada.');
  validateTree(child,depth+1);
 }
}
export function parseActor(text) {
 if(text.length>20*1024*1024)throw Error('Limite de 20 MB por ficha.');
 let raw;try{raw=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('Este arquivo não é um JSON válido. Exporte o ator pelo Foundry.');}
 validateActor(raw);return raw;
}
export function validateActor(raw) {
 validateTree(raw);
 if(!object(raw)||raw.type!=='Personagem'||typeof raw.name!=='string'||!object(raw.system)||!Array.isArray(raw.items))throw Error('Abra o JSON de um ator do tipo Personagem do Tagmar. NPC, mundo e compêndio não são fichas de personagem.');
 const sys=raw._stats?.systemId??raw.flags?.exportSource?.system??raw._stats?.exportSource?.systemId;
 if(sys&&!['tagmar_rpg','tagmar3er_oficial','tagmar3er-oficial'].includes(sys))throw Error(`Sistema não compatível: ${sys}.`);
 if(!object(raw.system.atributos)||!('estagio' in raw.system))throw Error('Estrutura de personagem Tagmar não reconhecida.');
 if(!Number.isInteger(raw.system.estagio)||raw.system.estagio<1||raw.system.estagio>100)throw Error('O estágio precisa ser um inteiro entre 1 e 100.');
 validateShape(raw.system,defaults('Actor','Personagem'),'personagem');
 if(raw.items.length>5000)throw Error('Limite de 5.000 itens por ficha.');
 const ids=new Set();for(const item of raw.items) {
  if(!object(item)||typeof item.name!=='string'||typeof item.type!=='string'||!object(item.system)||typeof item._id!=='string'||!item._id||ids.has(item._id))throw Error('Item sem identificação válida ou com ID repetido. Exporte novamente pelo Foundry.');
  ids.add(item._id);
  validateShape(item.system,defaults('Item',item.type),item.name);
 }
 return raw;
}
function validateShape(actual,shape,label) {
 for(const [key,value] of Object.entries(shape))if(Object.hasOwn(actual,key)) {
  if(object(value)){if(!object(actual[key]))throw Error(`Estrutura inválida: ${label}.${key}.`);validateShape(actual[key],value,`${label}.${key}`);}
  if(Array.isArray(value)&&!Array.isArray(actual[key]))throw Error(`Lista inválida: ${label}.${key}.`);
 }
}
export function get(obj,path) {return path.split('.').reduce((v,k)=>v?.[k],obj);}
export function set(obj,path,value) {
 const keys=path.split('.');if(keys.some(k=>!k||forbidden.has(k)))throw Error('Campo inválido.');
 let target=obj;for(const key of keys.slice(0,-1)) {if(!object(target[key]))target[key]={};target=target[key];}
 target[keys.at(-1)]=value;
}
export function merge(base,override) {
 const result=clone(base??{});
 for(const [key,value] of Object.entries(override??{}))result[key]=object(value)&&object(result[key])?merge(result[key],value):clone(value);
 return result;
}
export function defaults(kind,type) {
 const definition=schema[kind]?.[type]??{};let result={};
 for(const name of definition.templates??[])result=merge(result,schema[kind].templates[name]);
 const own=clone(definition);delete own.templates;return merge(result,own);
}
export function viewActor(raw) {
 const actor=clone(raw);actor.system=merge(defaults('Actor','Personagem'),raw.system);
 actor.items=raw.items.map(item=>({...clone(item),id:item._id,system:merge(defaults('Item',item.type),item.system)}));
 const byType=type=>actor.items.filter(i=>i.type===type).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 for(const [key,type] of Object.entries({combate:'Combate',magias:'Magia',tecnicas:'Tecnica_Combate',defesas:'Defesa',transportes:'Transporte',efeitos:'Efeito',habilidades:'Habilidade'}))actor[key]=byType(type);
 actor.raca=byType('Raca')[0];actor.profissao=byType('Profissao')[0];
 actor.pertences=byType('Pertence').filter(i=>!i.system.inTransport);actor.pertences_transporte=byType('Pertence').filter(i=>i.system.inTransport);
 for(const [key,cat] of Object.entries({h_prof:'profissional',h_man:'manobra',h_con:'conhecimento',h_sub:'subterfugio',h_inf:'influencia',h_geral:'geral'}))actor[key]=actor.habilidades.filter(i=>i.system.tipo===cat);
 actor.especializacoes=String(actor.profissao?.system.especializacoes??'').split(',').map(key=>({key}));
 actor.cat_def=['L','M','P'].map(key=>({key}));
 for(const [key,type] of Object.entries({combate_fav:'combate',tecnica_fav:'tecnicas',magia_fav:'magias'}))actor[key]=actor[type].filter(i=>i.system.favorito);
 for(const group of Object.keys(actor.system.grupos))actor[group.toLowerCase()+'_aprim']=actor.system.grupo_aprim===group;
 actor.deleteEmbeddedDocuments=()=>{throw Error('Há mais de uma raça ou profissão. Revise os itens antes de recalcular.');};
 return actor;
}
function numericTypes(actual,shape,label) {
 for(const [key,value] of Object.entries(shape)) {
  if(typeof value==='number'&&(!Number.isFinite(actual?.[key])||typeof actual?.[key]!=='number'))throw Error(`Valor numérico inválido: ${label}.${key}.`);
  if(object(value))numericTypes(actual?.[key],value,`${label}.${key}`);
 }
}
export function recalculate(raw,mode='preserve') {
 validateActor(raw);if(mode==='preserve')return clone(raw);
 if(!['pontos','sorteio'].includes(mode))throw Error('Escolha o modo de atributos da mesa.');
 const output=clone(raw);
 // Ordem sequencial elimina a dependência de múltiplos renders que existe no Foundry.
 for(let pass=0;pass<3;pass++) {
  const actor=viewActor(output),data={document:actor,items:actor.items,options:{editable:true}};
  numericTypes(actor.system,defaults('Actor','Personagem'),'personagem');
  for(const item of actor.items)numericTypes(item.system,defaults('Item',item.type),item.name);
  const apply=updates=>{for(const [field,value] of Object.entries(updates)) {validateTree(value);if(value===undefined)throw Error(`Cálculo incompleto: ${field}.`);set(actor,field,value);set(output,field,value);}};
  const run=(fn,...args)=>{const update={};fn(data,update,...args);apply(update);};
  if(actor.raca)run(rules._preparaCaracRaciais);
  for(const group of ['atributos','mod_racial','carac_sort'])for(const value of Object.values(actor.system[group]??{}))if(typeof value==='number'&&Math.abs(value)>1000)throw Error('Atributo fora do limite de cálculo da versão 0.1 (±1000). Use Preservar valores para consultar esse arquivo.');
  if(mode==='sorteio'&&actor.raca){run(rules._caracSort);run(rules._calculaAjuste);}
  if(mode==='pontos')run(rules._setPontosRaca);
  const effective=mode==='pontos'?rules._preparaEfeitosAtributos(data).efetivos:actor.system.atributos;
  run(rules._prepareValorTeste,effective);
  const itemUpdates=[];
  if(actor.profissao)run(rules._attProfissao,itemUpdates,effective);else rules._updateHabilItems(data,itemUpdates,effective);
  run(rules._attCargaAbsorcaoDefesa,effective);
  if(actor.raca&&actor.profissao)run(rules._attEfEhVB,effective);
  run(rules._attProximoEstag);
  const fisico=mode==='sorteio'?(actor.raca?rules._calculaAjuste(data,{}):{base:actor.system.atributos.FIS,efetivo:actor.system.atributos.FIS}):{base:actor.system.atributos.FIS,efetivo:effective.FIS};
  apply(rules._calculaEhTemporaria(actor,fisico));
  run(rules._attKarmaMax,effective);run(rules._attRM,effective);run(rules._attRF,effective);
  rules._updateCombatItems(data,itemUpdates,effective);rules._updateMagiasItems(data,itemUpdates,effective);rules._updateTencnicasItems(data,itemUpdates,effective);
  for(const update of itemUpdates) {
   const item=output.items.find(i=>i._id===update._id);if(!item)throw Error('Cálculo referiu um item ausente.');
   for(const [field,value] of Object.entries(update))if(field!=='_id'){validateTree(value);if(value===undefined)throw Error('Item incompleto para cálculo.');set(item,field,value);}
  }
 }
 validateActor(output);return output;
}
export function levelUp(raw,mode,d10) {
 if(mode==='preserve')throw Error('Escolha Por pontos ou Por sorteio para usar a progressão calculada.');
 if(!Number.isInteger(d10)||d10<1||d10>10)throw Error('Informe um resultado de d10 entre 1 e 10.');
 const output=recalculate(raw,mode),actor=viewActor(output),s=actor.system;
 if(s.estagio>=100)throw Error('A versão 0.1 suporta até o estágio 100.');
 if(s.pontos_estagio.value<s.pontos_estagio.next)throw Error(`Experiência insuficiente: precisa de ${s.pontos_estagio.next} pontos.`);
 const faixa=d10<=2?'v1':d10<=5?'v2':d10<=8?'v3':'v4';
 const gain=actor.profissao?.system.lista_eh?.[faixa];
 if(!Number.isFinite(gain))throw Error('Inclua uma profissão com a tabela de EH para subir de estágio.');
 const data={document:actor,options:{editable:true}};
 const fisico=mode==='pontos'?{base:s.atributos.FIS,efetivo:rules._preparaEfeitosAtributos(data).efetivos.FIS}:actor.raca?rules._calculaAjuste(data,{}):{base:s.atributos.FIS,efetivo:s.atributos.FIS};
 const updates=rules._calculaEhTemporaria(actor,fisico,s.estagio+1,s.eh.max-(s.eh.bonusFis??0)+gain+fisico.base);
 for(const [field,value] of Object.entries(updates))set(output,field,value);
 output.system.estagio++;return recalculate(output,mode);
}
export function changes(before,after,prefix='') {
 if(JSON.stringify(before)===JSON.stringify(after))return [];
 if(object(before)&&object(after))return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(k=>changes(before[k],after[k],prefix?prefix+'.'+k:k));
 if(Array.isArray(before)&&Array.isArray(after)&&before.every(x=>object(x)&&x._id)&&after.every(x=>object(x)&&x._id)) {
  return [...new Set([...before,...after].map(x=>x._id))].flatMap(id=>changes(before.find(x=>x._id===id),after.find(x=>x._id===id),`${prefix}[${id}]`));
 }
 return [{path:prefix,before:clone(before),after:clone(after)}];
}
export function serialize(raw){validateActor(raw);return JSON.stringify(raw,null,2)+'\n';}
export function id(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return [...bytes].map(b=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b%62]).join('');}
export function newItem(type,name) {
 if(!TYPES.includes(type))throw Error('Tipo de item não suportado para criação.');
 return {_id:id(),name,type,img:'icons/svg/item-bag.svg',system:defaults('Item',type),effects:[],flags:{}};
}
export function sampleActor() {
 const s=defaults('Actor','Personagem');s.estagio=3;s.raca='Humano';s.profissao='Guerreiro';s.pontos_estagio.value=31;
 Object.assign(s.atributos,{INT:1,AUR:0,CAR:1,FOR:2,FIS:2,AGI:1,PER:1});
 Object.assign(s.carac_sort,{INT:13,AUR:10,CAR:13,FOR:16,FIS:16,AGI:13,PER:13});
 s.eh={value:18,max:24,min:0,bonusFis:0,deficitFis:0};s.ef.value=18;s.grupos.CL=2;
 s.descricao='<p>Personagem fictício para experimentar o editor. Troque pelo JSON exportado da sua mesa.</p>';
 const race=newItem('Raca','Humano');Object.assign(race.system,{ef_base:16,vb:20});
 const prof=newItem('Profissao','Guerreiro');Object.assign(prof.system,{p_aquisicao:{p_hab:10,p_tec:4,p_gra:5,p_mag:0},lista_eh:{v1:3,v2:4,v3:5,v4:6},grupo_pen:'conhecimento'});
 const hab=newItem('Habilidade','Escalar');Object.assign(hab.system,{tipo:'manobra',custo:1,nivel:2,ajuste:{atributo:'AGI',valor:0}});
 const bag=newItem('Pertence','Rações de viagem');Object.assign(bag.system,{quant:5,peso:0.5,preco:'1 mp'});
 const sword=newItem('Combate','Espada de exemplo');Object.assign(sword.system,{tipo:'CL',bonus:'FOR',bonus_dano:'FOR'});
 for(let p=25;p<=300;p+=25)sword.system.dano_base['d'+p]=p/25;
 return recalculate({_id:id(),name:'Elarion — exemplo',type:'Personagem',img:'icons/svg/mystery-man.svg',system:s,items:[race,prof,hab,bag,sword],effects:[],flags:{core:{sheetClass:'tagmar.tagmarAltSheet'}},_stats:{systemId:'tagmar_rpg',systemVersion:'2.7.0-v14.1-rc.52'}},'pontos');
}
export class Session {
 constructor(raw){this.original=clone(raw);this.actor=clone(raw);this.saved=JSON.stringify(raw);this.undoStack=[];this.redoStack=[];this.entries=[];}
 get dirty(){return JSON.stringify(this.actor)!==this.saved;}
 commit(next,label){validateActor(next);if(JSON.stringify(next)===JSON.stringify(this.actor))return;this.undoStack.push({actor:this.actor,label});if(this.undoStack.length>30)this.undoStack.shift();this.actor=clone(next);this.redoStack=[];this.entries.push(label);}
 undo(){const last=this.undoStack.pop();if(!last)return;this.redoStack.push({actor:this.actor,label:last.label});this.actor=last.actor;}
 redo(){const last=this.redoStack.pop();if(!last)return;this.undoStack.push({actor:this.actor,label:last.label});this.actor=last.actor;}
}
