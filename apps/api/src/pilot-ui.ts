import type { FastifyInstance } from "fastify";

// UI de PILOTO (same-origin) — servida APENAS em modo demonstração (enableTestRoutes).
// Zero dependência nova: HTML/JS vanilla embutido, servido pela própria API, exercitando
// os endpoints reais (sessão + CSRF para /clients; contexto de teste para atendimento/caso).
// O tenant continua derivado no servidor; a UI é transporte puro (ver eng.slice/eng.tenancy).
const ORG = "01920000-0000-7000-8000-00000000000a";
const AREA = "01920000-0000-7000-8000-000000000001";

const HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>BRITUS — Piloto</title>
<style>
:root{--bg:#0f1216;--card:#181d24;--line:#2a323d;--txt:#e8edf2;--mut:#93a1b0;--acc:#4c8bf5;--ok:#2ecc71;--err:#ff6b6b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 system-ui,Segoe UI,sans-serif}
header{padding:16px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:10px}
header b{font-size:16px}header span{color:var(--mut);font-size:12px}
main{max-width:1040px;margin:0 auto;padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}
.card h2{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.5px;color:var(--mut)}
label{display:block;font-size:12px;color:var(--mut);margin:8px 0 3px}
input{width:100%;padding:8px 10px;background:#0f1319;border:1px solid var(--line);border-radius:6px;color:var(--txt)}
button{margin-top:10px;padding:9px 12px;background:var(--acc);color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:600}
button.sec{background:#26303c}button:disabled{opacity:.5;cursor:not-allowed}
.full{grid-column:1/3}.row{display:flex;gap:8px;flex-wrap:wrap}
#log{grid-column:1/3;background:#0b0e12;border:1px solid var(--line);border-radius:10px;padding:14px;min-height:160px;white-space:pre-wrap;font:12px/1.55 ui-monospace,Consolas,monospace}
.ok{color:var(--ok)}.err{color:var(--err)}.mut{color:var(--mut)}
</style></head><body>
<header><b>BRITUS</b><span>Piloto operacional • armazenamento em memória • fluxo: login → cliente → atendimento → caso</span></header>
<main>
  <div class="card full">
    <h2>1 · Executar fluxo completo</h2>
    <p class="mut">Provisiona operador, autentica, seleciona organização, cria cliente, registra atendimento e abre caso — de ponta a ponta.</p>
    <button id="runAll">▶ Rodar fluxo completo</button>
    <button class="sec" id="reset">Limpar log</button>
  </div>

  <div class="card">
    <h2>2 · Credenciais do operador</h2>
    <label>E-mail</label><input id="email" value="piloto@britus.test"/>
    <label>Senha</label><input id="password" value="piloto-forte-123"/>
    <div class="row">
      <button id="seed">Provisionar operador</button>
      <button class="sec" id="login">Login</button>
      <button class="sec" id="selorg">Selecionar organização</button>
    </div>
  </div>

  <div class="card">
    <h2>3 · Cliente</h2>
    <label>Nome</label><input id="cname" value="Cliente Piloto Ltda"/>
    <label>Tipo (pf/pj)</label><input id="ctype" value="pj"/>
    <button id="mkclient">Criar cliente (sessão + CSRF)</button>
  </div>

  <div class="card">
    <h2>4 · Atendimento</h2>
    <label>Resumo</label><input id="asum" value="Primeiro contato — demanda trabalhista"/>
    <button id="mkatd">Registrar atendimento</button>
  </div>

  <div class="card">
    <h2>5 · Caso</h2>
    <label>Título</label><input id="ctitle" value="Reclamatória Trabalhista"/>
    <label>Classificação (alto/medio/baixo)</label><input id="cfin" value="medio"/>
    <button id="mkcase">Abrir caso</button>
  </div>

  <div id="log"><span class="mut">Pronto. Clique em "Rodar fluxo completo".</span></div>
</main>
<script>
const ORG=${JSON.stringify(ORG)}, AREA=${JSON.stringify(AREA)};
let csrf=null, userId=null;
const L=document.getElementById('log');
function log(m,c){L.innerHTML+='\\n'+(c?'<span class="'+c+'">'+m+'</span>':m)}
async function api(method,url,body,headers){
  const r=await fetch(url,{method,credentials:'include',headers:Object.assign({'content-type':'application/json'},headers||{}),body:body?JSON.stringify(body):undefined});
  let d=null;try{d=await r.json()}catch{}
  return {status:r.status,data:d};
}
function devCtx(){return JSON.stringify({identityType:'organization_user',userId:userId,memberships:[{organizationId:ORG,role:'owner'}],organizationId:ORG})}
async function seed(){
  const email=email0.value,password=password0.value;
  const r=await api('POST','/__dev/seed-operator',{email,password,organizationId:ORG,role:'owner'});
  if(r.status===201){userId=r.data.userId;log('✓ operador provisionado userId='+userId,'ok')}else log('✗ seed '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===201;
}
async function login(){
  const r=await api('POST','/auth/login',{email:email0.value,password:password0.value});
  if(r.status===200){csrf=r.data.csrfToken;log('✓ login ok (csrf capturado, cookie httpOnly setado)','ok')}else log('✗ login '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===200;
}
async function selorg(){
  const r=await api('POST','/auth/active-organization',{organizationId:ORG});
  if(r.status===200)log('✓ organização ativa selecionada','ok');else log('✗ active-org '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===200;
}
async function mkclient(){
  const body={personType:ctype.value.trim(),displayName:cname.value.trim()};
  const r=await api('POST','/clients',body,{'x-csrf-token':csrf||''});
  if(r.status===201)log('✓ cliente criado id='+r.data.id+' ('+r.data.displayName+')','ok');else log('✗ cliente '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===201;
}
async function mkatd(){
  const r=await api('POST','/__dev/authorized/atendimentos',{summary:asum.value.trim(),channelOrigin:'piloto'},{'x-dev-authz-context':devCtx()});
  if(r.status===201)log('✓ atendimento registrado id='+r.data.id+' status='+r.data.status,'ok');else log('✗ atendimento '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===201;
}
async function mkcase(){
  const body={areaId:AREA,workTypeId:AREA,title:ctitle.value.trim(),financialClassification:cfin.value.trim()};
  const r=await api('POST','/__dev/authorized/cases',body,{'x-dev-authz-context':devCtx()});
  if(r.status===201)log('✓ caso aberto id='+r.data.id+' status='+r.data.status,'ok');else log('✗ caso '+r.status+' '+JSON.stringify(r.data),'err');
  return r.status===201;
}
const email0=document.getElementById('email'),password0=document.getElementById('password');
const ctype=document.getElementById('ctype'),cname=document.getElementById('cname');
const asum=document.getElementById('asum'),ctitle=document.getElementById('ctitle'),cfin=document.getElementById('cfin');
document.getElementById('seed').onclick=seed;
document.getElementById('login').onclick=login;
document.getElementById('selorg').onclick=selorg;
document.getElementById('mkclient').onclick=mkclient;
document.getElementById('mkatd').onclick=mkatd;
document.getElementById('mkcase').onclick=mkcase;
document.getElementById('reset').onclick=()=>{L.innerHTML='<span class="mut">Log limpo.</span>'};
document.getElementById('runAll').onclick=async()=>{
  L.innerHTML='<b>Fluxo completo</b>';
  if(!await seed())return; if(!await login())return; if(!await selorg())return;
  if(!await mkclient())return; if(!await mkatd())return; if(!await mkcase())return;
  log('\\n★ FLUXO COMPLETO OK — login, cliente, atendimento e caso criados de ponta a ponta.','ok');
};
</script></body></html>`;

export function registerPilotUi(app: FastifyInstance): void {
  app.get("/", async (_request, reply) => {
    await reply.type("text/html; charset=utf-8").send(HTML);
  });
}
