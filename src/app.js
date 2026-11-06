/* Executado somente no HTML portátil, sem rede ou APIs do Foundry. */
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const editorLogo = $(".brand-logo").src;
let session=null,mode='preserve',tab='basico',sourceName='',draftTimer,toastTimer,portraitPreview='';
let newSheet=false;
const DRAFT='tagmar-ficha-bolso-0.1'; // Mantém acesso aos rascunhos da prévia no mesmo caminho.
const placeholder='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="16" fill="#211a26"/><circle cx="80" cy="57" r="25" fill="#a08c76"/><path d="M30 144v-24a50 50 0 0 1 100 0v24" fill="#a08c76"/></svg>');
function safeImage(src){return /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(src??'')?src:placeholder;}
function safeRich(text) {
 const template=document.createElement('template');template.innerHTML=String(text??'');
 const allowed=new Set(['P','DIV','BR','STRONG','B','I','EM','U','S','UL','OL','LI','H1','H2','H3','H4','H5','H6','TABLE','TBODY','THEAD','TFOOT','TR','TD','TH','BLOCKQUOTE','HR']);
 function clean(node){if(node.nodeType===3)return document.createTextNode(node.textContent);if(node.nodeType!==1)return document.createTextNode('');if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','IMG','VIDEO','AUDIO','LINK'].includes(node.tagName.toUpperCase()))return document.createTextNode('');const target=allowed.has(node.tagName)?document.createElement(node.tagName):document.createDocumentFragment();for(const child of node.childNodes)target.append(clean(child));return target;}
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
Handlebars.registerHelper('editorLogo',()=>editorLogo);
function isNativeSkill(item,actor){
 return item.type==='Habilidade' && actor.profissao && item.name===actor.system.hab_nata
  && item.system.tipo!==actor.profissao.system.grupo_pen;
}
Handlebars.registerHelper('numHab',actor=>actor.habilidades.filter(item=>item.system.nivel>0&&!isNativeSkill(item,actor)).length);
function itemLevelBlock(item,actor,delta){
 const level=Number(item.system.nivel??0);
 if(!Number.isInteger(level))return 'Confira o nível na edição do item.';
 if(mode!=='preserve' && isNativeSkill(item,actor)){
  return 'O nível da habilidade nata acompanha o estágio.';
 }
 if(delta<0)return level<=0?'O item já está no nível zero.':'';
 if(level>=actor.system.estagio)return 'O nível do item já alcançou o estágio do personagem.';
 if(item.type==='Tecnica_Combate' && Number(item.system.mecanica??0)===0 && level>=10){
  return 'Técnicas de bônus de FA têm limite de nível 10.';
 }
 return '';
}
Handlebars.registerHelper('itemLevelControls',(item,actor)=>{
 const button=(delta,verb,symbol,css)=>{
  const label=`${verb} nível de ${item.name}`;
  const reason=itemLevelBlock(item,actor,delta);
  const title=reason||`${label} (nível atual ${item.system.nivel??0})`;
  return `<button type="button" class="item-level ${css}" aria-label="${e(label)}" title="${e(title)}"${reason?' disabled':''}>${symbol}</button>`;
 };
 return new Handlebars.SafeString(button(1,'Aumentar','+','item-upp')+button(-1,'Reduzir','−','item-down'));
});
Handlebars.registerHelper('selectOptions',(values,o)=>new Handlebars.SafeString((values??[]).map(v=>{const value=v[o.hash.valueAttr??'key'];return `<option value="${e(value)}" ${String(value)===String(o.hash.selected)?'selected':''}>${e(value)}</option>`;}).join('')));
Handlebars.registerHelper('editor',value=>new Handlebars.SafeString(
 `<div class="bio-preview" role="region" aria-label="Biografia" tabindex="0">${safeRich(value) || 'Biografia ainda vazia.'}</div><button type="button" class="edit-biography">Editar biografia</button>`));

const richInitial = new WeakMap();
const richCommands = [
 ["bold", "Negrito"],
 ["italic", "Itálico"],
 ["insertUnorderedList", "Lista com marcadores"],
 ["insertOrderedList", "Lista numerada"]
];

function richEditor(value, label, path = "") {
 const toolbar = richCommands.map(([command, name]) =>
  `<button type="button" data-format="${command}">${name}</button>`).join("");
 return `<section class="rich-field wide">
  <strong>${e(label)}</strong>
  <div class="rich-toolbar" role="group" aria-label="Formatação de ${e(label)}">${toolbar}</div>
  <div class="rich-content" role="textbox" aria-label="${e(label)}" aria-multiline="true"
   contenteditable="true" ${path ? `data-path="${e(path)}"` : ""}>${safeRich(value)}</div>
 </section>`;
}

function bindRichEditors(root) {
 for (const group of root.querySelectorAll(".rich-field")) {
  const editor = group.querySelector(".rich-content");
  if (editor.dataset.path === "system.efeito") {
   for (const heading of editor.querySelectorAll("br + b, br + strong")) {
    if (/\s\d+\s*:/.test(heading.textContent) && !heading.previousElementSibling.matches("br + br")) {
     heading.classList.add("spell-level");
    }
   }
  }
  richInitial.set(editor, editor.innerHTML);
  for (const button of group.querySelectorAll("[data-format]")) {
   button.addEventListener("mousedown", event => event.preventDefault());
   button.addEventListener("click", () => {
    editor.focus({preventScroll: true});
    document.execCommand(button.dataset.format, false);
   });
  }
  editor.addEventListener("paste", event => {
   event.preventDefault();
   const html = event.clipboardData.getData("text/html");
   if (html) document.execCommand("insertHTML", false, safeRich(html));
   else document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  });
  editor.addEventListener("drop", event => event.preventDefault());
 }
}

function readRich(editor) {
 if (editor.innerHTML === richInitial.get(editor)) return undefined;
 if (!editor.textContent.trim() && !editor.querySelector("table, hr")) return "";
 return safeRich(editor.innerHTML);
}

function richField(key, value) {
 return typeof value === "string" && (/^(descricao|efeito|tarefAperf|complemento|restricao)$/i.test(key)
  || /<\/?[a-z][\w:-]*(?:\s[^<>]*?)?\/?>/i.test(value));
}

function showBiography() {
 modal("Editar biografia", richEditor(session.actor.system.descricao, "Biografia"), [
  {label: "Cancelar", run: close},
  {label: "Salvar biografia", primary: true, run: () => {
   const value = readRich($("#modal-body .rich-content"));
   if (value !== undefined) checkpoint("Editar biografia", actor => set(actor, "system.descricao", value), {calculate: false});
   close();
  }}
 ]);
}

function reviewValue(value, path) {
 if (value === undefined) return "(ausente)";
 if (richField(path.split(".").at(-1), value)) {
  const template = document.createElement("template");
  template.innerHTML = safeRich(value).replace(/<(?:br\b[^>]*|\/(?:p|div|li|tr))>/gi, " ");
  return template.content.textContent.replace(/\s+/g, " ").trim().slice(0, 180) || "(vazio)";
 }
 return JSON.stringify(value).slice(0, 180);
}

function modal(title,body,actions=[]) {
 hideHelpTip();
 const dialog=$('#modal');if(dialog.open)dialog.close();$('#modal-title').textContent=title;$('#modal-body').innerHTML=body;$('#modal-actions').replaceChildren();
 for(const action of actions){const btn=document.createElement('button');btn.textContent=action.label;btn.className=action.primary?'primary':'';btn.addEventListener('click',()=>{try{action.run();}catch(err){fail(err);}});$('#modal-actions').append(btn);}
 bindRichEditors($('#modal-body'));
 dialog.showModal();$('#modal-body').scrollTop=0;
}
const close=()=>$('#modal').close();
$('#modal-close').onclick=close;
function checkpoint(label,edit,{calculate=true}={}) {
 const next=clone(session.actor);edit(next);const result=calculate?calculateDraft(next,mode):next;
 session.commit(result,label);render();scheduleDraft();
}
function calculateDraft(raw,calculationMode) {
 const result=recalculate(raw,calculationMode,{initialEh:newSheet});
 if(!newSheet||calculationMode==='preserve')return result;
 const sheetClass=calculationMode==='pontos'?'tagmar.tagmarAltSheet':'tagmar.tagmarActorSheet';
 set(result,'flags.core.sheetClass',sheetClass);
 if(result.system.estagio===1){
  for(const key of ['ef','eh','karma','absorcao']){
   const previous=session.actor.system[key];
   if(previous?.value===previous?.max && raw.system[key]?.value===previous?.value){
    result.system[key].value=Math.max(0,result.system[key].max);
   }
  }
 }
 return result;
}
function load(raw,name,recovered,{created=false}={}) {
 validateActor(raw);session=new Session(raw);sourceName=name;tab='basico';portraitPreview='';
 newSheet=recovered?.newSheet===true||created;
 if(created)session.saved='';
 mode='preserve';$('#mode').value=mode;
 if(recovered){session.original=recovered.original;session.saved=recovered.saved??JSON.stringify(recovered.original);mode=recovered.mode;$('#mode').value=mode;}
 $('#welcome').hidden=true;$('#workspace').hidden=false;$('#save').disabled=false;$('#new-actor').hidden=false;render();
}
function render(){
 if(!session)return;const scroll=window.scrollY;
 hideHelpTip();
 const actor=viewActor(session.actor);actor.ficha=mode==='sorteio'?'Sorteio':'Pontos';
 actor.img=portraitPreview||safeImage(actor.img);for(const item of actor.items)item.img=safeImage(item.img);
 const effects=rules._preparaEfeitosAtributos({document:actor}).detalhes;
 const xp=actor.system.pontos_estagio;
 const canAdvance=actor.system.estagio<100 && Number(xp.value)>=Number(xp.next);
 const context={actor,data:actor,document:actor,items:actor.items,options:{editable:true,owner:true},editable:true,efeitos_atributos:effects,cssClass:'',portraitIsVideo:false,portraitSrc:actor.img,canAdvance};
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
 $('#undo').disabled=!session.undoStack.length;$('#redo').disabled=!session.redoStack.length;
 $('#calculation-status').textContent=mode==='preserve'?'Edição manual · totais preservados':'Recálculo automático ativo';
 const warnings=[];
 if(!actor.raca||!actor.profissao)warnings.push('Faltam itens de raça ou profissão; parte dos cálculos e a progressão depende deles.');
 if(session.actor.effects?.length||session.actor.items.some(i=>i.effects?.length))warnings.push('Active Effects e módulos são preservados, mas não executados offline.');
 for(const key of ['pontos_aqui','pontos_comb','pontos_tec','pontos_mag'])if(actor.system[key]<0)warnings.push(`${LABELS[key]}: saldo negativo. Confira com o mestre.`);
 $('#warnings').replaceChildren();for(const warning of warnings){const p=document.createElement('p');p.className='notice';p.textContent=warning;$('#warnings').append(p);}
 requestAnimationFrame(()=>window.scrollTo(0,scroll));
}
function setTab(next){tab=next;for(const panel of $$('#sheet .tab[data-tab]')){panel.classList.toggle('active',panel.dataset.tab===tab);panel.hidden=panel.dataset.tab!==tab;}for(const link of $$('#sheet nav [data-tab]')){link.classList.toggle('active',link.dataset.tab===tab);link.setAttribute('aria-current',link.dataset.tab===tab?'page':'false');}}
function scheduleDraft(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>{try{const draft={actor:session.actor,original:session.original,saved:session.saved,mode,newSheet,name:sourceName,date:new Date().toISOString()};localStorage.setItem(DRAFT,JSON.stringify(draft));$('#draft-state').textContent='Rascunho local guardado neste navegador. Use Salvar JSON para levar a ficha.';}catch{$('#draft-state').textContent='Não foi possível guardar o rascunho. Salve o JSON antes de fechar.';}},400);}
function replaceAllowed(){return !session?.dirty||confirm('Há alterações ainda não exportadas. Abrir outra ficha mesmo assim?');}
async function openFile(file){
 if(!file)return;
 if(file.size>20*1024*1024)throw Error('Limite de 20 MB por ficha.');
 const raw=parseActor(await file.text());
 if(!replaceAllowed())return;
 load(raw,file.name);
 scheduleDraft();
 chooseCalculationMode();
}
$('#actor-file').onchange=async event=>{try{await openFile(event.target.files[0]);}catch(err){fail(err);}finally{event.target.value='';}};
for(const id of ['open','welcome-open'])$('#'+id).onclick=()=>$('#actor-file').click();
$('#example').onclick=()=>{if(replaceAllowed()){load(sampleActor(),'personagem-exemplo.json');applyCalculationMode('pontos');}};
function createCharacter(){
 if(!replaceAllowed())return;
 modal('Criar personagem',`<label>Nome<input id="character-name" maxlength="100" placeholder="Nome do personagem"></label>
  <label>Sistema do mundo<select id="character-system"><option value="tagmar3er-oficial">Tagmar 3ER Oficial</option><option value="tagmar_rpg">Tagmar XXX</option></select></label>
  <label>Cálculo dos atributos<select id="character-mode"><option value="pontos">Por pontos</option><option value="sorteio">Por sorteio</option></select></label>
  <p>O personagem começa no estágio 1. Escolha uma raça e uma profissão no Compêndio e preencha os atributos conforme sua mesa.</p>`, [
  {label:'Cancelar',run:close},
  {label:'Criar ficha',primary:true,run:()=>{
   const name=$('#character-name').value.trim();
   if(!name){toast('Informe o nome do personagem.');$('#character-name').focus();return;}
   const calculationMode=$('#character-mode').value;
   const actor=newCharacter(name,$('#character-system').value);
   close();
   load(actor,name,null,{created:true});
   applyCalculationMode(calculationMode);
   setItemPanel('catalog');
   $('#catalog-type').value='01';
   $('#catalog-search').value='';
   resetCatalogFolder();
  }}
 ]);
 $('#character-name').focus();
}
for(const id of ['new-character','new-actor'])$('#'+id).onclick=createCharacter;
function selectMode(value) {
 mode=value;
 $('#mode').value=mode;
 render();
 scheduleDraft();
}
function applyCalculationMode(value){
 if(value!=='preserve')session.commit(calculateDraft(session.actor,value),'Aplicar modo de cálculo');
 selectMode(value);
}
function chooseCalculationMode(){
 const choose=value=>{
  applyCalculationMode(value);
  close();
 };
 modal('Como sua mesa calcula a ficha?', '<p>Escolha o mesmo modo usado no Foundry. A ficha recalcula os totais agora e quando você termina de editar um campo ou salva um item. Para uma ficha com ajustes manuais, escolha Preservar valores.</p>', [
  {label:'Preservar valores',run:()=>choose('preserve')},
  {label:'Por pontos',run:()=>choose('pontos')},
  {label:'Por sorteio',run:()=>choose('sorteio')}
 ]);
}
$('#mode').onchange=event=>{
 try{applyCalculationMode(event.target.value);}
 catch(err){event.target.value=mode;fail(err);}
};
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
$('#sheet-body').addEventListener('keydown',event=>{
 if(event.key!=='Enter')return;
 if(event.target.matches('input[name]:not([type="checkbox"],[readonly])')){
  event.preventDefault();
  event.target.blur();
 }else if(event.target.matches('a[role=button]')){
  event.preventDefault();
  event.target.click();
 }
});
// Confirme o campo no clique, antes de reconstruir a ficha e remover o controle clicado.
$('#sheet-body').addEventListener('mousedown',event=>{
 if(event.button===0 && event.target.closest('a,button,.tagmar-portrait') && document.activeElement.matches('#sheet input[name],#sheet textarea[name]'))event.preventDefault();
});
$('#sheet-body').addEventListener('click',event=>{
 const link=event.target.closest('a,button,.tagmar-portrait');if(!link)return;
 if(document.activeElement.matches('#sheet input[name],#sheet textarea[name]'))document.activeElement.blur();
 if(link.closest('nav')&&link.dataset.tab){event.preventDefault();setTab(link.dataset.tab);return;}
 if(link.classList.contains('tagmarlink')){event.preventDefault();showHelp();return;}
 event.preventDefault();try{
  const id=link.closest('.item[data-item-id]')?.dataset.itemId??link.dataset.itemId;
  const item=session.actor.items.find(i=>i._id===id);
  if(link.matches('.tagmar-portrait')){$('#image-file').click();return;}
  if(link.matches('.showImg')){checkpoint('Alternar apresentação de itens',a=>{const groups=String(a.system.combos??'').split(',').filter(Boolean),group=link.dataset.itemId;set(a,'system.combos',groups.includes(group)?groups.filter(g=>g!==group).join(','):[...groups,group].join(','));},{calculate:false});return;}
  if(link.matches('.edit-biography')){showBiography();return;}
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
   if(link.matches('.item-level')){
    const delta=link.matches('.item-upp')?1:-1;
    const actor=viewActor(session.actor);
    const current=actor.items.find(candidate=>candidate.id===id);
    const reason=itemLevelBlock(current,actor,delta);
    if(reason){toast(reason);return;}
    const level=Math.max(0,Number(current.system.nivel??0))+delta;
    checkpoint(`Alterar nível de ${item.name} para ${level}`,a=>set(a.items.find(candidate=>candidate._id===id),'system.nivel',level));
    return;
   }
   editItem(id);return;
  }
  if(link.matches('.idiomas')){showLanguages();return;}
  toast('As rolagens e ações da mesa ficam no Foundry. Você pode editar os valores na ficha.');
 }catch(err){fail(err);}
});
const globalId=id;
function showLanguages(){modal('Idiomas do personagem',`<p>Identificadores dos idiomas, separados por ponto e vírgula, no mesmo formato da ficha Tagmar. Preserve os identificadores personalizados da sua mesa.</p><label>Idiomas<textarea id="language-list" rows="5">${e(session.actor.system.defesa?.categoria??'')}</textarea></label>`,[{label:'Cancelar',run:close},{label:'Salvar idiomas',primary:true,run:()=>{const value=$('#language-list').value.trim();checkpoint('Editar idiomas',a=>set(a,'system.defesa.categoria',value));close();}}]);}
const LABELS={INT:'Intelecto',AUR:'Aura',CAR:'Carisma',FOR:'Força',FIS:'Físico',AGI:'Agilidade',PER:'Percepção',descricao:'Descrição',nivel:'Nível',custo:'Custo',tipo:'Tipo / grupo',atributo:'Atributo',valor:'Valor',quant:'Quantidade',peso:'Peso',preco:'Preço',favorito:'Favorito',inTransport:'No transporte',equipado:'Equipado',ativo:'Ativo',ajuste:'Ajuste',total:'Total',alcance:'Alcance',bonus:'Bônus',penalidade:'Penalidade',bonus_magico:'Bônus mágico',bonus_dano:'Atributo do dano',dano_base:'Dano base',dano:'Dano calculado',forca_min:'Força mínima',def_l:'Defesa leve',def_m:'Defesa média',def_p:'Defesa pesada',pontos_aqui:'Pontos de habilidades',pontos_comb:'Pontos de combate',pontos_tec:'Pontos de técnicas',pontos_mag:'Pontos de magia',especializacoes:'Especializações',lista_eh:'Tabela de EH',p_aquisicao:'Pontos de aquisição',ef_base:'EF base',vb:'VB',mod_racial:'Modificadores raciais',atrib_mag:'Atributo de magia',hab_nata:'Habilidade nata',grupo_pen:'Grupo penalizado',grupo_aprim:'Grupo aprimorado',capacidade:'Capacidade',absorcao:'Absorção',defesa_base:'Defesa base',evocacao:'Evocação',duracao:'Duração',efeito:'Efeito',mecanica:'Mecânica',teste:'Teste',restricao:'Restrição',complemento:'Complemento',tarefAperf:'Tarefa de aperfeiçoamento',pre_requisito:'Pré-requisito'};
const ITEM_FIELDS = {
 Combate: ["alcance", "municao", "nivel", "bonus", "tipo", "bonus_dano", "bonus_magico", "peso",
  "def_l", "def_m", "def_p", ["Penalidades", "penalidade.p25", "penalidade.p50", "penalidade.p75", "penalidade.p100"], "favorito"],
 Magia: ["custo", "nivel", "total.valor", "total.valorKarma", "favorito", "efeito"],
 Habilidade: ["tipo", "custo", "ajuste.atributo", "nao_rolar_sem_nivel", "ajuste.valor", "nivel", "penalidade", "bonus", "total", "tarefAperf"],
 Defesa: ["defesa_base.tipo", "defesa_base.valor", "fis_min", "peso", "absorcao", "for_min", "equipado", "descricao"],
 Transporte: ["capacidade.carga", "capacidade.pessoas", "preco", "descricao"],
 Pertence: ["quant", "peso", "preco", "inTransport", "descricao"],
 Profissao: [["Tabela de EH", "lista_eh.v1", "lista_eh.v2", "lista_eh.v3", "lista_eh.v4"],
  ["Pontos de aquisição", "p_aquisicao.p_hab", "p_aquisicao.p_tec", "p_aquisicao.p_gra"],
  "grupo_aprim", "atrib_mag", "grupo_pen", "hab_nata", "eh_base", "especializacoes"],
 Raca: ["ef_base", "vb", ["Modificadores raciais", ...ATTRS.map(key => "mod_racial." + key)], "descricao"],
 Efeito: ["atributo", "tipo", "valor", "ativo"],
 Tecnica_Combate: ["custo", "nivel", "fa", "mecanica", "ajuste.atributo", "teste", "restricao",
  ["Pré-requisito", "pre_requisito.valor", "pre_requisito.tecnica"], "complemento", "bonus",
  ["Duração", "duracao.valor", "duracao.tipo"], "favorito", "descricao"]
};
const ITEM_TABS = new Set(["Combate", "Habilidade", "Profissao"]);
const ITEM_UI = {
 Combate: {label:"Combate", group:"Armas e ataques", tab:"combate"},
 Magia: {label:"Magia", group:"Magias", tab:"magia"},
 Habilidade: {label:"Habilidade", group:"Habilidades", tab:"habilidades"},
 Defesa: {label:"Defesa", group:"Equipamentos de defesa", tab:"combate"},
 Transporte: {label:"Transporte", group:"Transportes", tab:"pertences"},
 Pertence: {label:"Pertence", group:"Pertences", tab:"pertences"},
 Profissao: {label:"Profissão", group:"Profissões", tab:"basico"},
 Raca: {label:"Raça", group:"Raças", tab:"basico"},
 Efeito: {label:"Efeito", group:"Efeitos", tab:"efeitos"},
 Tecnica_Combate: {label:"Técnica de combate", group:"Técnicas de combate", tab:"combate"}
};
const itemLabel=type=>Object.hasOwn(ITEM_UI,type)?ITEM_UI[type].label:type;
const FIELD_LABELS = {
 "total.valor": "Total", "total.valorKarma": "Karma Adicional",
 "defesa_base.tipo": "Categoria da defesa", "defesa_base.valor": "Valor da defesa",
 "ajuste.atributo": "Atributo do ajuste", "ajuste.valor": "Valor do ajuste",
 "capacidade.carga": "Carga (kg)", "capacidade.pessoas": "Pessoas",
 "pre_requisito.valor": "Exige técnica?", "pre_requisito.tecnica": "Técnica exigida",
 "duracao.valor": "Quantidade", "duracao.tipo": "Unidade",
 "lista_eh.v1": "d10 de 1 a 2", "lista_eh.v2": "d10 de 3 a 5",
 "lista_eh.v3": "d10 de 6 a 8", "lista_eh.v4": "d10 de 9 a 10",
 "p_aquisicao.p_hab": "Habilidades", "p_aquisicao.p_tec": "Técnicas",
 "p_aquisicao.p_gra": "Grupos de armas",
 municao: "Munição", fis_min: "Físico mínimo", for_min: "Força mínima", fa: "FA", eh_base: "EH base",
 nao_rolar_sem_nivel: "Impedir rolagem sem nível",
 ...Object.fromEntries([25, 50, 75, 100].map(percent => ["penalidade.p" + percent, percent + "%"]))
};
const COMBAT_LABELS = {
 bonus: "Bônus", bonus_dano: "Bônus de dano", bonus_magico: "Coluna+", peso: "Dano+",
 def_l: "L", def_m: "M", def_p: "P"
};
const READ_ONLY_FIELDS = {Combate: "municao", Magia: "total.valor", Habilidade: "total", Tecnica_Combate: "fa"};
const ATTACK_ATTRIBUTES = ["", "AUR", "FOR", "AGI", "PER"];
const ATTRIBUTE_OPTIONS = ["", ...ATTRS];
const SKILL_GROUPS = [
 ["profissional", "Profissional"], ["manobra", "Manobra"], ["conhecimento", "Conhecimento"],
 ["subterfugio", "Subterfúgio"], ["influencia", "Influência"], ["geral", "Geral"]
];
const FIELD_OPTIONS = {
 Combate: {bonus: ATTACK_ATTRIBUTES, bonus_dano: ATTACK_ATTRIBUTES, tipo: ["", "CD", "CI", "CL", "CLD", "EL", "CmE", "CmM", "EM", "PmA", "PmL", "CpE", "CpM", "EP", "PP", "PpA", "PpB"]},
 Defesa: {"defesa_base.tipo": ["", "L", "M", "P"]},
 Efeito: {atributo: [...ATTRS, "EF", "ABS", "DEF", "KMA", "VB", "RFIS", "RMAG", "PHAB", "PTEC", "PARM", "PMAG"],
  tipo: ["+", "-", "/", "*"]},
 Habilidade: {tipo: SKILL_GROUPS, "ajuste.atributo": ATTRIBUTE_OPTIONS},
 Profissao: {atrib_mag: ATTRIBUTE_OPTIONS, grupo_pen: ["", ...SKILL_GROUPS]},
 Tecnica_Combate: {mecanica: [[0, "Bônus de FA"], [1, "Efeito de nível"], [2, "Rolamento de dados"], [3, "Bônus especiais"], [4, "Aprimoramento de técnica"]],
  "ajuste.atributo": ATTRIBUTE_OPTIONS, "duracao.tipo": ["Ataque(s)", "Rodada(s)", "Combate"],
  teste: ["Não", "Sim"], complemento: ["Não", "Sim"], "pre_requisito.valor": ["Não", "Sim"],
  "pre_requisito.tecnica": () => ["", ...new Set(session.actor.items
   .filter(item => item.type === "Tecnica_Combate" && item.system.complemento === "Sim")
   .map(item => item.name))]
 }
};

