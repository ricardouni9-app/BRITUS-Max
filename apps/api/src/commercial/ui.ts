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
.app-shell{max-width:1480px;margin:0 auto;display:grid;grid-template-columns:252px 1fr;min-height:calc(100vh - 61px)}.sidebar{background:#092652;color:#fff;padding:24px 16px}.side-title{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9db8de;margin:20px 12px 8px}.navbtn{width:100%;margin:3px 0;padding:11px 13px;text-align:left;background:transparent;color:#dce9fb;border:1px solid transparent}.navbtn:hover,.navbtn.active{background:rgba(255,255,255,.1);border-color:rgba(244,214,211,.22)}.workspace{padding:28px;background:linear-gradient(145deg,#edf3fb 0 72%,#f3e6d7 100%);min-width:0}.page{display:none}.page.active{display:block}.pagehead{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:20px}.pagehead h1{font-size:27px;margin:0;color:#0b2b5b}.pagehead p{margin:4px 0;color:var(--mut)}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.metric{background:#fff;border:1px solid #dbe5f2;border-radius:14px;padding:18px;box-shadow:0 8px 25px rgba(11,43,91,.06)}.metric small{color:var(--mut);text-transform:uppercase;font-size:10px}.metric strong{font-size:25px;display:block;margin-top:6px;color:#123f7b}.widegrid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;margin-top:16px}.split{display:grid;grid-template-columns:360px 1fr;gap:16px}.tablewrap{overflow:auto}.datatable{width:100%;border-collapse:collapse;font-size:13px}.datatable th{text-align:left;color:#5a6b7b;background:#f5f8fc;padding:10px}.datatable td{padding:11px 10px;border-bottom:1px solid #edf1f5}.formrow{display:grid;grid-template-columns:1fr 1fr;gap:10px}textarea{width:100%;min-height:105px;padding:11px;border:1px solid var(--line);border-radius:8px;font:inherit}.badge{padding:3px 8px;border-radius:999px;background:#e8f1ff;color:#1657a6;font-size:11px}.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}.day{min-height:98px;background:#fff;border:1px solid #dbe5f2;border-radius:10px;padding:8px}.day.has{border-top:3px solid #ec4899;cursor:pointer}.quick{width:auto;margin:0;padding:9px 14px}@media(max-width:1050px){.cards{grid-template-columns:1fr 1fr}.widegrid,.split{grid-template-columns:1fr}.app-shell{grid-template-columns:86px 1fr}.sidebar .navlabel,.side-title{display:none}.workspace{padding:18px}}@media(max-width:650px){.app-shell{display:block}.sidebar{display:flex;overflow:auto;padding:8px}.navbtn{min-width:48px}.workspace{padding:14px}.formrow{grid-template-columns:1fr}.calendar{grid-template-columns:repeat(2,1fr)}}</style></head><body>
<div class="top"><span class="brand">BRITUS<b> · Operações organizadas</b></span><span class="sp"></span>
  <button id="openLogin" class="ghost topcta">Entrar</button>
  <span id="orgtag" class="orgtag hidden"></span>
  <button id="logout" type="button" class="link hidden">Sair</button>
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
  <button id="forgotOpen" class="link">Esqueci minha senha</button>
  <div id="lmsg" class="msg"></div>
  <div id="forgotBox" class="hidden"><label>E-mail cadastrado</label><input id="forgotEmail" type="email" autocomplete="email"/><button id="forgotBtn">Enviar recuperação</button><div id="forgotMsg" class="msg"></div></div>
  <div id="resetBox" class="hidden"><p class="h" style="color:var(--mut);font-size:13px">Defina uma nova senha com pelo menos 10 caracteres.</p><label>Nova senha</label><input id="resetPassword" type="password" minlength="10" autocomplete="new-password"/><button id="resetBtn">Redefinir senha</button><div id="resetMsg" class="msg"></div></div>
</div>

<div id="creatorView" class="wrap hidden" style="max-width:1320px"><div class="pagehead"><div><h1>Console operacional do Criador</h1><p>Gestão do SaaS sem acesso às informações profissionais dos clientes.</p></div><span class="badge">Acesso permanente</span></div><div id="creatorPrivacy" class="pan" style="border-left:4px solid #ec4899;margin-bottom:16px"></div><div class="cards"><div class="metric"><small>Organizações</small><strong id="coOrganizations">0</strong></div><div class="metric"><small>Em teste</small><strong id="coTrials">0</strong></div><div class="metric"><small>Ativas</small><strong id="coActive">0</strong></div><div class="metric"><small>Expiradas</small><strong id="coExpired">0</strong></div></div><div class="widegrid"><div class="pan"><h3>Controle de organizações e SaaS</h3><p class="h">Somente nome, assinatura, vigência e quantidade de usuários.</p><div id="creatorOrganizations" class="tablewrap"></div></div><div><div class="pan"><h3>Operação da plataforma</h3><label class="check"><input id="coMaintenance" type="checkbox"/> Ativar manutenção</label><label>Mensagem de manutenção</label><textarea id="coMaintenanceMessage"></textarea><label>Aviso temporário</label><textarea id="coNotice"></textarea><label>Exibir até</label><input id="coNoticeExpires" type="datetime-local"/><button id="coSaveSettings">Salvar e publicar avisos</button><div id="coSettingsMsg" class="msg"></div></div><div class="pan" style="margin-top:16px"><h3>Saúde operacional</h3><p>API · operacional</p><p>Banco · conectado</p><p>Isolamento de conteúdo · ativo</p></div></div></div><div class="pan" style="margin-top:16px"><h3>Auditoria operacional</h3><div id="creatorAudit"></div></div></div><div id="appView" class="hidden"><div class="app-shell"><aside class="sidebar"><div style="padding:0 12px 12px;font-weight:800;font-size:18px">BRITUS <span style="color:#f3d7d2">MAX</span></div>
<div class="side-title">Visão geral</div><button class="navbtn active" data-page="dashboard">◈ <span class="navlabel">Painel executivo</span></button>
<div class="side-title">Operação</div><button class="navbtn" data-page="clients">♙ <span class="navlabel">Clientes</span></button><button class="navbtn" data-page="atendimentos">◎ <span class="navlabel">Atendimentos</span></button><button class="navbtn" data-page="cases">▣ <span class="navlabel">Casos e controles</span></button><button class="navbtn" data-page="calendar">▦ <span class="navlabel">Calendário</span></button>
<div class="side-title">Gestão</div><button class="navbtn" data-page="finance">◒ <span class="navlabel">Financeiro</span></button><button class="navbtn" data-page="reports">▤ <span class="navlabel">Relatórios</span></button><button class="navbtn" data-page="team">♧ <span class="navlabel">Equipe e pacotes</span></button><button class="navbtn" data-page="settings">⚙ <span class="navlabel">Configurações</span></button></aside>
<main class="workspace"><div id="accessPanel" class="pan" style="margin-bottom:16px"></div>
<section id="page-dashboard" class="page active"><div class="pagehead"><div><h1>Painel executivo</h1><p>Operação e financeiro em uma única visão.</p></div><button class="quick" data-goto="cases">Novo caso</button></div><div class="cards"><div class="metric"><small>Clientes</small><strong id="mClients">0</strong></div><div class="metric"><small>Casos ativos</small><strong id="mCases">0</strong></div><div class="metric"><small>A receber</small><strong id="mReceivable">R$ 0</strong></div><div class="metric"><small>Recebido</small><strong id="mReceived">R$ 0</strong></div></div><div class="widegrid"><div class="pan"><h3>Casos recentes</h3><div id="dashCases"></div></div><div class="pan"><h3>Próximos recebimentos</h3><div id="dashReceivables"></div></div></div></section>
<section id="page-clients" class="page"><div class="pagehead"><div><h1>Clientes</h1><p>Cadastro central e consulta imediata.</p></div></div><div class="split"><div class="pan"><h3>Novo cliente</h3><label>Tipo</label><select id="cptype"><option value="pf">Pessoa física</option><option value="pj">Pessoa jurídica</option></select><label>Nome / Razão social</label><input id="cpname"/><button id="cpbtn">Cadastrar cliente</button><div id="cpmsg" class="msg"></div></div><div class="pan"><div id="cplist"></div></div></div></section>
<section id="page-atendimentos" class="page"><div class="pagehead"><div><h1>Atendimentos</h1><p>Da primeira conversa à contratação.</p></div></div><div class="split"><div class="pan"><h3>Novo atendimento</h3><label>Origem</label><input id="atchan" value="Indicação"/><label>Resumo</label><textarea id="atsum"></textarea><button id="atbtn">Registrar atendimento</button><div id="atmsg" class="msg"></div></div><div class="pan"><div id="atlist"></div></div></div></section>
<section id="page-cases" class="page"><div class="pagehead"><div><h1>Casos e controles</h1><p>Processos jurídicos e trabalhos de qualquer atividade profissional.</p></div></div><div class="split"><div><div class="pan"><h3>Abrir caso</h3><label>Título</label><input id="cstitle"/><label>Classificação financeira</label><select id="csfin"><option value="baixo">Baixo</option><option value="medio" selected>Médio</option><option value="alto">Alto</option></select><button id="csbtn">Abrir caso</button><div id="csmsg" class="msg"></div></div><div class="pan" style="margin-top:16px"><h3>Relato do caso</h3><label>Caso</label><select id="noteCase"></select><textarea id="noteText"></textarea><div class="formrow"><button id="voiceNote" class="ghost">🎙 Ditado por voz</button><button id="saveNote">Salvar relato</button></div><div id="noteMsg" class="msg"></div></div></div><div class="pan"><div id="cslist"></div><h3 style="margin-top:22px">Histórico</h3><div id="notesList"></div></div></div></section>
<section id="page-finance" class="page"><div class="pagehead"><div><h1>Financeiro por caso</h1><p>Conta corrente, pagamentos e saldo.</p></div></div><div class="cards"><div class="metric"><small>Contratado</small><strong id="fContracted">R$ 0</strong></div><div class="metric"><small>Recebido</small><strong id="fPaid">R$ 0</strong></div><div class="metric"><small>Saldo</small><strong id="fBalance">R$ 0</strong></div><div class="metric"><small>Em aberto</small><strong id="fOpen">0</strong></div></div><div class="widegrid"><div class="pan"><h3>Contas dos casos</h3><div id="financeTable"></div></div><div><div class="pan"><h3>Definir valores</h3><label>Caso</label><select id="finCase"></select><div class="formrow"><input id="finQuoted" type="number" step=".01" placeholder="Cobrado no atendimento"/><input id="finContracted" type="number" step=".01" placeholder="Valor fechado"/></div><label>Previsão</label><input id="finExpected" type="date"/><input id="finDesc" placeholder="Descrição"/><button id="saveFinance">Salvar conta</button><div id="finMsg" class="msg"></div></div><div class="pan" style="margin-top:16px"><h3>Registrar pagamento</h3><select id="payCase"></select><div class="formrow"><input id="payAmount" type="number" step=".01" placeholder="Valor"/><input id="payDate" type="date"/></div><input id="payNote" placeholder="Observação"/><button id="savePayment">Registrar e abater saldo</button><div id="payMsg" class="msg"></div></div></div></div></section>
<section id="page-calendar" class="page"><div class="pagehead"><div><h1>Calendário de recebimentos</h1><p>Clique no dia para consultar os casos.</p></div></div><div class="pan"><div id="calendarTitle"></div><div id="calendarGrid" class="calendar"></div></div><div id="calendarDetail" class="pan" style="margin-top:16px"></div></section>
<section id="page-reports" class="page"><div class="pagehead"><div><h1>Relatórios</h1><p>Informações operacionais e financeiras.</p></div><button id="printReport" class="quick">Imprimir / PDF</button></div><div class="widegrid"><div class="pan"><h3>Financeiro</h3><div id="reportFinance"></div></div><div class="pan"><h3>Operação</h3><div id="reportOperations"></div></div></div><div class="pan" style="margin-top:16px"><div id="reportPayments"></div></div></section>
<section id="page-team" class="page"><div class="pagehead"><div><h1>Equipe e pacotes</h1><p>Usuários, acréscimos e ampliações.</p></div></div><div class="widegrid"><div class="pan"><h3>Pacote atual</h3><div id="teamSummary"></div></div><div class="pan"><h3>Configurar ampliação</h3><label>Usuários</label><input id="teamSeats" type="number" min="1" value="1"/><label>Valor por adicional</label><input id="teamPrice" type="number" step=".01"/><button id="saveTeam">Registrar pacote</button><div id="teamMsg" class="msg"></div></div></div></section>
<section id="page-settings" class="page"><div class="pagehead"><div><h1>Configurações</h1><p>Organização e segurança.</p></div></div><div class="widegrid"><div class="pan"><h3>Sessão</h3><div id="sessinfo"></div><button id="logout2" type="button" class="ghost">Encerrar sessão</button></div><div class="pan"><h3>Proteções</h3><p>Dados isolados por organização.</p><p>Aquisições independentes dos demais sistemas.</p><p>Acesso permanente do Criador.</p></div></div></section>
</main></div></div>
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
function creatorTable(h,r){return '<table class="datatable"><tr>'+h.map(x=>'<th>'+x+'</th>').join('')+'</tr>'+r.join('')+'</table>'}
async function loadCreatorOperations(){const r=await api('GET','/creator/operations');if(!r.ok)return;const d=r.data,t=d.totals||{},s=d.settings||{};$('coOrganizations').textContent=t.organizations||0;$('coTrials').textContent=t.trials||0;$('coActive').textContent=t.active||0;$('coExpired').textContent=t.expired||0;$('creatorPrivacy').innerHTML='<h3>Fronteira de privacidade</h3><p>'+d.privacyBoundary+'</p>';$('coMaintenance').checked=!!s.maintenanceMode;$('coMaintenanceMessage').value=s.maintenanceMessage||'';$('coNotice').value=s.temporaryNotice||'';$('creatorOrganizations').innerHTML=creatorTable(['Organização','SaaS','Vigência','Usuários','Ação'],(d.organizations||[]).map(o=>'<tr><td><b>'+o.name+'</b></td><td>'+ (o.subscriptionStatus||'sem assinatura')+'</td><td>'+(o.currentPeriodEndsAt?new Date(o.currentPeriodEndsAt).toLocaleDateString('pt-BR'):'—')+'</td><td>'+o.usersCount+' / '+o.seats+'</td><td><button class="quick coStatus" data-id="'+o.id+'" data-status="'+(o.subscriptionStatus==='active'?'expired':'active')+'">'+(o.subscriptionStatus==='active'?'Suspender':'Reativar')+'</button></td></tr>'));document.querySelectorAll('.coStatus').forEach(b=>b.onclick=async()=>{if(!confirm('Confirma esta alteração operacional do SaaS?'))return;await api('POST','/creator/operations/organizations/'+b.dataset.id,{status:b.dataset.status,currentPeriodEndsAt:b.dataset.status==='active'?new Date(Date.now()+2592000000).toISOString():null});await loadCreatorOperations()});$('creatorAudit').innerHTML=creatorTable(['Data','Ação','Organização'],(d.audit||[]).map(a=>'<tr><td>'+new Date(a.createdAt).toLocaleString('pt-BR')+'</td><td>'+a.action+'</td><td>'+(a.targetOrganizationId||'Plataforma')+'</td></tr>'))}
async function saveCreatorSettings(){const r=await api('POST','/creator/operations/settings',{maintenanceMode:$('coMaintenance').checked,maintenanceMessage:$('coMaintenanceMessage').value,temporaryNotice:$('coNotice').value,noticeExpiresAt:$('coNoticeExpires').value||null});$('coSettingsMsg').className=r.ok?'msg ok':'msg err';$('coSettingsMsg').textContent=r.ok?'Configurações publicadas e auditadas.':errMsg(r.data);if(r.ok)await loadCreatorOperations()}
async function boot(){
  const s=await api('GET','/auth/session');
  if(!s.data||!s.data.authenticated){show('promo');return}
  csrf=s.data.csrfToken;
  if(s.data.subjectType==='creator'){orgtag.textContent='Criador · Operações SaaS';show('creator');await loadCreatorOperations();return}
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
async function requestRecovery(){const email=$('forgotEmail').value.trim();$('forgotMsg').className='msg';$('forgotMsg').textContent='Enviando…';const r=await api('POST','/public/password-recovery',{email});$('forgotMsg').className=r.ok?'msg ok':'msg err';$('forgotMsg').textContent=r.ok?r.data.message:errMsg(r.data)}
async function completePasswordReset(){const token=new URLSearchParams(location.search).get('reset')||'';$('resetMsg').className='msg';$('resetMsg').textContent='Redefinindo…';const r=await api('POST','/public/password-reset',{token,password:$('resetPassword').value});$('resetMsg').className=r.ok?'msg ok':'msg err';$('resetMsg').textContent=r.ok?r.data.message:errMsg(r.data);if(r.ok){history.replaceState({},'',location.pathname);$('resetPassword').value=''}}
async function logout(event){if(event){event.preventDefault();event.stopPropagation()}const buttons=[logout,logout2].filter(Boolean);buttons.forEach(button=>{button.disabled=true;button.textContent='Saindo…'});try{await fetch('/auth/logout',{method:'POST',credentials:'include',cache:'no-store'})}finally{csrf=null;sessionStorage.removeItem('britusTrialEndsAt');location.replace('/?signedout=1')}}
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
$('forgotOpen').onclick=()=>{$('forgotBox').classList.toggle('hidden');$('resetBox').classList.add('hidden')};$('forgotBtn').onclick=requestRecovery;$('resetBtn').onclick=completePasswordReset;
$('openLogin').onclick=()=>show('login');$('trialBtn').onclick=trial;
$('watchBtn').onclick=()=>{playing=true;$('watchBtn').classList.add('hidden');$('skipBtn').classList.add('hidden');$('voiceBtn').classList.remove('hidden');$('pauseBtn').classList.remove('hidden');$('progress').classList.remove('hidden');sceneStarted=Date.now()};
$('skipBtn').onclick=finishPresentation;
$('voiceBtn').onclick=()=>{voiced=!voiced;$('voiceBtn').textContent=voiced?'Desativar narração':'Ativar narração';if(voiced){playing=true;playNarration()}else{narration.pause();sceneStarted=Date.now()}};
$('pauseBtn').onclick=()=>{if(!playing&&sceneIndex===SCENES.length-1){sceneIndex=0;playing=true;renderScene();$('pauseBtn').textContent='Pausar';if(voiced)playNarration();scrollTo({top:0,behavior:'smooth'});return}playing=!playing;$('pauseBtn').textContent=playing?'Pausar':'Continuar';if(!playing)narration.pause();else{if(voiced)void narration.play();sceneStarted=Date.now()}};
$('logout').onclick=logout;$('logout2').onclick=logout;
$('cpbtn').onclick=mkClient;$('atbtn').onclick=mkAtend;$('csbtn').onclick=mkCase;
renderScene();if(new URLSearchParams(location.search).has('reset')){show('login');$('resetBox').classList.remove('hidden');$('forgotBox').classList.add('hidden')}else boot();
</script><script src="/assets/app-v2.js"></script></body></html>`;

export function registerCommercialUi(app: FastifyInstance): void {
  for (let index = 1; index <= 7; index += 1) {
    const filename = `britus-intro-${String(index).padStart(2, "0")}.mp3`;
    app.get(`/assets/narration/${filename}`, async (_request, reply) => {
      await reply
        .type("audio/mpeg")
        .send(createReadStream(new URL(`../../assets/narration/${filename}`, import.meta.url)));
    });
  }
  app.get("/assets/app-v2.js", async (_request, reply) => {
    await reply.type("text/javascript; charset=utf-8").send(createReadStream(new URL("../../assets/app-v2.js", import.meta.url)));
  });
  app.get("/", async (_request, reply) => {
    await reply.type("text/html; charset=utf-8").send(HTML);
  });
}








