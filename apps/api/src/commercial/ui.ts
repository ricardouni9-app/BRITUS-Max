import type { FastifyInstance } from "fastify";
import { createReadStream } from "node:fs";

// Interface COMERCIAL mínima (same-origin). Usa EXCLUSIVAMENTE rotas legítimas:
// /auth/session, /auth/login, /auth/active-organization, /clients, /atendimentos, /cases,
// /auth/logout. Sem seed, sem __dev, sem cabeçalhos manuais, sem credenciais expostas.
// Área/tipo de trabalho usam um padrão da versão (catálogo de áreas = evolução futura).
const DEFAULT_AREA = "01920000-0000-7000-8000-000000000001";

const HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>BRITUS — Operações organizadas</title>
<style>
:root{--bg:#f4f6f9;--pan:#fff;--ink:#1c2733;--mut:#5a6b7b;--line:#e2e8f0;--acc:#1e5fbf;--accd:#164a97;--ok:#127a3e;--err:#b3261e}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#e8eef7 0 58%,#f3e6d7 58% 88%,#fff 88%);color:var(--ink);font:15px/1.5 system-ui,Segoe UI,Roboto,sans-serif;min-height:100vh}
.top{background:linear-gradient(100deg,#f3e6d7 0 80%,#fff 80%);border-bottom:1px solid #ddcbbc;padding:14px 22px;display:flex;align-items:center;gap:12px}
.brand{font-weight:800;letter-spacing:.5px;color:var(--acc)}.brand b{color:var(--ink)}
.top .sp{flex:1}.orgtag{font-size:12px;color:var(--mut);background:#eef3fb;padding:4px 10px;border-radius:999px}
.wrap{max-width:960px;margin:26px auto;padding:0 18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pan{background:var(--pan);border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.pan h3{margin:0 0 4px;font-size:15px}.pan p.h{margin:0 0 14px;color:var(--mut);font-size:13px}
label{display:block;font-size:13px;color:var(--mut);margin:10px 0 4px}
input,select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;font-size:14px;background:#fff;color:var(--ink)}
button{margin-top:14px;width:100%;padding:11px;background:var(--acc);color:#fff;border:0;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer}
button:hover{background:var(--accd)}button.ghost{background:#eef3fb;color:var(--acc)}button.link{width:auto;background:none;color:var(--mut);font-weight:500;padding:6px 0}
.list{margin-top:12px;border-top:1px solid var(--line);padding-top:10px;font-size:13px}
.list .it{padding:7px 0;border-bottom:1px dashed var(--line);color:var(--ink)}.list .it small{color:var(--mut)}
.msg{margin-top:12px;font-size:13px;min-height:18px}.msg.ok{color:var(--ok)}.msg.err{color:var(--err)}
.center{max-width:400px;margin:8vh auto}.hidden{display:none}
h2.big{font-size:18px;margin:0 0 2px}
.promo{max-width:1040px;margin:24px auto;padding:0 18px}.stage{min-height:430px;border-radius:22px;padding:42px;background:linear-gradient(135deg,#071a38 0%,#123f7b 58%,#1e5fbf 100%);color:#fff;display:grid;place-items:center;text-align:center;position:relative;overflow:hidden;box-shadow:0 24px 60px rgba(7,26,56,.18)}
.stage:before{content:"";position:absolute;inset:-20%;background:repeating-linear-gradient(118deg,transparent 0 86px,rgba(244,214,211,.16) 87px 89px,transparent 90px 154px,rgba(236,72,153,.12) 155px 157px);transform:rotate(-2deg);pointer-events:none}.stage:after{content:"";position:absolute;width:360px;height:360px;border:1px solid rgba(244,214,211,.35);border-radius:50%;right:-170px;top:-185px;box-shadow:0 0 0 26px rgba(236,72,153,.035);pointer-events:none}.scene{position:relative;z-index:1;max-width:780px;padding:26px 30px;border:1px solid rgba(244,214,211,.2);border-radius:18px;background:rgba(7,26,56,.14);backdrop-filter:blur(2px)}.scene h1{font-size:clamp(30px,5vw,54px);line-height:1.08;margin:0 0 20px;color:#fff8ee}.caption{font-size:clamp(17px,2vw,22px);line-height:1.55;color:#f8efe6}.caption span{display:block}.pcontrols{display:flex;gap:10px;align-items:center;margin-top:14px}.pcontrols button{width:auto;margin:0}.promo .pcontrols .ghost{background:#f3e6d7;color:#164a97;border:1px solid #ddcbbc}.progress{height:5px;background:#ead9ce;border-radius:9px;overflow:hidden;flex:1}.progress i{display:block;height:100%;background:linear-gradient(90deg,#f4d6d3,#ec4899);width:0;transition:width .25s}.trial{margin:18px auto 0;max-width:720px;border:1px solid #d8c5b7;border-top:3px solid #ec4899;background:linear-gradient(135deg,#f3e6d7 0 80%,#fff 80%);box-shadow:0 16px 36px rgba(22,74,151,.1)}.trialgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.check{display:flex;gap:9px;align-items:flex-start;color:var(--mut);font-size:12px}.check input{width:auto;margin-top:3px}.hp{position:absolute;left:-9999px}.topcta{width:auto;margin:0;padding:8px 13px}
@media(max-width:700px){.grid,.trialgrid{grid-template-columns:1fr}.stage{min-height:390px;padding:28px 18px}.promo{padding:0 10px}}
</style></head><body>
<div class="top"><span class="brand">BRITUS<b> · Operações organizadas</b></span><span class="sp"></span>
  <button id="openLogin" class="ghost topcta">Entrar</button>
  <span id="orgtag" class="orgtag hidden"></span>
  <button id="logout" class="link hidden">Sair</button>
</div>

<div id="promoView" class="promo">
  <audio id="narration" preload="auto"></audio>
  <section class="stage" aria-live="polite"><div class="scene"><h1 id="sceneTitle"></h1><div id="sceneCaption" class="caption"></div></div></section>
  <div class="pcontrols"><button id="watchBtn">Assistir</button><button id="skipBtn" class="ghost">Pular</button><button id="voiceBtn" class="ghost hidden">Ativar narração</button><button id="pauseBtn" class="ghost hidden">Pausar</button><div id="progress" class="progress hidden"><i id="progressFill"></i></div></div>
  <div class="trial pan">
    <h2 class="big">Comece seu teste integral de 48 horas</h2><p class="h">Informe somente o essencial. O acesso é criado e liberado automaticamente, sem contato ou intervenção humana.</p>
    <div class="trialgrid"><div><label>Nome</label><input id="tname" autocomplete="name"/></div><div><label>E-mail</label><input id="temail" type="email" autocomplete="email"/></div><div><label>Crie uma senha</label><input id="tpassword" type="password" minlength="10" autocomplete="new-password"/></div></div>
    <input id="twebsite" class="hp" tabindex="-1" autocomplete="off"/>
    <button id="trialBtn">Liberar meu teste por 48 horas</button><div id="tmsg" class="msg"></div>
  </div>
</div>

<div id="loginView" class="center pan hidden">
  <h2 class="big">Entrar</h2><p class="h" style="color:var(--mut);font-size:13px">Acesse com suas credenciais de operador.</p>
  <label>E-mail</label><input id="lemail" type="email" autocomplete="username"/>
  <label>Senha</label><input id="lpass" type="password" autocomplete="current-password"/>
  <button id="loginBtn">Entrar</button>
  <div id="lmsg" class="msg"></div>
</div>

<div id="appView" class="wrap hidden">
  <div id="accessPanel" class="pan" style="margin-bottom:16px"></div>
  <div class="grid">
    <div class="pan">
      <h3>Novo cliente</h3><p class="h">Cadastro do cliente na organização ativa.</p>
      <label>Tipo</label><select id="cptype"><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select>
      <label>Nome / Razão social</label><input id="cpname" placeholder="Ex.: Maria Souza"/>
      <button id="cpbtn">Cadastrar cliente</button>
      <div id="cpmsg" class="msg"></div>
      <div id="cplist" class="list"></div>
    </div>
    <div class="pan">
      <h3>Novo atendimento</h3><p class="h">Registro do contato/triagem inicial.</p>
      <label>Canal de origem</label><input id="atchan" value="Indicação"/>
      <label>Resumo</label><input id="atsum" placeholder="Ex.: Demanda trabalhista — rescisão"/>
      <button id="atbtn">Registrar atendimento</button>
      <div id="atmsg" class="msg"></div>
      <div id="atlist" class="list"></div>
    </div>
    <div class="pan">
      <h3>Novo caso</h3><p class="h">Abertura de caso classificado.</p>
      <label>Título</label><input id="cstitle" placeholder="Ex.: Reclamatória Trabalhista"/>
      <label>Classificação financeira</label><select id="csfin"><option value="baixo">Baixo</option><option value="medio" selected>Médio</option><option value="alto">Alto</option></select>
      <button id="csbtn">Abrir caso</button>
      <div id="csmsg" class="msg"></div>
      <div id="cslist" class="list"></div>
    </div>
    <div class="pan">
      <h3>Sessão</h3><p class="h">Organização ativa e encerramento seguro.</p>
      <div id="sessinfo" class="list"></div>
      <button id="logout2" class="ghost">Encerrar sessão</button>
    </div>
  </div>
</div>

<script>
const AREA=${JSON.stringify(DEFAULT_AREA)};
let csrf=null;
const $=id=>document.getElementById(id);
const SCENES=[
  ['Organize o que move sua operação.',['Clientes, atendimentos e responsabilidades deixam de ficar dispersos.','A BRITUS transforma informação em continuidade.']],
  ['Comece pelas pessoas.',['Registre clientes e mantenha o histórico essencial em um só lugar.','Encontre contexto antes de tomar decisões.']],
  ['Acompanhe cada atendimento.',['Da primeira conversa ao próximo passo, sua equipe trabalha com clareza.','Nada importante depende apenas da memória.']],
  ['Transforme demandas em trabalho estruturado.',['Casos, projetos e atividades seguem um fluxo compreensível.','A estrutura se adapta à realidade da sua área.']],
  ['Trabalhe com segurança.',['Cada organização possui seu próprio contexto de acesso.','Identidade, permissões e operações são validadas no servidor.']],
  ['Começamos pela advocacia.',['Ela é nossa prioridade comercial inicial.','A BRITUS, porém, foi construída para apoiar diferentes atividades profissionais.']],
  ['Experimente por 48 horas.',['Faça o cadastro essencial e receba acesso integral imediatamente.','Ao final, escolha seu plano e seus módulos para continuar.','Todo o processo é automático e acontece dentro da BRITUS.']]
];
const AUDIO_SOURCES=SCENES.map((_,i)=>'/assets/narration/britus-intro-'+String(i+1).padStart(2,'0')+'.mp3');
let sceneIndex=0,playing=false,voiced=false,sceneStarted=Date.now();const SCENE_MS=9000;const narration=$('narration');
function loadNarration(){const source=AUDIO_SOURCES[sceneIndex];if(narration.getAttribute('src')!==source){narration.pause();narration.src=source;narration.load()}}
function playNarration(){loadNarration();narration.currentTime=0;void narration.play()}
function renderScene(){const s=SCENES[sceneIndex];$('sceneTitle').textContent=s[0];$('sceneCaption').innerHTML=s[1].map(x=>'<span>'+x+'</span>').join('');sceneStarted=Date.now();loadNarration()}
function finishPresentation(){playing=false;narration.pause();$('progressFill').style.width='100%';$('pauseBtn').textContent='Rever apresentação';$('trialBtn').focus({preventScroll:true});document.querySelector('.trial').scrollIntoView({behavior:'smooth',block:'start'})}
function advanceScene(){if(sceneIndex>=SCENES.length-1){finishPresentation();return}sceneIndex+=1;renderScene();if(voiced&&playing)playNarration()}
setInterval(()=>{if(!playing||voiced)return;const p=Math.min(1,(Date.now()-sceneStarted)/SCENE_MS);$('progressFill').style.width=(((sceneIndex+p)/SCENES.length)*100)+'%';if(p>=1)advanceScene()},250);
narration.addEventListener('timeupdate',()=>{if(!voiced||!playing||!narration.duration)return;const within=Math.min(1,narration.currentTime/narration.duration);$('progressFill').style.width=(((sceneIndex+within)/SCENES.length)*100)+'%'});
narration.addEventListener('ended',()=>{if(voiced&&playing)advanceScene()});
async function api(method,url,body){
  const h={'content-type':'application/json'};
  if(method!=='GET'&&csrf)h['x-csrf-token']=csrf;
  const r=await fetch(url,{method,credentials:'include',headers:h,body:body?JSON.stringify(body):undefined});
  let d=null;try{d=await r.json()}catch{}
  return {status:r.status,ok:r.status<300,data:d};
}
function errMsg(d){return (d&&d.error&&d.error.message)||'Falha na operação'}
function show(view){$('promoView').classList.toggle('hidden',view!=='promo');$('loginView').classList.toggle('hidden',view!=='login');$('appView').classList.toggle('hidden',view!=='app');
  $('openLogin').classList.toggle('hidden',view==='app');
  $('logout').classList.toggle('hidden',view!=='app');$('orgtag').classList.toggle('hidden',view!=='app');}
async function boot(){
  const s=await api('GET','/auth/session');
  if(!s.data||!s.data.authenticated){show('promo');return}
  csrf=s.data.csrfToken;
  let org=s.data.activeOrganizationId;
  if(!org&&s.data.memberships&&s.data.memberships.length){
    const sel=await api('POST','/auth/active-organization',{organizationId:s.data.memberships[0].organizationId});
    if(sel.ok){org=s.data.memberships[0].organizationId}
  }
  $('orgtag').textContent='Organização: '+(org?org.slice(0,8)+'…':'—');
  $('sessinfo').innerHTML='<div class="it">Operador autenticado<br><small>Org ativa: '+(org||'nenhuma')+'</small></div>';
  show('app');
  await renderAccess();
}
let accessTimer=null;
function remainingText(end){const ms=Math.max(0,new Date(end).getTime()-Date.now());const h=Math.floor(ms/3600000);const m=Math.floor((ms%3600000)/60000);const s=Math.floor((ms%60000)/1000);return h+'h '+m+'min '+s+'s'}
async function renderAccess(){
  if(accessTimer)clearInterval(accessTimer);
  const r=await api('GET','/commercial/access');if(!r.ok)return;
  const panel=$('accessPanel');
  if(r.data.allowed&&r.data.status==='trialing'){
    panel.innerHTML='<h3>Teste integral ativo</h3><p class="h">Seu período termina em <b id="trialClock"></b>. Ao final, escolha plano e módulos para continuar.</p><button id="purchaseNow" class="ghost">Contratar agora</button>';
    $('purchaseNow').onclick=showPurchaseOptions;
    const update=()=>{const clock=$('trialClock');if(!clock)return;clock.textContent=remainingText(r.data.trialEndsAt);if(new Date(r.data.trialEndsAt).getTime()<=Date.now())renderAccess()};update();accessTimer=setInterval(update,1000);return;
  }
  if(r.data.allowed){panel.innerHTML='<h3>Pagamento aprovado — complete sua organização</h3><p class="h">O acesso já está ativo. Conclua os dados da organização para finalizar a contratação.</p><div class="trialgrid"><input id="orgLegalName" placeholder="Razão social / nome completo"/><input id="orgTaxId" placeholder="CNPJ / CPF"/><input id="orgEmail" type="email" placeholder="E-mail da organização"/><input id="orgPhone" placeholder="Telefone"/><input id="orgAddress" placeholder="Endereço"/><input id="orgCity" placeholder="Cidade"/><input id="orgState" placeholder="UF"/><input id="orgPostal" placeholder="CEP"/></div><button id="orgCompleteBtn">Finalizar cadastro</button><div id="orgCompleteMsg" class="msg"></div>';$('orgCompleteBtn').onclick=completeOrganization;return}
  await showPurchaseOptions();
}
async function showPurchaseOptions(){
  const panel=$('accessPanel');const catalog=await api('GET','/billing/catalog');const modules=(catalog.data&&catalog.data.modules)||[];
  panel.innerHTML='<h3>Seu teste terminou</h3><p class="h">Escolha o plano e os módulos. O pagamento e a ativação acontecem automaticamente.</p><label>Plano</label><select id="purchasePlan"><option value="monthly">Mensal</option><option value="annual">Anual</option></select><div id="moduleChoices"></div><button id="purchaseBtn">Continuar para pagamento</button><div id="purchaseMsg" class="msg"></div>';
  $('moduleChoices').innerHTML=modules.map((module,index)=>'<label class="check"><input type="checkbox" class="purchaseModule" value="'+module.code+'" '+(index===0?'checked':'')+'/> '+module.name+' — '+(module.priceCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})+'</label>').join('');
  $('purchaseBtn').onclick=startPurchase;
}
async function startPurchase(){
  const moduleCodes=[...document.querySelectorAll('.purchaseModule:checked')].map(input=>input.value);const plan=$('purchasePlan').value;$('purchaseMsg').textContent='Preparando pagamento…';
  const selected=await api('POST','/billing/subscription',{moduleCodes});if(!selected.ok){$('purchaseMsg').className='msg err';$('purchaseMsg').textContent=errMsg(selected.data);return}
  const checkout=await api('POST','/billing/checkout',{plan,moduleCodes});if(!checkout.ok){$('purchaseMsg').className='msg err';$('purchaseMsg').textContent=errMsg(checkout.data);return}
  location.href=checkout.data.checkoutUrl;
}
async function completeOrganization(){const body={legalName:$('orgLegalName').value,taxId:$('orgTaxId').value,email:$('orgEmail').value,phone:$('orgPhone').value,addressLine:$('orgAddress').value,city:$('orgCity').value,state:$('orgState').value,postalCode:$('orgPostal').value};const r=await api('POST','/commercial/organization-profile',body);$('orgCompleteMsg').className=r.ok?'msg ok':'msg err';$('orgCompleteMsg').textContent=r.ok?'Cadastro concluído. Sistema liberado.':errMsg(r.data)}
async function doLogin(){
  $('lmsg').className='msg';$('lmsg').textContent='Entrando…';
  const r=await api('POST','/auth/login',{email:$('lemail').value.trim(),password:$('lpass').value});
  if(!r.ok){$('lmsg').className='msg err';$('lmsg').textContent=r.status===401?'E-mail ou senha inválidos.':errMsg(r.data);return}
  csrf=r.data.csrfToken;await boot();
}
async function logout(){await api('POST','/auth/logout');csrf=null;location.reload()}
async function trial(){
  $('tmsg').className='msg';$('tmsg').textContent='Criando e liberando seu acesso…';
  const r=await api('POST','/public/trial',{name:$('tname').value,email:$('temail').value,password:$('tpassword').value,website:$('twebsite').value});
  if(!r.ok){$('tmsg').className='msg err';$('tmsg').textContent=errMsg(r.data);return}
  csrf=r.data.csrfToken;sessionStorage.setItem('britusTrialEndsAt',r.data.trialEndsAt);$('tmsg').className='msg ok';$('tmsg').textContent=r.data.message;await boot();
}
function addItem(listId,html){const l=$(listId);l.innerHTML='<div class="it">'+html+'</div>'+l.innerHTML}
async function mkClient(){
  $('cpmsg').className='msg';$('cpmsg').textContent='Salvando…';
  const r=await api('POST','/clients',{personType:$('cptype').value,displayName:$('cpname').value.trim()});
  if(!r.ok){$('cpmsg').className='msg err';$('cpmsg').textContent=errMsg(r.data);return}
  $('cpmsg').className='msg ok';$('cpmsg').textContent='Cliente cadastrado.';$('cpname').value='';
  addItem('cplist','<b>'+r.data.displayName+'</b> <small>'+r.data.personType.toUpperCase()+' · '+r.data.id.slice(0,8)+'…</small>');
}
async function mkAtend(){
  $('atmsg').className='msg';$('atmsg').textContent='Salvando…';
  const r=await api('POST','/atendimentos',{channelOrigin:$('atchan').value.trim(),summary:$('atsum').value.trim()});
  if(!r.ok){$('atmsg').className='msg err';$('atmsg').textContent=errMsg(r.data);return}
  $('atmsg').className='msg ok';$('atmsg').textContent='Atendimento registrado.';$('atsum').value='';
  addItem('atlist','<b>'+(r.data.summary||'Atendimento')+'</b> <small>'+r.data.status+' · '+r.data.id.slice(0,8)+'…</small>');
}
async function mkCase(){
  $('csmsg').className='msg';$('csmsg').textContent='Abrindo…';
  const r=await api('POST','/cases',{areaId:AREA,workTypeId:AREA,title:$('cstitle').value.trim(),financialClassification:$('csfin').value});
  if(!r.ok){$('csmsg').className='msg err';$('csmsg').textContent=errMsg(r.data);return}
  $('csmsg').className='msg ok';$('csmsg').textContent='Caso aberto.';$('cstitle').value='';
  addItem('cslist','<b>'+r.data.title+'</b> <small>'+r.data.status+' · '+r.data.financialClassification+'</small>');
}
$('loginBtn').onclick=doLogin;$('lpass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
$('openLogin').onclick=()=>show('login');$('trialBtn').onclick=trial;
$('watchBtn').onclick=()=>{playing=true;$('watchBtn').classList.add('hidden');$('skipBtn').classList.add('hidden');$('voiceBtn').classList.remove('hidden');$('pauseBtn').classList.remove('hidden');$('progress').classList.remove('hidden');sceneStarted=Date.now()};
$('skipBtn').onclick=finishPresentation;
$('voiceBtn').onclick=()=>{voiced=!voiced;$('voiceBtn').textContent=voiced?'Desativar narração':'Ativar narração';if(voiced){playing=true;playNarration()}else{narration.pause();sceneStarted=Date.now()}};
$('pauseBtn').onclick=()=>{if(!playing&&sceneIndex===SCENES.length-1){sceneIndex=0;playing=true;renderScene();$('pauseBtn').textContent='Pausar';if(voiced)playNarration();scrollTo({top:0,behavior:'smooth'});return}playing=!playing;$('pauseBtn').textContent=playing?'Pausar':'Continuar';if(!playing)narration.pause();else{if(voiced)void narration.play();sceneStarted=Date.now()}};
$('logout').onclick=logout;$('logout2').onclick=logout;
$('cpbtn').onclick=mkClient;$('atbtn').onclick=mkAtend;$('csbtn').onclick=mkCase;
renderScene();boot();
</script></body></html>`;

export function registerCommercialUi(app: FastifyInstance): void {
  for (let index = 1; index <= 7; index += 1) {
    const filename = `britus-intro-${String(index).padStart(2, "0")}.mp3`;
    app.get(`/assets/narration/${filename}`, async (_request, reply) => {
      await reply
        .type("audio/mpeg")
        .send(createReadStream(new URL(`../../assets/narration/${filename}`, import.meta.url)));
    });
  }
  app.get("/", async (_request, reply) => {
    await reply.type("text/html; charset=utf-8").send(HTML);
  });
}