function itemFields(paths, system, type) {
 return paths.map(path => {
  if (Array.isArray(path)) {
   const [label, ...children] = path;
   return `<fieldset><legend>${e(label)}</legend><div class="field-grid">${itemFields(children, system, type)}</div></fieldset>`;
  }
  const key = path.split(".").at(-1);
  const value = get(system, path);
  if (value !== null && typeof value === "object") return "";
  const label = type === "Efeito" && path === "tipo" ? "Operação"
   : (type === "Combate" ? COMBAT_LABELS[path] : undefined) ?? FIELD_LABELS[path] ?? LABELS[key] ?? key;
  const data = `data-path="system.${e(path)}"`;
  if (path === READ_ONLY_FIELDS[type]) return `<label>${e(label)}<input value="${e(value)}" readonly></label>`;
  if (["descricao", "efeito", "tarefAperf"].includes(path)) return richEditor(value, label, "system." + path);
  // A ficha de Defesa do Tagmar usa o campo legado peso como indicador de absorção mágica.
  if (type === "Defesa" && path === "peso") return `<label class="check"><input ${data} data-numeric-toggle type="checkbox" ${Number(value) ? "checked" : ""}>Absorção mágica</label>`;
  const fieldOptions = FIELD_OPTIONS[type]?.[path];
  const options = typeof fieldOptions === "function" ? fieldOptions() : fieldOptions;
  if (options) {
   const entries = options.map(option => Array.isArray(option) ? option : [option, LABELS[option] ?? option]);
   const selected = String(value ?? "");
   if (!entries.some(([key]) => String(key) === selected)) entries.unshift([selected, selected]);
   return `<label>${e(label)}<select ${data} ${typeof value === "number" ? 'data-number="true"' : ""}>${entries.map(([key, name]) =>
    `<option value="${e(key)}" ${String(key) === selected ? "selected" : ""}>${e(name || "—")}</option>`).join("")}</select></label>`;
  }
  if (typeof value === "boolean" || path === "favorito") return `<label class="check"><input ${data} type="checkbox" ${value ? "checked" : ""}>${e(label)}</label>`;
  const isNumber = typeof value === "number" || (value == null && typeof get(defaults("Item", type), path) === "number");
  return `<label>${e(label)}<input type="${isNumber ? "number" : "text"}" step="any" ${data} value="${e(value)}"></label>`;
 }).join("");
}

