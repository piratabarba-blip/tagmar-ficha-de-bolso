const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.argv[2]||'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true,offline:true});
 try{
  const page=await context.newPage(),errors=[],requests=[];page.setDefaultTimeout(7000);page.on('pageerror',err=>{errors.push(err.message);console.error('Erro na página:',err.message);});page.on('request',req=>{if(/^https?:/.test(req.url()))requests.push(req.url());});
  await page.goto(pathToFileURL(path.join(root,'Ficha de Bolso.html')).href);await page.screenshot({path:path.join(out,'inicio.png')});
  await page.click('#example');await page.locator('#sheet input[name="name"]').waitFor();
  await page.screenshot({path:path.join(out,'basico.png'),fullPage:true});
  assert.equal(await page.locator('#mode').inputValue(),'pontos');
  await page.locator('#sheet input[name="name"]').fill('Elarion Testado');await page.locator('#sheet input[name="name"]').press('Tab');
  await page.click('#undo');assert.match(await page.locator('#sheet input[name="name"]').inputValue(),/exemplo/);await page.click('#redo');assert.equal(await page.locator('#sheet input[name="name"]').inputValue(),'Elarion Testado');
  for(const tab of ['habilidades','combate','magia','pertences','efeitos','descricao','favoritos']){await page.click(`nav a[data-tab="${tab}"]`);assert.equal(await page.locator('.tab.active').getAttribute('data-tab'),tab);await page.screenshot({path:path.join(out,tab+'.png'),fullPage:true});}
  await page.click('nav a[data-tab="habilidades"]');await page.locator('.searchHabilidade').fill('Escalar');assert.equal(await page.locator('.search-match').count(),1);await page.locator('.searchHabilidade').fill('');assert.equal(await page.locator('.search-match').count(),0);
  await page.click('nav a[data-tab="combate"]');await page.locator('.showImg[data-item-id="Apareca"]:visible').click();await page.click('#undo');
  await page.click('#new-item');await page.selectOption('#new-type','Pertence');await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.locator('#item-name').fill('Corda de teste');await page.getByRole('button',{name:'Salvar item',exact:true}).click();await page.click('#inventory');await page.locator('#item-search').fill('Corda de teste');assert.equal(await page.locator('.item-list-row:visible').count(),1);await page.click('#modal-close');await page.click('#undo');
  await page.click('#inventory');await page.locator('#item-search').fill('Rações');await page.locator('.item-list-row:visible').click();await page.locator('[data-path="system.quant"]').fill('9');await page.getByRole('button',{name:'Salvar item',exact:true}).click();
  await page.click('#level');assert.match(await page.locator('#level-preview').textContent(),/Estágio 3 → 4/);await page.getByRole('button',{name:'Aplicar progressão',exact:true}).click();
  await page.click('#save');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON da ficha',exact:true}).click();const download=await pending;const downloaded=path.join(out,'exportado.json');await download.saveAs(downloaded);
  const data=JSON.parse(fs.readFileSync(downloaded,'utf8'));assert.equal(data.name,'Elarion Testado');assert.equal(data.system.estagio,4);assert.equal(data.items.find(i=>i.type==='Pertence').system.quant,9);assert.equal(data.system.carga.value,4.5);
  // Round-trip sem edição deve manter o JSON, inclusive campos que o editor desconhece.
  data.flags.extra={unsafe:'<script>window.pwned=1</script>',keep:[1,2]};data.effects=[{_id:'custom-effect',disabled:false,changes:[]}];data.name='<img src="https://example.invalid/steal" onerror="window.pwned=1">';
  data.system.descricao='<p>Texto seguro</p><img src="https://example.invalid/pixel" onerror="window.pwned=1"><script>window.pwned=1</script>';
  const fixture=path.join(out,'roundtrip.json');fs.writeFileSync(fixture,JSON.stringify(data));await page.setInputFiles('#actor-file',fixture);assert.equal(await page.locator('#mode').inputValue(),'preserve');
  await page.click('nav a[data-tab="descricao"]');assert.match(await page.locator('.bio-preview').innerText(),/Texto seguro/);assert.equal(await page.evaluate(()=>window.pwned),undefined);
  await page.click('#save');const pending2=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar JSON da ficha',exact:true}).click();const dl2=await pending2;await dl2.saveAs(path.join(out,'roundtrip-exportado.json'));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'roundtrip-exportado.json'))),data);
  await page.setViewportSize({width:900,height:800});await page.click('nav a[data-tab="basico"]');await page.screenshot({path:path.join(out,'compacto.png'),fullPage:true});
  // A recuperação mantém a marca de alterações não exportadas.
  await page.locator('#sheet input[name="name"]').fill('Rascunho recuperável');await page.locator('#sheet input[name="name"]').press('Tab');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('tagmar-ficha-bolso-0.1'))?.actor.name==='Rascunho recuperável');
  page.on('dialog',d=>d.accept());await page.reload();await page.click('#restore');assert.equal(await page.locator('#sheet input[name="name"]').inputValue(),'Rascunho recuperável');assert.match(await page.locator('#save-state').textContent(),/não exportadas/);
  await page.selectOption('#mode','sorteio');await page.click('#recalculate');await page.locator('[name="system.carac_sort.FOR"]').fill('16');await page.locator('[name="system.carac_sort.FOR"]').press('Tab');assert.equal(await page.locator('[name="system.atributos.FOR"]').inputValue(),'2');
  assert.deepEqual(requests,[],'O editor não pode consultar a rede');assert.deepEqual(errors,[]);
  console.log('PASS: HTML file:// offline, todas as abas, edição de item, desfazer/refazer, progressão, download JSON, round-trip sem perdas, conteúdo malicioso e zero rede.');
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
