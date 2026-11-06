import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseActor,sampleActor,serialize,recalculate,levelUp,newItem,Session,changes,set,clone} from '../src/model.mjs';
test('abrir/salvar preserva integralmente IDs, flags, effects, itens e dados desconhecidos',()=>{
 const a=sampleActor();a.flags.terceiro={macro:'console.log(1)',data:[1,'texto',{deep:true}]};a.effects=[{_id:'effect01',changes:[{key:'system.ef.max',value:'4'}]}];a.prototypeToken={texture:{src:'worlds/aventura/token.webp'},flags:{foo:'bar'}};a.items[0].flags={outro:{a:1}};a.future={anything:true};
 assert.deepEqual(parseActor(serialize(a)),a);assert.deepEqual(recalculate(a,'preserve'),a);
 const edited=clone(a);edited.name='Novo nome';assert.deepEqual(changes(a,edited),[{path:'name',before:a.name,after:'Novo nome'}]);
});
test('cálculos por pontos: totais, itens, carga e pontos de estágio; não altera entrada',()=>{
 const a=sampleActor(),copy=clone(a);a.system.atributos.FIS=3;const b=recalculate(a,'pontos');
 assert.equal(b.system.rf,6);assert.equal(b.system.ef.max,21);assert.equal(b.system.vb,23);assert.equal(b.system.carga.value,2.5);assert.equal(b.items.find(i=>i.type==='Habilidade').system.total,3);assert.equal(b.system.pontos_estagio.next,31);assert.equal(a.system.ef.max,copy.system.ef.max);
 assert.deepEqual(recalculate(b,'pontos'),b);
});
test('sorteio usa tabela original de ajustes e é idempotente',()=>{
 const a=sampleActor();a.system.carac_sort.FOR=18;a.system.carac_sort.FIS=15;const b=recalculate(a,'sorteio');assert.equal(b.system.atributos.FOR,3);assert.equal(b.system.atributos.FIS,1);assert.equal(b.system.ef.max,20);assert.deepEqual(recalculate(b,'sorteio'),b);
});
test('reaplica os modificadores da raça mesmo quando o nome já coincide',()=>{
 const actor=sampleActor();
 const race=actor.items.find(item=>item.type==='Raca');
 Object.assign(race.system.mod_racial,{FIS:2,AGI:-1});
 for(const mode of ['pontos','sorteio']){
  const result=recalculate(actor,mode);
  assert.equal(result.system.raca,race.name);
  assert.equal(result.system.mod_racial.FIS,2);
  assert.equal(result.system.mod_racial.AGI,-1);
  assert.deepEqual(recalculate(result,mode),result);
 }
 assert.equal(recalculate(actor,'preserve').system.mod_racial.FIS,0);
});
test('efeito Tagmar temporário de FIS não acumula e preserva EH gasta',()=>{
 const a=sampleActor(),effect=newItem('Efeito','Vigor');effect.system={atributo:'FIS',tipo:'+',valor:2,ativo:true};a.items.push(effect);const b=recalculate(a,'pontos');assert.equal(b.system.eh.max,30);assert.equal(b.system.eh.value,24);assert.deepEqual(recalculate(b,'pontos'),b);b.items.at(-1).system.ativo=false;const c=recalculate(b,'pontos');assert.equal(c.system.eh.max,24);assert.equal(c.system.eh.value,18);
});
test('progressão usa experiência, faixa d10, FIS e conserva EH gasta',()=>{
 const a=sampleActor();const b=levelUp(a,'pontos',7);assert.equal(b.system.estagio,4);assert.equal(b.system.eh.max,31);assert.equal(b.system.eh.value,18);assert.equal(b.system.pontos_estagio.next,46);assert.equal(a.system.estagio,3);
 assert.throws(()=>levelUp(b,'pontos',7),/Experiência/);assert.throws(()=>levelUp(a,'preserve',7),/Escolha/);assert.throws(()=>levelUp(a,'pontos',11),/d10/);
});
test('calcula com números em texto e campos vazios de fichas exportadas do Foundry',()=>{
 const actor=sampleActor();
 const technique=newItem('Tecnica_Combate','Combate Montado');
 Object.assign(technique.system,{nivel:2,bonus:null,mecanica:'1',ajuste:{atributo:'AGI',valor:'-1'}});
 actor.items.push(technique);
 actor.system.pontos_estagio.value=50;
 const result=levelUp(actor,'pontos',7);
 const saved=result.items.at(-1).system;
 assert.equal(result.system.estagio,4);
 assert.equal(saved.fa,2);
 assert.equal(saved.bonus,null);
 assert.equal(saved.mecanica,'1');
 assert.equal(saved.ajuste.valor,'-1');
 assert.deepEqual(recalculate(result,'pontos'),result);
});
test('erro de cálculo ou raças duplicadas não muta a ficha nem remove itens',()=>{
 const a=sampleActor();a.items.push(newItem('Raca','Outra raça'));const original=serialize(a);assert.throws(()=>recalculate(a,'pontos'),/mais de uma/);assert.equal(serialize(a),original);
 const b=sampleActor();b.items[1].system.p_aquisicao.p_hab='abc';assert.throws(()=>recalculate(b,'pontos'),/numérico/);
 const c=sampleActor();const zero=newItem('Efeito','Inválido');zero.system={atributo:'RFIS',tipo:'/',valor:0,ativo:true};c.items.push(zero);assert.throws(()=>recalculate(c,'pontos'),/número/);
});
test('desfazer/refazer e edição preservam metadados de origem',()=>{
 const a=sampleActor();const session=new Session(a);const b=clone(a);b.system.deus='Cruine';session.commit(b,'Deus');assert.equal(session.dirty,true);session.undo();assert.deepEqual(session.actor,a);session.redo();assert.equal(session.actor.system.deus,'Cruine');assert.deepEqual(session.actor._stats,a._stats);
});
test('rejeita JSON incorreto, outros sistemas, IDs repetidos e poluição de protótipo',()=>{
 assert.throws(()=>parseActor('invalid'),/JSON/);assert.throws(()=>parseActor('{"__proto__":{"polluted":true}}'),/reservada/);assert.throws(()=>set({},'__proto__.polluted',true),/inválido/);assert.equal({}.polluted,undefined);
 const a=sampleActor();a.type='NPC';assert.throws(()=>parseActor(JSON.stringify(a)),/Personagem/);a.type='Personagem';a._stats.systemId='dnd5e';assert.throws(()=>parseActor(JSON.stringify(a)),/Sistema/);a._stats.systemId='tagmar3er-oficial';a.items.push(clone(a.items[0]));assert.throws(()=>parseActor(JSON.stringify(a)),/repetido/);
});
test('estruturas inválidas falham antes de abrir e atributos extremos não entram na recursão',()=>{
 const a=sampleActor();a.system.grupos=null;assert.throws(()=>parseActor(JSON.stringify(a)),/Estrutura inválida/);
 const b=sampleActor();b.items[0].system.mod_racial=[];assert.throws(()=>parseActor(JSON.stringify(b)),/Estrutura inválida/);
 const c=sampleActor();c.system.atributos.INT=1e20;assert.deepEqual(recalculate(c,'preserve'),c);assert.throws(()=>recalculate(c,'pontos'),/limite/);
});