function combatDamage(system) {
 const percentages = Array.from({length: 12}, (_, index) => (index + 1) * 25);
 return `<div class="wide item-damage" role="region" aria-label="Tabela de dano" tabindex="0"><table>
  <caption>Dano</caption><thead><tr><td></td>${percentages.map(percent => `<th scope="col">${percent}%</th>`).join("")}</tr></thead>
  <tbody><tr><th scope="row">Base</th>${percentages.map(percent => `<td><input type="number" step="any" aria-label="Dano base ${percent}%" data-path="system.dano_base.d${percent}" value="${e(system.dano_base["d" + percent])}"></td>`).join("")}</tr>
  <tr><th scope="row">Calculado</th>${percentages.map(percent => `<td>${e(system.dano["d" + percent])}</td>`).join("")}</tr></tbody>
 </table></div>`;
}

function itemSheet(type, system) {
 const fields = Object.hasOwn(ITEM_FIELDS, type) ? ITEM_FIELDS[type] : ["descricao"].filter(path => typeof system[path] === "string");
 const combat = type === "Combate";
 const basic = combat
  ? itemFields(fields.slice(0, -2), system, type) + combatDamage(system) + itemFields(fields.slice(-2), system, type)
  : itemFields(fields, system, type);
 const panel = `<div class="field-grid" data-item-panel="basico">${basic}</div>`;
 if (!ITEM_TABS.has(type)) return panel;
 return `<nav class="item-tabs" aria-label="Seções do item">
  <button type="button" data-item-tab="basico" aria-pressed="true">Básico</button>
  <button type="button" data-item-tab="descricao" aria-pressed="false">Descrição</button>
 </nav>${panel}<div class="field-grid" data-item-panel="descricao" hidden>${itemFields(["descricao"], system, type)}</div>`;
}
function readFields(target) {
 for (const field of $$('#modal-body [data-path]')) {
  if (field.matches('select') && field.selectedOptions[0]?.defaultSelected) continue;
  let value;
  if (field.matches('.rich-content')) {
   value = readRich(field);
   if (value === undefined) continue;
  } else if (field.type === 'checkbox') {
   if (field.checked === field.defaultChecked) continue;
   value = field.hasAttribute('data-numeric-toggle') ? Number(field.checked) : field.checked;
  } else if (field.type === 'number' || field.dataset.number) {
   if (field.type === 'number' && field.value === field.defaultValue) continue;
   if (!field.value.trim() || !Number.isFinite(Number(field.value))) throw Error('Preencha todos os números.');
   value = Number(field.value);
  } else value = field.value;
  validateTree(value);
  set(target, field.dataset.path, value);
 }
}
function editItem(itemId,created,{openTabOnSave=false}={}){
 const original=created??session.actor.items.find(i=>i._id===itemId);if(!original)return;
 const type=original.type;const system=merge(defaults('Item',type),original.system);
 modal((created?'Novo item: ':'Editar: ')+original.name,`<div class="item-sheet">
  <header class="item-heading"><img src="${e(editorLogo)}" alt="Tagmar Zero"><strong>${e(itemLabel(type))}</strong></header>
  <div class="item-identity"><img src="${safeImage(original.img)}" alt=""><label>Nome<input id="item-name" value="${e(original.name)}"></label></div>
  ${itemSheet(type, system)}
 </div>`,[{label:'Cancelar',run:close},{label:'Salvar item',primary:true,run:()=>{
  const copy=clone(original);copy.name=$('#item-name').value.trim();if(!copy.name)throw Error('Informe o nome do item.');
  // Grava apenas campos efetivamente editados, sem acrescentar defaults ao JSON original.
  const edited={system:clone(system)};readFields(edited);
  for(const change of changes({system},edited))set(copy,change.path,change.after);
  checkpoint('Salvar '+copy.name,a=>{if(created)a.items.push(copy);else a.items[a.items.findIndex(i=>i._id===itemId)]=copy;});
  close();
  if(openTabOnSave)setTab(ITEM_UI[type].tab);
 }}]);
 for (const button of $$('#modal-body [data-item-tab]')) {
  button.onclick = () => {
   for (const tab of $$('#modal-body [data-item-tab]')) tab.setAttribute("aria-pressed", String(tab === button));
   for (const panel of $$('#modal-body [data-item-panel]')) panel.hidden = panel.dataset.itemPanel !== button.dataset.itemTab;
  };
 }
}
function createItem(type){
 editItem(null,newItem(type,'Novo item'),{openTabOnSave:true});
}
const searchKey=value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('pt-BR').trim();
function showItems(){
 const groups=new Map(TYPES.map(type=>[type,[]]));
 const otherItems=[];
 for(const item of session.actor.items)(groups.get(item.type)??otherItems).push(item);
 const categories=[...groups,[null,otherItems]];
 const sections=categories.filter(([,items])=>items.length).map(([type,items])=>{
  const title=type?ITEM_UI[type].group:'Outros itens';
  const rows=items.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(item=>
   `<button type="button" class="item-list-row" data-edit-item="${e(item._id)}" data-item-type="${e(item.type)}"><strong>${e(item.name)}</strong><span>${e(itemLabel(item.type))}</span></button>`);
  return `<section class="item-category"><h3>${title}</h3>${rows.join('')}</section>`;
 });
 modal('Itens da ficha',`<label>Buscar<input id="item-search" placeholder="Nome ou categoria…"></label>
  <div id="item-list">${sections.join('')}</div>
  <p id="item-list-empty" class="muted" role="status" ${sections.length?'hidden':''}>${sections.length?'Nenhum item encontrado.':'A ficha ainda está sem itens.'}</p>`,
  [{label:'Fechar',run:close}]);
 $('#item-search').oninput=event=>{
  const query=searchKey(event.target.value);
  for(const section of $$('#item-list .item-category')){
   const categoryMatches=searchKey(section.querySelector('h3').textContent).includes(query);
   for(const row of section.querySelectorAll('.item-list-row')){
    row.hidden=!(categoryMatches||searchKey(row.textContent+' '+row.dataset.itemType).includes(query));
   }
   section.hidden=!section.querySelector('.item-list-row:not([hidden])');
  }
  $('#item-list-empty').hidden=Boolean($('#item-list .item-category:not([hidden])'));
 };
}
$('#modal-body').addEventListener('click',event=>{const row=event.target.closest('[data-edit-item]');if(row)editItem(row.dataset.editItem);});
$('#inventory').onclick=showItems;
$('#create-types').innerHTML=TYPES.map(type=>
 `<button type="button" data-create-type="${e(type)}"><span aria-hidden="true">+</span> ${e(itemLabel(type))}</button>`).join('');
