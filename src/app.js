/* Executado somente no HTML portátil, sem rede ou APIs do Foundry. */
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session=null,mode='preserve',tab='basico',sourceName='',draftTimer,toastTimer,portraitPreview='';
const DRAFT='tagmar-ficha-bolso-0.1';
const placeholder='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="16" fill="#211a26"/><circle cx="80" cy="57" r="25" fill="#a08c76"/><path d="M30 144v-24a50 50 0 0 1 100 0v24" fill="#a08c76"/></svg>');
function safeImage(src){return /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src??'')?src:placeholder;}
function safeRich(text) {
 const template=document.createElement('template');template.innerHTML=String(text??'');
 const allowed=new Set(['P','BR','STRONG','B','I','EM','U','UL','OL','LI','H2','H3','H4','TABLE','TBODY','THEAD','TR','TD','TH','BLOCKQUOTE','HR']);
 function clean(node){if(node.nodeType===3)return document.createTextNode(node.textContent);if(node.nodeType!==1)return document.createTextNode('');if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','IMG','VIDEO','AUDIO','LINK'].includes(node.tagName))return document.createTextNode('');const target=allowed.has(node.tagName)?document.createElement(node.tagName):document.createDocumentFragment();for(const child of node.childNodes)target.append(clean(child));return target;}
 const wrap=document.createElement('div');for(const child of template.content.childNodes)wrap.append(clean(child));return wrap.innerHTML;
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),6000);}
function fail(error){console.error(error);toast(error.message??String(error));}
function blockHelper(name,fn){Handlebars.registerHelper(name,function(a,b,o){return fn(a,b)?o.fn(this):o.inverse(this);});}
for(const [name,fn] of Object.entries({ifeq:(a,b)=>a==b,ifdf:(a,b)=>a!=b,ifgr:(a,b)=>a>b,ifge:(a,b)=>a>=b,ifle:(a,b)=>a<=b,iflw:(a,b)=>a<b,ifind:(a,b)=>String(a??'').split(',').includes(String(b)),idfind:(a,b)=>!String(a??'').split(',').includes(String(b))}))blockHelper(name,fn);
Handlebars.registerHelper('settingTrue',function(name,o){return mode==='preserve'?o.fn(this):o.inverse(this);});
Handlebars.registerHelper('settingFalse',function(name,o){return mode!=='preserve'?o.fn(this):o.inverse(this);});
Handlebars.registerHelper('soma',(...args)=>args.slice(0,-1).reduce((n,v)=>n+(Number(v)||0),0));
Handlebars.registerHelper('multiplica',(a,b)=>(Number(a)*Number(b)||0).toFixed(2));
Handlebars.registerHelper('toFixed',(a,b)=>(Number(a)||0).toFixed(Number(b)));
Handlebars.registerHelper('pontos_carac',n=>Number(n)>0?3+Math.floor((Number(n)-1)/2):0);
Handlebars.registerHelper('checked',value=>value?'checked':'');
Handlebars.registerHelper('numHab',items=>(items??[]).filter(i=>i.type==='Habilidade'&&i.system.nivel>0).length);
Handlebars.registerHelper('selectOptions',(values,o)=>new Handlebars.SafeString((values??[]).map(v=>{const value=v[o.hash.valueAttr??'key'];return `<option value="${e(value)}" ${String(value)===String(o.hash.selected)?'selected':''}>${e(value)}</option>`;}).join('')));
Handlebars.registerHelper('editor',(value,o)=>new Handlebars.SafeString(`<div class="bio-preview">${safeRich(value)}</div><label>Editar biografia (HTML preservado)<textarea name="${e(o.hash.target)}" rows="12">${e(value)}</textarea></label>`));

