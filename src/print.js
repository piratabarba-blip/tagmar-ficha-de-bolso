// Render a read-only copy for the browser's print engine.
const printNumber = new Intl.NumberFormat('pt-BR', {maximumFractionDigits:2});

function printValue(value){
 if(value===undefined||value===null||value==='')return '-';
 return e(typeof value==='number'?printNumber.format(value):value);
}

function printTable(title,headers,rows,className=''){
 const columns='<colgroup>'+headers.map(()=>'<col>').join('')+'</colgroup>';
 const label=title?`<tr><th class="print-table-title" colspan="${headers.length}">${e(title)}</th></tr>`:'';
 const body=rows.length?rows.map(row=>'<tr>'+row.map((value,index)=>
  index===0?`<th scope="row">${printValue(value)}</th>`:`<td>${printValue(value)}</td>`
 ).join('')+'</tr>').join(''):`<tr><td class="print-empty" colspan="${headers.length}">Nenhum registro.</td></tr>`;
 const keepTogether=rows.length<=4?' print-table-short':'';
 return `<table class="print-table ${className}${keepTogether}">${columns}<thead>${label}<tr>${headers.map(header=>`<th scope="col">${e(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

function printFields(fields,className=''){
 return `<dl class="print-fields ${className}">${fields.map(([label,value])=>
  `<div><dt>${e(label)}</dt><dd>${printValue(value)}</dd></div>`).join('')}</dl>`;
}

function printSection(title,content){
 return `<section class="print-section"><h2>${e(title)}</h2>${content}</section>`;
}

function printSkills(groups,nativeSkill){
 const skillName=item=>item.name+(item===nativeSkill?' (nata)':'');
 const height=Math.max(...groups.map(([,items])=>items.length),1);
 const headings=groups.map(([label])=>`<th scope="colgroup" colspan="3">${e(label)}</th>`).join('');
 const columns=groups.map(()=>'<th scope="col">Habilidade</th><th scope="col">Nív.</th><th scope="col">Total</th>').join('');
 const rows=Array.from({length:height},(_,i)=>'<tr>'+groups.map(([,items])=>{
  const item=items[i];
  if(!item)return i===0?'<td class="print-empty" colspan="3">Nenhum registro.</td>':'<td colspan="3"></td>';
  return `<th scope="row">${e(skillName(item))}</th><td>${printValue(item.system.nivel)}</td><td>${printValue(item.system.total)}</td>`;
 }).join('')+'</tr>').join('');
 return `<table class="print-table print-skills"><colgroup><col><col><col></colgroup><colgroup><col><col><col></colgroup><colgroup><col><col><col></colgroup><thead><tr class="print-table-title">${headings}</tr><tr>${columns}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderPrintSheet(actor,calculationMode,localPortrait){
 const s=actor.system;
 const effects=rules._preparaEfeitosAtributos({document:actor}).detalhes;
 const attributes=[
  ['Modificador racial',s.mod_racial],
  ...(calculationMode==='sorteio'?
   [['Valor sorteado',s.carac_sort],['Característica final',s.carac_final]]:
   [[calculationMode==='pontos'?'Pontos gastos':'Pontos / sorteio',s.carac_sort]]),
  ['Ajuste',s.atributos],
  ['Efeitos',Object.fromEntries(ATTRS.map(key=>[key,effects[key].exibicao]))],
  ['Valor para teste',s.valor_teste]
 ];
 const defense=value=>[value.categoria??value.tipo,value.valor].filter(part=>part!==undefined).join('');
 const resources=[['EF',s.ef],['EH',s.eh],['Karma',s.karma],['Focus',s.focus],['Absorção',s.absorcao]];
 const portrait=localPortrait||(/^data:image\/(png|jpeg|webp);base64,/.test(actor.img)?safeImage(actor.img):'');
 const identity=printFields([
  ['Raça',s.raca],['Profissão',s.profissao],['Especialização',s.especializacao],['Deus',s.deus],
  ['Classe social',s.classe_social],['Idade',s.idade],['Altura (m)',s.altura],['Peso (kg)',s.peso]
 ],'print-identity');
 const basic=`<div class="print-overview">
  ${identity}
  ${printTable('Atributos',['Característica',...ATTRS],attributes.map(([label,values])=>[label,...ATTRS.map(key=>values[key])]),'print-attributes')}
 </div>
 ${printFields([
  ['XP atual',s.pontos_estagio.value],['Próximo estágio',s.pontos_estagio.next],['RF',s.rf],['RM',s.rm],
  ['FA',s.forca_ataque],['Defesa ativa',defense(s.d_ativa)],['Defesa passiva',defense(s.d_passiva)],['VB',s.vb],['VBE',s.vbe],['Iniciativa',s.iniciativa]
 ],'print-inline-fields')}
 ${printTable('', ['Reserva',...resources.map(([label])=>label)],
  [['Atual',...resources.map(([,value])=>value.value)],['Máximo',...resources.map(([,value])=>value.max)]])}`;

 const nativeSkill=actor.habilidades.find(item=>isNativeSkill(item,actor));
 const skills=SKILL_GROUPS.map(([key,label])=>[label,actor.habilidades.filter(item=>item.system.tipo===key)]);
 const otherSkills=actor.habilidades.filter(item=>!SKILL_GROUPS.some(([key])=>item.system.tipo===key));
 const skillSummary=[['Pontos para habilidades',s.pontos_aqui],['Limite',`${actor.habilidades.filter(item=>item.system.nivel>0&&item!==nativeSkill).length}/${s.max_hab}`],
  ['Habilidade nata',s.hab_nata],['Bônus / penalidade',s.bonus_habil??0]];
 if(s.defesa.categoria)skillSummary.push(['Idiomas',s.defesa.categoria]);
 const skillContent=printFields(skillSummary,'print-inline-fields')
  +printSkills(skills.slice(0,3),nativeSkill)+printSkills(skills.slice(3),nativeSkill)
  +(otherSkills.length?printTable('Outras habilidades',['Habilidade','Nível','Total'],
   otherSkills.map(item=>[item.name,item.system.nivel,item.system.total])):'');

 const attackRows=actor.combate.map(({name,system:item})=>[name,item.alcance,item.municao,
  ...['def_l','def_m','def_p'].map(key=>[item[key],item.custo,item.bonus_magico,item.nivel].reduce((total,n)=>total+(Number(n)||0),0)),
  ...[25,50,75,100,125].map(p=>item.dano?.['d'+p])]);
 const combat=printFields([
  ['Pontos de grupos',s.pontos_comb],['Pontos de técnicas',s.pontos_tec],['Grupo aprimorado',s.grupo_aprim],
  ['Bônus / penalidade',s.inf_ataque.bonus]
 ],'print-inline-fields')
 +printTable('', ['Grupos de armas',...Object.keys(s.grupos)],[['Nível',...Object.values(s.grupos)]],'print-weapon-groups')
 +printTable('Ataques',['Ataque','Alcance','Munição','L','M','P','25%','50%','75%','100%','125%'],attackRows,'print-attacks')
 +printTable('Equipamentos de defesa',['Equipamento','Defesa base','Absorção','Equipado'],
  actor.defesas.map(({name,system:item})=>[name,defense(item.defesa_base),item.absorcao,item.equipado?'Sim':'Não']))
 +printTable('Técnicas de combate',['Técnica','Custo','Nível','FA','Mecânica'],actor.tecnicas.map(({name,system:item})=>
  [name,item.custo,item.nivel,item.fa,FIELD_OPTIONS.Tecnica_Combate.mecanica.find(([key])=>key===Number(item.mecanica))?.[1]]),'print-techniques');

 const magic=printFields([['Pontos para magias',s.pontos_mag]],'print-inline-fields')
  +printTable('', ['Magia','Custo','Nível','Total','Evocação','Duração'],
   actor.magias.map(({name,system:item})=>[name,item.custo,item.nivel,item.total.valor,item.evocacao,item.duracao]),'print-spells');
 const belongings=(title,items)=>printTable(title,['Pertence','Qtd.','kg/un.','Total (kg)','Preço'],
  items.map(({name,system:item})=>[name,item.quant,item.peso,Number(item.quant)*Number(item.peso),item.preco]));
 const inventory=printFields([['Carga (kg)',s.carga.value],['Ouro (MO)',s.dinheiro.mo],['Prata (MP)',s.dinheiro.mp],['Cobre (MC)',s.dinheiro.mc]],'print-inline-fields')
  +belongings('',actor.pertences)
  +(actor.transportes.length?printTable('Transportes',['Transporte','Pessoas','Carga (kg)'],
   actor.transportes.map(({name,system:item})=>[name,item.capacidade.pessoas,item.capacidade.carga])):'')
  +(actor.pertences_transporte.length?belongings('Carga no transporte',actor.pertences_transporte):'');
 const effectRows=actor.efeitos.map(({name,system:item})=>
  [name,item.atributo,({'*':'×','/':'÷'})[item.tipo]??item.tipo,item.valor,item.ativo?'Sim':'Não']);
 const favorites=[['Ataque',actor.combate_fav],['Técnica de combate',actor.tecnica_fav],['Magia',actor.magia_fav]]
  .flatMap(([label,items])=>items.map(item=>[item.name,label]));
 const biography=safeRich(s.descricao);
 return `<header class="print-header">
  ${portrait?`<img class="print-portrait" src="${e(portrait)}" alt="">`:''}
  <div><p>Ficha de personagem</p><h1>${e(actor.name)}</h1></div>
  <strong>Estágio ${printValue(s.estagio)}</strong>
  <img class="print-logo" src="${e(editorLogo)}" alt="Tagmar Zero">
 </header>
 ${printSection('Básico',basic)}
 ${printSection('Habilidades',skillContent)}
 ${printSection('Combate',combat)}
 ${printSection('Magia',magic)}
 ${printSection('Pertences',inventory)}
 ${printSection('Efeitos',printTable('', ['Efeito','Atributo','Operação','Valor','Ativo'],effectRows))}
 ${printSection('Biografia',`<div class="print-biography">${biography||'<p>Nenhuma biografia registrada.</p>'}</div>`)}
 ${printSection('Favoritos',printTable('', ['Item','Categoria'],favorites))}`;
}