$('#create-types').onclick=event=>{
 const button=event.target.closest('[data-create-type]');
 if(button)createItem(button.dataset.createType);
};
function setItemPanel(panel){
 for(const button of $$('.item-panel-tab'))button.setAttribute('aria-pressed',String(button.dataset.panel===panel));
 $('#catalog-panel').hidden=panel!=='catalog';
 $('#manual-panel').hidden=panel!=='manual';
}
for(const button of $$('.item-panel-tab'))button.onclick=()=>setItemPanel(button.dataset.panel);

const catalogCategories=[
 ['01','Raças'],['02','Profissões'],['03','Habilidades'],['04','Combate'],
 ['05','Defesa'],['06','Técnicas de Combate'],['07','Magias'],
 ['08','Magias Ancestrais'],['09','Magias Perdidas'],['10','Pertences e Afins']
];
const makeCatalogFolder=name=>({name,children:new Map(),items:[],directItems:[]});
const catalogRoot=makeCatalogFolder('Todas as categorias');
const rootsByCollection=new Map();
for(const item of CATALOG){
 const key=item.category+item.source;
 if(!rootsByCollection.has(key))rootsByCollection.set(key,new Set());
 rootsByCollection.get(key).add(item.folders[0]);
}
for(const [value,label] of catalogCategories)catalogRoot.children.set(value,makeCatalogFolder(`${value} - ${label}`));
for(const [index,item] of CATALOG.entries()){
 const location=[item.source,...item.folders].join(' › ');
 const entry={item,index,location,key:searchKey(`${item.name} ${itemLabel(item.type)} ${location}`)};
 catalogRoot.items.push(entry);
 let folder=catalogRoot.children.get(item.category);
 folder.items.push(entry);
 const roots=rootsByCollection.get(item.category+item.source);
 const names=[item.source,...item.folders.slice(roots.size===1?1:0)];
 for(const name of names){
  if(!folder.children.has(name))folder.children.set(name,makeCatalogFolder(name));
  folder=folder.children.get(name);
  folder.items.push(entry);
 }
 folder.directItems.push(entry);
}
const catalogType=$('#catalog-type');
catalogType.innerHTML='<option value="">Todas as categorias</option>'+catalogCategories
 .map(([value,label])=>`<option value="${value}">${value} - ${label}</option>`).join('');