function modal(title,body,actions=[]) {
 const dialog=$('#modal');if(dialog.open)dialog.close();$('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-actions').replaceChildren();
 for(const action of actions){const btn=document.createElement('button');btn.textContent=action.label;btn.className=action.primary?'primary':'';btn.addEventListener('click',()=>{try{action.run();}catch(err){fail(err);}});$('#modal-actions').append(btn);}
 dialog.showModal();$('#modal-body').scrollTop=0;
}
const close=()=>$('#modal').close();
$('#modal-close').onclick=close;
function checkpoint(label,edit,{calculate=true}={}) {
 const next=clone(session.actor);edit(next);const result=calculate?recalculate(next,mode):next;
 session.commit(result,label);render();scheduleDraft();
}
function load(raw,name,recovered) {
 validateActor(raw);session=new Session(raw);sourceName=name;tab='basico';portraitPreview='';
 mode='preserve';$('#mode').value=mode;
 if(recovered){session.original=recovered.original;session.saved=recovered.saved??JSON.stringify(recovered.original);mode=recovered.mode;$('#mode').value=mode;}
 $('#welcome').hidden=true;$('#workspace').hidden=false;$('#save').disabled=false;render();
 if(!recovered)toast('Ficha aberta sem alterar os valores. Escolha o modo de cálculos usado na sua mesa.');
}
function render(){
 if(!session)return;const scroll=window.scrollY;
 const actor=viewActor(session.actor);actor.ficha=mode==='sorteio'?'Sorteio':'Pontos';
 actor.img=portraitPreview||safeImage(actor.img);for(const item of actor.items)item.img=safeImage(item.img);
 const effects=rules._preparaEfeitosAtributos({document:actor}).detalhes;
 const context={actor,data:actor,document:actor,items:actor.items,options:{editable:true,owner:true},editable:true,efeitos_atributos:effects,cssClass:'',portraitIsVideo:false,portraitSrc:actor.img};
 $('#sheet-body').innerHTML=TEMPLATES[mode==='sorteio'?'sorteio':'pontos'](context);
 for(const select of $$('#sheet select[name]'))select.value=get(actor,select.name)??'';
 for(const field of $$('#sheet input[name],#sheet textarea[name]')){
  field.setAttribute('aria-label',field.title||field.name.replace('system.',''));
  if(mode==='preserve'&&field.readOnly)field.readOnly=false;
  if(field.type==='number')field.step='any';
 }
 for(const link of $$('#sheet a')){if(!link.href){link.setAttribute('role','button');link.tabIndex=0;}if(link.title?.startsWith('Rolar'))link.title='Consultar / editar (rolagens de mesa no Foundry)';}
 setTab(tab);$('#filename').textContent=sourceName||session.actor.name;$('#save-state').textContent=session.dirty?'● Alterações ainda não exportadas':'Arquivo carregado • edição local';
 $('#actor-caption').textContent=`${session.actor.name} · ${session.actor.items.length} itens`;
 $('#undo').disabled=!session.undoStack.length;$('#redo').disabled=!session.redoStack.length;$('#recalculate').disabled=mode==='preserve';
 const warnings=[];
 if(mode==='preserve')warnings.push('Valores preservados. Selecione pontos ou sorteio para somas automáticas.');
 if(!actor.raca||!actor.profissao)warnings.push('Faltam itens de raça ou profissão; parte dos cálculos e a progressão depende deles.');
 if(session.actor.effects?.length||session.actor.items.some(i=>i.effects?.length))warnings.push('Active Effects e módulos são preservados, mas não executados offline.');
 for(const key of ['pontos_aqui','pontos_comb','pontos_tec','pontos_mag'])if(actor.system[key]<0)warnings.push(`${LABELS[key]}: saldo negativo. Confira com o mestre.`);
 $('#warnings').replaceChildren();for(const warning of warnings){const p=document.createElement('p');p.className='notice';p.textContent=warning;$('#warnings').append(p);}
 requestAnimationFrame(()=>window.scrollTo(0,scroll));
}
function setTab(next){tab=next;for(const panel of $$('#sheet .tab[data-tab]')){panel.classList.toggle('active',panel.dataset.tab===tab);panel.hidden=panel.dataset.tab!==tab;}for(const link of $$('#sheet nav [data-tab]')){link.classList.toggle('active',link.dataset.tab===tab);link.setAttribute('aria-current',link.dataset.tab===tab?'page':'false');}}
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{const draft={actor:session.actor,original:session.original,saved:session.saved,mode,name:sourceName,date:new Date().toISOString()};localStorage.setItem(DRAFT,JSON.stringify(draft));$('#draft-state').textContent='Rascunho local guardado neste navegador. Use Salvar JSON para levar a ficha.';}catch{$('#draft-state').textContent='Não foi possível guardar o rascunho. Salve o JSON antes de fechar.';}},400);}
function replaceAllowed(){return !session?.dirty||confirm('Há alterações ainda não exportadas. Abrir outra ficha mesmo assim?');}
async function openFile(file){if(!file)return;if(file.size>20*1024*1024)throw Error('Limite de 20 MB por ficha.');const raw=parseActor(await file.text());if(replaceAllowed()){load(raw,file.name);scheduleDraft();}}
$('#actor-file').onchange=async event=>{try{await openFile(event.target.files[0]);}catch(err){fail(err);}finally{event.target.value='';}};
for(const id of ['open','welcome-open'])$('#'+id).onclick=()=>$('#actor-file').click();
$('#example').onclick=()=>{if(replaceAllowed()){load(sampleActor(),'personagem-exemplo.json');mode='pontos';$('#mode').value=mode;render();}};
document.addEventListener('dragover',event=>event.preventDefault());document.addEventListener('drop',async event=>{event.preventDefault();if($('#modal').open)return;try{await openFile(event.dataTransfer.files[0]);}catch(err){fail(err);}});
$('#mode').onchange=event=>{mode=event.target.value;render();scheduleDraft();toast(mode==='preserve'?'Valores preservados.':'Modo selecionado. Recalcule para conferir; as próximas edições atualizam as somas.');};
$('#recalculate').onclick=()=>{try{checkpoint('Recalcular ficha',()=>{});toast('Cálculos atualizados. Confira as alterações antes de salvar.');}catch(err){fail(err);}};
$('#undo').onclick=()=>{session.undo();render();scheduleDraft();};$('#redo').onclick=()=>{session.redo();render();scheduleDraft();};
$('#sheet-body').addEventListener('submit',event=>event.preventDefault());
$('#sheet-body').addEventListener('input',event=>{
 const field=event.target;if(!field.matches('input[class*="search"]'))return;
 const query=field.value.trim().toLocaleLowerCase('pt-BR');
 for(const row of field.closest('.tab').querySelectorAll('.item[data-item-id]'))row.classList.toggle('search-match',!!query&&row.textContent.toLocaleLowerCase('pt-BR').includes(query));
});
$('#sheet-body').addEventListener('change',event=>{
 const field=event.target;if(!field.name||field.readOnly)return;
 if(field.name==='grupo_aprim'){try{checkpoint('Escolher grupo aprimorado',a=>set(a,'system.grupo_aprim',field.checked?field.value:''));}catch(err){fail(err);render();}return;}
 try{if(!/^(name|system\.[\w.]+)$/.test(field.name))throw Error('Campo não reconhecido.');const value=field.type==='checkbox'?field.checked:field.type==='number'?Number(field.value):field.value;
 if(field.type==='number'&&(field.value.trim()===''||!Number.isFinite(value)))throw Error('Preencha um número válido.');
 checkpoint(`Editar ${field.name}`,actor=>set(actor,field.name,value));}catch(err){fail(err);render();}
});
$('#sheet-body').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('a[role=button]')){event.preventDefault();event.target.click();}});
$('#sheet-body').addEventListener('click',event=>{
 const link=event.target.closest('a,button,.tagmar-portrait');if(!link)return;
 if(link.closest('nav')&&link.dataset.tab){event.preventDefault();setTab(link.dataset.tab);return;}
 if(link.classList.contains('tagmarlink')){event.preventDefault();showHelp();return;}
 event.preventDefault();try{
  const id=link.closest('.item[data-item-id]')?.dataset.itemId??link.dataset.itemId;
  const item=session.actor.items.find(i=>i._id===id);
  if(link.matches('.tagmar-portrait')){$('#image-file').click();return;}
  if(link.matches('.showImg')){checkpoint('Alternar apresentação de itens',a=>{const groups=String(a.system.combos??'').split(',').filter(Boolean),group=link.dataset.itemId;set(a,'system.combos',groups.includes(group)?groups.filter(g=>g!==group).join(','):[...groups,group].join(','));},{calculate:false});return;}
  if(link.matches('.subir_estagio')){showLevel();return;}
  if(link.matches('.addGrupoArmas,.subGrupoArmas')){const group=link.dataset.itemId;if(!Object.hasOwn(viewActor(session.actor).system.grupos,group))return;checkpoint('Alterar grupo de armas',a=>set(a,'system.grupos.'+group,Math.max(0,Number(get(a,'system.grupos.'+group)??0)+(link.matches('.addGrupoArmas')?1:-1))));return;}
  if(link.matches('.displayRaca,.displayProf')){const type=link.matches('.displayRaca')?'Raca':'Profissao';const found=session.actor.items.find(i=>i.type===type);if(found)editItem(found._id);else createItem(type);return;}
  const createClass={newHabilidade:'Habilidade',newCombat:'Combate',newMagia:'Magia',newPertence:'Pertence',newEfeito:'Efeito'};
  for(const [css,type] of Object.entries(createClass))if(link.classList.contains(css)){createItem(type);return;}
  if(link.className.includes('search')){showItems();return;}
  if(item){
   if(link.matches('.item-delete')){modal('Remover item',`<p>Remover <strong>${e(item.name)}</strong> desta cópia da ficha?</p>`,[{label:'Cancelar',run:close},{label:'Remover',run:()=>{checkpoint('Remover '+item.name,a=>{a.items=a.items.filter(i=>i._id!==id);});close();}}]);return;}
   if(link.matches('.item-copy')){checkpoint('Duplicar '+item.name,a=>{const copy=clone(item);copy._id=globalId();copy.name+=' (cópia)';a.items.push(copy);});return;}
   if(link.matches('.item-equipa,.ativaEfeito,.movePertence')){const key=link.matches('.item-equipa')?'equipado':link.matches('.ativaEfeito')?'ativo':'inTransport';checkpoint('Alterar '+item.name,a=>{const target=a.items.find(i=>i._id===id);set(target,'system.'+key,!target.system[key]);});return;}
   if(link.matches('.item-upp')){checkpoint('Elevar nível de '+item.name,a=>{const target=a.items.find(i=>i._id===id),level=Number(target.system.nivel??0);if(level>=a.system.estagio)throw Error('O nível não pode ultrapassar o estágio.');if(target.type==='Tecnica_Combate'&&Number(target.system.mecanica)===0&&level>=10)throw Error('Esta técnica está limitada ao nível 10.');target.system.nivel=level+1;});return;}
   editItem(id);return;
  }
  if(link.matches('.idiomas')){showLanguages();return;}
  toast('Na versão 0.1, as rolagens e ações da mesa ficam no Foundry. Os valores podem ser editados na ficha.');
 }catch(err){fail(err);}
});
const globalId=id;
function showLanguages(){modal('Idiomas do personagem',`<p>Identificadores dos idiomas, separados por ponto e vírgula, no mesmo formato da ficha Tagmar. Preserve os identificadores personalizados da sua mesa.</p><label>Idiomas<textarea id="language-list" rows="5">${e(session.actor.system.defesa?.categoria??'')}</textarea></label>`,[{label:'Cancelar',run:close},{label:'Salvar idiomas',primary:true,run:()=>{const value=$('#language-list').value.trim();checkpoint('Editar idiomas',a=>set(a,'system.defesa.categoria',value));close();}}]);}
const LABELS={INT:'Intelecto',AUR:'Aura',CAR:'Carisma',FOR:'Força',FIS:'Físico',AGI:'Agilidade',PER:'Percepção',descricao:'Descrição',nivel:'Nível',custo:'Custo',tipo:'Tipo / grupo',atributo:'Atributo',valor:'Valor',quant:'Quantidade',peso:'Peso',preco:'Preço',favorito:'Favorito',inTransport:'No transporte',equipado:'Equipado',ativo:'Ativo',ajuste:'Ajuste',total:'Total',alcance:'Alcance',bonus:'Bônus',penalidade:'Penalidade',bonus_magico:'Bônus mágico',bonus_dano:'Atributo do dano',dano_base:'Dano base',dano:'Dano calculado',forca_min:'Força mínima',def_l:'Defesa leve',def_m:'Defesa média',def_p:'Defesa pesada',pontos_aqui:'Pontos de habilidades',pontos_comb:'Pontos de combate',pontos_tec:'Pontos de técnicas',pontos_mag:'Pontos de magia',especializacoes:'Especializações',lista_eh:'Tabela de EH',p_aquisicao:'Pontos de aquisição',ef_base:'EF base',vb:'VB',mod_racial:'Modificadores raciais',atrib_mag:'Atributo de magia',hab_nata:'Habilidade nata',grupo_pen:'Grupo penalizado',grupo_aprim:'Grupo aprimorado',capacidade:'Capacidade',absorcao:'Absorção',defesa_base:'Defesa base',evocacao:'Evocação',duracao:'Duração',efeito:'Efeito',mecanica:'Mecânica',teste:'Teste',restricao:'Restrição',pre_requisito:'Pré-requisito'};
function fields(value,prefix='system') {
 return Object.entries(value).map(([key,v])=>{
  const field=prefix+'.'+key,label=LABELS[key]??key;
  if(v&&typeof v==='object'&&!Array.isArray(v))return `<fieldset><legend>${e(label)}</legend><div class="field-grid">${fields(v,field)}</div></fieldset>`;
  if(v&&typeof v==='object')return `<label class="wide">${e(label)} (JSON)<textarea data-json="1" data-path="${e(field)}">${e(JSON.stringify(v,null,2))}</textarea></label>`;
  if(typeof v==='boolean')return `<label class="check"><input data-path="${e(field)}" type="checkbox" ${v?'checked':''}>${e(label)}</label>`;
  const multiline=typeof v==='string'&&(v.length>100||/descricao|efeito|tarefAperf/i.test(key));
  return `<label class="${multiline?'wide':''}">${e(label)}${multiline?`<textarea rows="5" data-path="${e(field)}">${e(v)}</textarea>`:`<input type="${typeof v==='number'?'number':'text'}" step="any" data-path="${e(field)}" value="${e(v)}">`}</label>`;
 }).join('');
}
function readFields(target) {
 for(const field of $$('#modal-body [data-path]')){let value;if(field.dataset.json)value=JSON.parse(field.value);else if(field.type==='checkbox')value=field.checked;else if(field.type==='number'){if(!field.value.trim()||!Number.isFinite(Number(field.value)))throw Error('Preencha todos os números.');value=Number(field.value);}else value=field.value;validateTree(value);set(target,field.dataset.path,value);}
}
function editItem(itemId,created){
 const original=created??session.actor.items.find(i=>i._id===itemId);if(!original)return;
 const type=original.type;const system=merge(defaults('Item',type),original.system);
 modal((created?'Novo item: ':'Editar: ')+original.name,`<p class="muted">${e(type)} · Campos não exibidos e dados de módulos serão preservados. Totais são recalculados se o modo de cálculos estiver ativo.</p><label>Nome<input id="item-name" value="${e(original.name)}"></label><label>Caminho da imagem no Foundry<input id="item-img" value="${e(original.img??'')}"></label><details><summary>Ler descrição</summary><div class="bio-preview">${safeRich(system.descricao??'Sem descrição.')}</div></details><div class="field-grid">${fields(system)}</div>`,[{label:'Cancelar',run:close},{label:'Salvar item',primary:true,run:()=>{
  const copy=clone(original);copy.name=$('#item-name').value.trim();if(!copy.name)throw Error('Informe o nome do item.');
  const img=$('#item-img').value;if(img!==(original.img??''))copy.img=img;
  // Grava apenas campos efetivamente editados, sem acrescentar defaults ao JSON original.
  const edited={system:clone(system)};readFields(edited);
  for(const change of changes({system},edited))set(copy,change.path,change.after);
  checkpoint('Salvar '+copy.name,a=>{if(created)a.items.push(copy);else a.items[a.items.findIndex(i=>i._id===itemId)]=copy;});close();
 }}]);
}
function createItem(type){if(type){editItem(null,newItem(type,'Novo item'));return;}modal('Criar item',`<label>Tipo<select id="new-type">${TYPES.map(t=>`<option>${e(t)}</option>`).join('')}</select></label><p>Preencha os dados conforme as regras da sua mesa. Você também pode importar um item exportado do Foundry.</p>`,[{label:'Continuar',primary:true,run:()=>createItem($('#new-type').value)}]);}
function showItems(){modal('Itens da ficha',`<label>Buscar<input id="item-search" placeholder="Nome ou tipo…"></label><div id="item-list">${session.actor.items.map(i=>`<button class="item-list-row" data-edit-item="${e(i._id)}"><strong>${e(i.name)}</strong><span>${e(i.type)}</span></button>`).join('')}</div>`,[{label:'Fechar',run:close},{label:'Criar item',run:()=>createItem()}]);$('#item-search').oninput=event=>{const query=event.target.value.toLocaleLowerCase('pt-BR');for(const row of $$('#item-list button'))row.hidden=!row.textContent.toLocaleLowerCase('pt-BR').includes(query);};}
$('#modal-body').addEventListener('click',event=>{const row=event.target.closest('[data-edit-item]');if(row)editItem(row.dataset.editItem);});
$('#inventory').onclick=showItems;$('#new-item').onclick=()=>createItem();
$('#import-item').onclick=()=>$('#item-file').click();
$('#item-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('Limite de 5 MB por item.');const item=JSON.parse((await file.text()).replace(/^\uFEFF/,''));validateTree(item);if(!TYPES.includes(item.type)||typeof item.name!=='string'||!item.system||typeof item.system!=='object'||Array.isArray(item.system))throw Error('Abra um item Tagmar exportado pelo Foundry.');item._id=id();editItem(null,item);}catch(err){fail(err);}finally{event.target.value='';}};
function showLevel(){
 const stage=session.actor.system.estagio;
 modal('Avançar para o estágio '+(stage+1),`<p>A progressão confere a experiência e usa a tabela de EH da profissão, junto do Físico. Informe o d10 combinado com o mestre.</p><label>Resultado do d10<input id="level-die" type="number" min="1" max="10" step="1" value="5"></label><button id="roll-d10">Sortear d10 local</button><p class="muted">Este sorteio não envia mensagem ao chat e não é uma comprovação para o mestre. Os pontos de aquisição serão recalculados; você escolhe onde gastá-los.</p><div id="level-preview"></div>`,[{label:'Cancelar',run:close},{label:'Aplicar progressão',primary:true,run:()=>{const next=levelUp(session.actor,mode,Number($('#level-die').value));session.commit(next,'Avançar estágio com d10 '+$('#level-die').value);close();render();scheduleDraft();toast('Estágio e EH atualizados. Distribua os pontos e confira as alterações.');}}]);
 const preview=()=>{try{const next=levelUp(session.actor,mode,Number($('#level-die').value));$('#level-preview').textContent=`Estágio ${stage} → ${next.system.estagio} · EH máxima ${session.actor.system.eh.max} → ${next.system.eh.max}`;}catch(err){$('#level-preview').textContent=err.message;}};
 $('#level-die').oninput=preview;$('#roll-d10').onclick=()=>{let b;do{b=crypto.getRandomValues(new Uint8Array(1))[0];}while(b>=250);$('#level-die').value=b%10+1;preview();};preview();
}
$('#level').onclick=showLevel;
function showAdvanced(){modal('Dados avançados da ficha',`<p>Edite o JSON completo desta cópia. Use este espaço para campos especiais e dados de módulos. Nenhum código ou macro será executado.</p><textarea id="advanced-json" rows="20" spellcheck="false">${e(serialize(session.actor))}</textarea>`,[{label:'Cancelar',run:close},{label:'Aplicar JSON',primary:true,run:()=>{const next=parseActor($('#advanced-json').value);session.commit(next,'Editar dados avançados');close();render();scheduleDraft();}}]);}
$('#advanced').onclick=showAdvanced;
function download(name,text,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function fileBase(){return session.actor.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,100)||'personagem';}
function review(exporting=false){const diff=changes(session.original,session.actor);const short=value=>value===undefined?'(ausente)':JSON.stringify(value).slice(0,180);modal(exporting?'Salvar ficha para o Foundry':'Conferir alterações',`<p><strong>${diff.length} alterações</strong> em relação ao arquivo aberto. IDs, flags, efeitos e campos desconhecidos são mantidos, salvo alterações explícitas.</p><p>O arquivo será baixado como uma nova cópia. No Foundry, faça backup e importe primeiro em uma cópia do personagem. Se o mestre editou a ficha depois da sua exportação, compare as duas versões antes de substituir.</p><div class="diff-list">${diff.slice(0,150).map(d=>`<article><b>${e(d.path)}</b><del>${e(short(d.before))}</del><ins>${e(short(d.after))}</ins></article>`).join('')||'<p>Nenhuma alteração.</p>'}${diff.length>150?'<p>Lista reduzida a 150 campos. O relatório JSON contém todas as alterações.</p>':''}</div>`,[{label:'Fechar',run:close},{label:'Baixar relatório',run:()=>download(fileBase()+'-alteracoes.json',JSON.stringify({editor:VERSION,date:new Date().toISOString(),source:sourceName,changes:diff},null,2))},...(exporting?[{label:'Baixar JSON da ficha',primary:true,run:()=>{download(fileBase()+'-editado.json',serialize(session.actor));session.saved=JSON.stringify(session.actor);close();render();scheduleDraft();toast('Download solicitado. Confira o arquivo na pasta Downloads.');}}]:[])]);}
$('#review').onclick=()=>review();$('#save').onclick=()=>review(true);
$('#portrait').onclick=()=>$('#image-file').click();$('#image-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>4*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use PNG, JPEG ou WebP de até 4 MB.');portraitPreview=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});render();toast('Retrato carregado apenas para visualização local. O caminho da imagem no Foundry foi preservado.');}catch(err){fail(err);}finally{event.target.value='';}};
$('#print').onclick=()=>window.print();
function showHelp(){modal('Como usar a Ficha de Bolso',`<ol><li>No Foundry, exporte os dados do ator <b>Personagem</b> em JSON.</li><li>Abra o arquivo aqui. A leitura inicial preserva os valores.</li><li>Selecione <b>Por pontos</b> ou <b>Por sorteio</b>, conforme sua mesa, e clique em Recalcular. Se sua mesa usa ajustes manuais, mantenha Preservar valores.</li><li>Edite as abas. Clique no lápis ou no nome de um item para abrir todos os campos. Importe itens de JSON ou crie entradas manualmente.</li><li>Use <b>Avançar estágio</b> para conferir experiência e ganho de EH pela profissão.</li><li>Clique em <b>Salvar JSON</b>, revise as alterações e baixe o arquivo.</li><li>No Foundry, importe primeiro em uma cópia da ficha e confira com o mestre.</li></ol><h3>O que esta versão faz</h3><p>Reaproveita os templates e as fórmulas do Tagmar. Funciona offline e mantém IDs, flags, Active Effects e outros dados do arquivo. O rascunho fica neste navegador quando há espaço disponível.</p><h3>Limites da 0.1</h3><p>Não inclui biblioteca de compêndios, macros, rolagens de mesa, recursos de módulos, temas ilustrados nem execução de Active Effects do Foundry. Itens do tipo Efeito do próprio Tagmar participam dos cálculos. Recursos de módulos podem alterar os valores ao reimportar. O editor não sincroniza com a mesa nem resolve conflitos automaticamente.</p><p>O retrato local serve só para visualização. O caminho original da imagem continua no JSON. O editor usa o tema escuro e a estrutura das fichas do sistema; não reproduz toda a interface do Foundry.</p><p>Créditos: fichas e código Tagmar por Marcos Walker e Vinicius Fernandez; adaptação portátil 0.1 assistida por Codex. Código derivado GPL-3.0-or-later; conteúdo Tagmar CC BY-NC-SA 3.0 BR. Handlebars: licença MIT. Nenhum código do core do Foundry está incluído.</p>`,[{label:'Entendi',primary:true,run:close}]);}
$('#help').onclick=showHelp;
document.addEventListener('click',event=>{const button=event.target.closest('[data-tip]');if(button)modal('Sobre os cálculos',`<p>${e(button.dataset.tip)}</p>`,[{label:'Entendi',run:close}]);});
window.addEventListener('beforeunload',event=>{if(session?.dirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&session){event.preventDefault();if(!$('#modal').open)review(true);}});
try{const draft=JSON.parse(localStorage.getItem(DRAFT)??'null');if(draft){validateActor(draft.actor);validateActor(draft.original);if(!['preserve','pontos','sorteio'].includes(draft.mode))throw Error('Modo inválido');$('#recovery').innerHTML=`<p>Rascunho encontrado: <strong>${e(draft.actor.name)}</strong></p><button id="restore">Recuperar rascunho</button> <button id="forget">Apagar rascunho</button>`;$('#restore').onclick=()=>load(draft.actor,draft.name,draft);$('#forget').onclick=()=>{localStorage.removeItem(DRAFT);$('#recovery').replaceChildren();};}}catch{ /* armazenamento indisponível não impede abrir e salvar arquivos */ }