const catalogResults=$('#catalog-results');
const catalogPageSize=20;
let catalogMatches=[],catalogLimit=catalogPageSize;
let catalogPath=[],catalogFolders=[],catalogSkillGroup=[];
function renderCatalog(){
 const showLocation=Boolean(searchKey($('#catalog-search').value));
 catalogResults.innerHTML=catalogMatches.slice(0,catalogLimit).map(({item,index,location})=>
  `<li class="catalog-item" draggable="true" data-catalog-index="${index}" title="${e(location)}">
   <div><strong>${e(item.name)}</strong>${showLocation?`<small>${e(location)}</small>`:''}</div>
   <button type="button" aria-label="Adicionar ${e(item.name)}">+</button>
  </li>`).join('');
 $('#catalog-more').hidden=catalogLimit>=catalogMatches.length;
}
function filterCatalog(){
 const folder=catalogPath.at(-1)??catalogRoot;
 const query=searchKey($('#catalog-search').value);
 const terms=query.split(/\s+/);
 catalogMatches=query?folder.items.filter(({key})=>terms.every(term=>key.includes(term))):folder.directItems;
 catalogFolders=query?[]:[...folder.children.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR',{numeric:true}));
 $('#catalog-path').textContent=catalogPath.map(part=>part.name).join(' › ')||catalogRoot.name;
 $('#catalog-back').hidden=catalogPath.length<=(catalogType.value?1:0);
 $('#catalog-folders').innerHTML=catalogFolders.map((child,index)=>
  `<li><button type="button" data-folder-index="${index}"><span>${e(child.name)}</span><small>${child.items.length}</small></button></li>`).join('');
 const count=query?catalogMatches.length:folder.items.length;
 $('#catalog-count').textContent=count?`${count.toLocaleString('pt-BR')} itens`:'Nenhum item encontrado.';
 const skills=catalogRoot.children.get('03');
 const inSkills=catalogPath[0]===skills;
 catalogSkillGroup=!query&&inSkills?folder.items:[];
 const bulk=$('#catalog-add-skills');
 bulk.hidden=!catalogSkillGroup.length;
 bulk.textContent=folder===skills?`Adicionar habilidades comuns (${catalogSkillGroup.length})`
  :`Adicionar grupo (${catalogSkillGroup.length})`;
 catalogLimit=catalogPageSize;
 renderCatalog();
 $('#catalog-scroll').scrollTop=0;
 $('.item-creator').scrollTop=0;
}
function resetCatalogFolder(){
 catalogPath=catalogType.value?[catalogRoot.children.get(catalogType.value)]:[];
 filterCatalog();
}
catalogType.onchange=resetCatalogFolder;
$('#catalog-search').oninput=filterCatalog;
$('#catalog-more').onclick=()=>{catalogLimit+=catalogPageSize;renderCatalog();};
$('#catalog-folders').onclick=event=>{
 const button=event.target.closest('[data-folder-index]');
 if(!button)return;
 catalogPath.push(catalogFolders[Number(button.dataset.folderIndex)]);
 filterCatalog();
};
$('#catalog-back').onclick=()=>{catalogPath.pop();filterCatalog();};
resetCatalogFolder();

function catalogItemCopy({type,name,system,imgXXX}){
 const item={...newItem(type,name),system:clone(system)};
 const stats=session.actor._stats;
 const systemId=stats?.exportSource?.systemId??stats?.systemId??session.actor.flags?.exportSource?.system;
 if(systemId==='tagmar_rpg'&&imgXXX)item.img=imgXXX;
 if(type==='Pertence'&&Number(item.system.quant??0)===0)item.system.quant=1;
 if(type==='Habilidade'&&Number(item.system.nivel??0)===0)item.system.total=-7;
 return item;
}
$('#catalog-add-skills').onclick=()=>{
 const names=new Set(session.actor.items.filter(item=>item.type==='Habilidade').map(item=>searchKey(item.name)));
 const additions=[];
 for(const {item} of catalogSkillGroup){
  const key=searchKey(item.name);
  if(names.has(key))continue;
  names.add(key);
  additions.push(catalogItemCopy(item));
 }
 if(!additions.length){toast('Este grupo já está na ficha.');return;}
 try{
  checkpoint('Adicionar grupo de habilidades',actor=>actor.items.push(...additions));
  setTab('habilidades');
  toast(`${additions.length} habilidades adicionadas à ficha.`);
 }catch(error){fail(error);}
};

function addCatalogItem(index){
 const entry=CATALOG[index];
 if(!session||!entry)return;
 const {name,type,system}=entry;
 const unique=type==='Raca'||type==='Profissao';
 const current=unique?session.actor.items.filter(item=>item.type===type):[];
 const add=()=>{
  const item=catalogItemCopy(entry);
  checkpoint('Adicionar '+name,actor=>{
   if(unique){
    actor.items=actor.items.filter(existing=>existing.type!==type);
    actor.system[type==='Raca'?'raca':'profissao']=name;
    if(type==='Raca'&&mode==='preserve')actor.system.mod_racial=clone(item.system.mod_racial);
    if(type==='Profissao'&&!String(system.especializacoes??'').split(',').includes(actor.system.especializacao)){
     actor.system.especializacao='';
    }
   }
   actor.items.push(item);
  });
  if($('#modal').open)close();
  setTab(ITEM_UI[type].tab);
  toast(`${name} adicionado à ficha.`);
 };
 if(current.length){
  const names=current.map(item=>item.name).join(', ');
  modal(`Substituir ${itemLabel(type).toLocaleLowerCase('pt-BR')}?`,
   `<p>Trocar <strong>${e(names)}</strong> por <strong>${e(name)}</strong> nesta ficha?</p>`,
   [{label:'Cancelar',run:close},{label:'Substituir',primary:true,run:add}]);
 }else add();
}
catalogResults.onclick=event=>{
 const row=event.target.closest('button')?.closest('[data-catalog-index]');
 if(!row)return;
 try{addCatalogItem(Number(row.dataset.catalogIndex));}catch(error){fail(error);}
};
const catalogDragType='application/x-tagmar-ficha-item';
catalogResults.addEventListener('dragstart',event=>{
 const row=event.target.closest('[data-catalog-index]');
 if(!row)return;
 event.dataTransfer.setData(catalogDragType,row.dataset.catalogIndex);
 event.dataTransfer.effectAllowed='copy';
 $('#sheet').classList.add('catalog-drop-ready');
});
document.addEventListener('dragend',()=>$('#sheet').classList.remove('catalog-drop-ready'));
document.addEventListener('dragover',event=>{
 event.preventDefault();
 if(event.dataTransfer.types.includes(catalogDragType)){
  event.dataTransfer.dropEffect=event.target.closest('#sheet')?'copy':'none';
 }
});
document.addEventListener('drop',async event=>{
 event.preventDefault();
 $('#sheet').classList.remove('catalog-drop-ready');
 if($('#modal').open)return;
 try{
  const {dataTransfer}=event;
  if(dataTransfer.types.includes(catalogDragType)){
   const index=dataTransfer.getData(catalogDragType);
   if(event.target.closest('#sheet')&&/^\d+$/.test(index))addCatalogItem(Number(index));
  }else await openFile(dataTransfer.files[0]);
 }catch(err){fail(err);}
});
$('#import-item').onclick=()=>$('#item-file').click();
$('#item-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('Limite de 5 MB por item.');const item=JSON.parse((await file.text()).replace(/^\uFEFF/,''));validateTree(item);if(!TYPES.includes(item.type)||typeof item.name!=='string'||!item.system||typeof item.system!=='object'||Array.isArray(item.system))throw Error('Abra um item Tagmar exportado pelo Foundry.');item._id=id();editItem(null,item);}catch(err){fail(err);}finally{event.target.value='';}};
function showLevel() {
 if (mode === 'preserve') {
  modal('Subir Nível', '<p>Escolha o modo que sua mesa usa. Ao escolher, a ficha rola o d10 e aplica o ganho de EH.</p>', [
   {label:'Cancelar',run:close},
   {label:'Por pontos',run:()=>rollLevel('pontos')},
   {label:'Por sorteio',run:()=>rollLevel('sorteio')}
  ]);
  return;
 }
 rollLevel(mode);
}
function rollLevel(calculationMode) {
 if(!session.actor.items.some(item=>item.type==='Profissao')){
  toast('Adicione uma profissão à ficha antes de subir de estágio.');
  return;
 }
 let byte;
 do {byte=crypto.getRandomValues(new Uint8Array(1))[0];} while(byte>=250);
 const roll=byte%10+1;
 const next=levelUp(session.actor,calculationMode,roll);
 session.commit(next,'Subir nível com d10 '+roll);
 if($('#modal').open)close();
 selectMode(calculationMode);
 toast(`d10: ${roll} · Estágio ${next.system.estagio} · EH máxima: ${next.system.eh.max}`);
}
function showAdvanced(){modal('Dados avançados da ficha',`<p>Edite o JSON completo desta cópia. Use este espaço para campos especiais e dados de módulos. Nenhum código ou macro será executado.</p><textarea id="advanced-json" rows="20" spellcheck="false">${e(serialize(session.actor))}</textarea>`,[{label:'Cancelar',run:close},{label:'Aplicar JSON',primary:true,run:()=>{const next=parseActor($('#advanced-json').value);session.commit(calculateDraft(next,mode),'Editar dados avançados');close();render();scheduleDraft();}}]);}
$('#advanced').onclick=showAdvanced;
function download(name,text,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function fileBase(){return session.actor.name.replace(/[<>:"/\\|?*\u0000-\u001F]/g,'-').slice(0,100)||'personagem';}
function review(exporting=false){const diff=changes(session.original,session.actor);modal(exporting?'Salvar ficha para o Foundry':'Conferir alterações',`<p><strong>${diff.length} alterações</strong> em relação ao arquivo aberto. IDs, flags, efeitos e campos desconhecidos são mantidos, salvo alterações explícitas.</p><p>O arquivo será baixado como uma nova cópia. No Foundry, faça backup e importe primeiro em uma cópia do personagem. Se o mestre editou a ficha depois da sua exportação, compare as duas versões antes de substituir.</p><div class="diff-list">${diff.slice(0,150).map(d=>`<article><b>${e(d.path)}</b><del>${e(reviewValue(d.before,d.path))}</del><ins>${e(reviewValue(d.after,d.path))}</ins></article>`).join('')||'<p>Nenhuma alteração.</p>'}${diff.length>150?'<p>Lista reduzida a 150 campos. O relatório JSON contém todas as alterações.</p>':''}</div>`,[{label:'Fechar',run:close},{label:'Baixar relatório',run:()=>download(fileBase()+'-alteracoes.json',JSON.stringify({editor:VERSION,date:new Date().toISOString(),source:sourceName,changes:diff},null,2))},...(exporting?[{label:'Baixar JSON da ficha',primary:true,run:()=>{download(fileBase()+'-editado.json',serialize(session.actor));session.saved=JSON.stringify(session.actor);close();render();scheduleDraft();toast('Download solicitado. Confira o arquivo na pasta Downloads.');}}]:[])]);}
$('#review').onclick=()=>review();$('#save').onclick=()=>review(true);
$('#portrait').onclick=()=>$('#image-file').click();$('#image-file').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>4*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use PNG, JPEG ou WebP de até 4 MB.');portraitPreview=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});render();toast('Retrato carregado apenas para visualização local. O caminho da imagem no Foundry foi preservado.');}catch(err){fail(err);}finally{event.target.value='';}};
function preparePrint(){
 if(session)$('#print-sheet').innerHTML=renderPrintSheet(viewActor(session.actor),mode,portraitPreview);
}
window.addEventListener('beforeprint',preparePrint);
function printWithTheme(theme){
 close();
 document.activeElement?.blur();
 document.documentElement.dataset.printTheme=theme;
 preparePrint();
 window.print();
}
$('#print').onclick=()=>{
 modal('Imprimir ficha','<p>Escolha o fundo para imprimir ou salvar em PDF.</p>',[
  {label:'Cancelar',run:close},
  {label:'Fundo branco',run:()=>printWithTheme('light')},
  {label:'Fundo escuro',primary:true,run:()=>printWithTheme('dark')}
 ]);
};
function showHelp(){modal('Como usar a Ficha de Bolso',`<ol><li>Use <b>Criar personagem</b> para começar no estágio 1. Você também pode exportar um ator <b>Personagem</b> do Foundry em JSON.</li><li>Abra o arquivo e escolha <b>Por pontos</b> ou <b>Por sorteio</b>, conforme sua mesa. Os totais são recalculados ao escolher e ao confirmar edições. Para ajustes manuais, escolha <b>Preservar valores</b>.</li><li>Edite as abas. Clique no lápis ou no nome de um item para abrir todos os campos. No <b>Compêndio</b>, busque por nome ou categoria. Arraste o item para a ficha ou use <b>+</b> para adicioná-lo.</li><li>Quando alcançar o XP necessário, use <b>Subir Nível</b> na aba <b>Básico</b> para rolar o d10 e aplicar o ganho de EH.</li><li>Clique em <b>Salvar JSON</b>, revise as alterações e baixe o arquivo.</li><li>No Foundry, importe primeiro em uma cópia da ficha e confira com o mestre.</li></ol><h3>O que esta versão faz</h3><p>Reaproveita os templates e as fórmulas do Tagmar. Funciona offline e mantém IDs, flags, Active Effects e outros dados do arquivo. O rascunho fica neste navegador quando há espaço disponível.</p><h3>Escopo da Ficha de Bolso</h3><p>O Compêndio inclui textos e dados de itens de Criação de Fichas e Terras Selvagens, com créditos ao Projeto Tagmar. Itens do tipo Efeito do próprio Tagmar participam dos cálculos. Recursos de módulos podem alterar os valores ao reimportar. O editor não sincroniza com a mesa nem resolve conflitos automaticamente.</p><p>O retrato local serve só para visualização. O caminho original da imagem continua no JSON. O editor usa o tema escuro e a estrutura das fichas do sistema; não reproduz toda a interface do Foundry.</p><p>Créditos: fichas e código Tagmar por Marcos Walker e Vinicius Fernandez; adaptação portátil assistida por Codex. Código derivado GPL-3.0-or-later; conteúdo Tagmar CC BY-NC-SA 3.0 BR. Handlebars: licença MIT. Nenhum código do core do Foundry está incluído.</p>`,[{label:'Entendi',primary:true,run:close}]);}
$('#help').onclick=showHelp;
const helpTip=$('#help-tip');
let helpTrigger=null;
function hideHelpTip(){
 if(!helpTrigger)return;
 helpTrigger.removeAttribute('aria-describedby');
 helpTrigger=null;
 helpTip.hidden=true;
}
function showHelpTip(trigger){
 if(trigger===helpTrigger)return;
 hideHelpTip();
 helpTrigger=trigger;
 helpTip.textContent=trigger.dataset.tip;
 trigger.setAttribute('aria-describedby',helpTip.id);
 helpTip.hidden=false;

 const anchor=trigger.getBoundingClientRect();
 const {width,height}=helpTip.getBoundingClientRect();
 const margin=8;
 let left=anchor.right;
 let top=anchor.top;
 if(left+width>innerWidth-margin){
  left=anchor.left-width;
  if(left<margin){
   left=anchor.left;
   top=anchor.bottom+height<=innerHeight-margin?anchor.bottom:anchor.top-height;
  }
 }
 helpTip.style.left=`${Math.max(margin,Math.min(left,innerWidth-width-margin))}px`;
 helpTip.style.top=`${Math.max(margin,Math.min(top,innerHeight-height-margin))}px`;
}
document.addEventListener('pointerover',event=>{
 const trigger=event.target.closest('[data-tip]');
 if(trigger && event.pointerType!=='touch')showHelpTip(trigger);
});
document.addEventListener('pointerout',event=>{
 if(!helpTrigger || (event.target!==helpTrigger && event.target!==helpTip))return;
 if(event.relatedTarget!==helpTrigger && event.relatedTarget!==helpTip && !helpTrigger.matches(':focus-visible'))hideHelpTip();
});
document.addEventListener('focusin',event=>{
 if(event.target.matches('[data-tip]'))showHelpTip(event.target);
});
document.addEventListener('focusout',event=>{
 if(event.target===helpTrigger)hideHelpTip();
});
document.addEventListener('click',event=>{
 let trigger=event.target.closest('[data-tip]');
 if(trigger && !trigger.isConnected)trigger=$$('#sheet [data-tip]').find(button=>button.dataset.tip===trigger.dataset.tip);
 if(trigger)showHelpTip(trigger);
 else if(event.target!==helpTip)hideHelpTip();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideHelpTip();});
window.addEventListener('resize',hideHelpTip);
window.addEventListener('scroll',hideHelpTip,{capture:true,passive:true});
window.addEventListener('beforeunload',event=>{if(session?.dirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('keydown',event=>{
 if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='s'||!session)return;
 event.preventDefault();
 if($('#modal').open)return;
 if(document.activeElement.matches('#sheet input[name],#sheet textarea[name]'))document.activeElement.blur();
 review(true);
});
try{const draft=JSON.parse(localStorage.getItem(DRAFT)??'null');if(draft){validateActor(draft.actor);validateActor(draft.original);if(!['preserve','pontos','sorteio'].includes(draft.mode))throw Error('Modo inválido');$('#recovery').innerHTML=`<p>Rascunho encontrado: <strong>${e(draft.actor.name)}</strong></p><button id="restore">Recuperar rascunho</button> <button id="forget">Apagar rascunho</button>`;$('#restore').onclick=()=>load(draft.actor,draft.name,draft);$('#forget').onclick=()=>{localStorage.removeItem(DRAFT);$('#recovery').replaceChildren();};}}catch{ /* armazenamento indisponível não impede abrir e salvar arquivos */ }
