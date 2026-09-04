const initialActivities = [
  {key:'C1', name:'Preliminares de obra', pred:'', duration:9},
  {key:'C2', name:'Excavaciones', pred:'C1', duration:2},
  {key:'C3', name:'Cimentaciones', pred:'C2', duration:7},
  {key:'C4', name:'Estructuras', pred:'C3', duration:5},
  {key:'C5', name:'Albañilerías', pred:'C4', duration:28},
  {key:'C6', name:'Losas y cubiertas', pred:'C4', duration:35},
  {key:'C7', name:'Recubrimientos', pred:'C5', duration:33},
  {key:'C8', name:'Paneles', pred:'C5', duration:19},
  {key:'C9', name:'Instalación hidrosanitaria', pred:'C1', duration:1},
  {key:'C10', name:'Instalación eléctrica', pred:'C1', duration:41},
  {key:'C11', name:'Instalaciones especiales', pred:'C4', duration:6},
  {key:'C12', name:'Cancelerías', pred:'C11', duration:2},
  {key:'C13', name:'Limpiezas', pred:'C12', duration:44}
];

let activities = JSON.parse(localStorage.getItem('cpmActivities') || 'null') || structuredClone(initialActivities);
const startInput = document.getElementById('projectStart');
startInput.value = localStorage.getItem('cpmStart') || '2026-09-05';

let pendingDeleteIndex = null;
let currentPreviewType = 'activities';
let lastDatedRows = [];
const calendarUI = { search:'', filter:'all', sort:'start', selectedKey:null };

function topoSort(items){
  const map = Object.fromEntries(items.map(a=>[a.key,a]));
  const visited = new Set(), visiting = new Set(), result=[];
  function visit(k){
    if(visited.has(k)) return;
    if(visiting.has(k)) throw new Error(`Ciclo detectado en ${k}`);
    visiting.add(k);
    const a=map[k]; if(!a) return;
    if(a.pred && map[a.pred]) visit(a.pred);
    visiting.delete(k); visited.add(k); result.push(a);
  }
  items.forEach(a=>visit(a.key));
  return result;
}

function computeCPM(){
  let ordered;
  try { ordered = topoSort(activities); }
  catch(e){ alert(e.message); return []; }
  const byKey = Object.fromEntries(ordered.map(a=>[a.key,{...a}]));
  ordered.forEach(a=>{
    const es = a.pred && byKey[a.pred] ? byKey[a.pred].ef : 0;
    byKey[a.key].es = es;
    byKey[a.key].ef = es + Number(a.duration||0);
  });
  const projectDuration = Math.max(...ordered.map(a=>byKey[a.key].ef),0);
  const succ = {};
  ordered.forEach(a=>succ[a.key]=[]);
  ordered.forEach(a=>{ if(a.pred && succ[a.pred]) succ[a.pred].push(a.key); });
  [...ordered].reverse().forEach(a=>{
    const s=succ[a.key];
    const lf = s.length ? Math.min(...s.map(k=>byKey[k].ls)) : projectDuration;
    byKey[a.key].lf=lf;
    byKey[a.key].ls=lf-Number(a.duration||0);
    byKey[a.key].slack=byKey[a.key].ls-byKey[a.key].es;
    byKey[a.key].critical=Math.abs(byKey[a.key].slack)<1e-9;
  });
  return ordered.map(a=>byKey[a.key]);
}

function addProjectDays(date, days, mode='natural'){
  const d = new Date(date+'T00:00:00');
  if(days===0) return d;
  if(mode==='natural') { d.setDate(d.getDate()+days); return d; }
  let count=0;
  while(count<days){
    d.setDate(d.getDate()+1);
    if(d.getDay()!==0) count++;
  }
  return d;
}
function fmtDate(d){ return d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function getMode(){ return document.getElementById('calendarMode').value; }

function enrichDates(rows){
  const start = startInput.value;
  const mode=getMode();
  return rows.map(r=>({
    ...r,
    startDate:addProjectDays(start,r.es,mode),
    finishDate:addProjectDays(start,r.ef-1,mode)
  }));
}

function render(){
  const rows = computeCPM();
  if(!rows.length) return;
  const dated=enrichDates(rows);
  lastDatedRows = dated;
  localStorage.setItem('cpmActivities',JSON.stringify(activities));
  localStorage.setItem('cpmStart',startInput.value);
  renderKPIs(dated);
  renderActivityTable(rows);
  renderCPM(rows);
  renderCalendar(dated);
  renderGantt(dated);
  renderNetwork(rows);
}

function renderKPIs(rows){
  const duration=Math.max(...rows.map(r=>r.ef),0);
  const projectFinish=addProjectDays(startInput.value,duration-1,getMode());
  const critical=rows.filter(r=>r.critical);
  document.getElementById('kpiDuration').textContent=`${duration} días`;
  document.getElementById('kpiFinish').textContent=fmtDate(projectFinish);
  document.getElementById('kpiCritical').textContent=critical.length;
  document.getElementById('kpiRoute').textContent=critical.sort((a,b)=>a.es-b.es).map(r=>r.key).join(' → ');
}

function renderActivityTable(rows){
  const tbody=document.querySelector('#activityTable tbody');
  tbody.innerHTML='';
  rows.forEach((r,i)=>{
    const tr=document.createElement('tr');
    if(r.critical) tr.classList.add('critical-row');
    tr.innerHTML=`
      <td><input data-i="${i}" data-f="key" value="${r.key}"></td>
      <td><input data-i="${i}" data-f="name" value="${r.name}"></td>
      <td><input data-i="${i}" data-f="pred" value="${r.pred||''}"></td>
      <td><input type="number" min="0" data-i="${i}" data-f="duration" value="${r.duration}"></td>
      <td>${r.es}</td><td>${r.ef}</td><td>${r.ls}</td><td>${r.lf}</td>
      <td class="slack-cell">${r.slack}</td><td>${r.critical?'CRÍTICA':'No crítica'}</td>
      <td><button class="remove-btn" data-remove="${i}" title="Eliminar actividad" aria-label="Eliminar ${r.key}">×</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('input').forEach(el=>el.addEventListener('change',e=>{
    const i=+e.target.dataset.i, f=e.target.dataset.f;
    activities[i][f]=f==='duration'?Number(e.target.value):e.target.value.trim(); render();
  }));
  tbody.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    openDeleteConfirmation(+btn.dataset.remove);
  }));
}

function slackClass(v,max){ if(v===0) return 'slack-0'; if(v <= max*.33) return 'slack-low'; return 'slack-high'; }
function renderCPM(rows){
  const tbody=document.querySelector('#cpmTable tbody'); tbody.innerHTML='';
  const max=Math.max(...rows.map(r=>r.slack),1);
  rows.forEach(r=>{
    const tr=document.createElement('tr'); if(r.critical) tr.classList.add('critical-row');
    tr.innerHTML=`<td>${r.key}</td><td>${r.name}</td><td>${r.duration}</td><td>${r.es}</td><td>${r.ef}</td><td>${r.ls}</td><td>${r.lf}</td><td class="${slackClass(r.slack,max)}">${r.slack}</td><td>${r.critical?'CRÍTICA':'No crítica'}</td>`;
    tbody.appendChild(tr);
  });
}

function renderCalendar(rows){
  const tbody=document.querySelector('#calendarTable tbody'); tbody.innerHTML='';
  const term=calendarUI.search.trim().toLowerCase();
  let view=rows.filter(r=>{
    const matchesText=!term || `${r.key} ${r.name}`.toLowerCase().includes(term);
    const matchesFilter=calendarUI.filter==='all' || (calendarUI.filter==='critical' && r.critical) || (calendarUI.filter==='noncritical' && !r.critical);
    return matchesText && matchesFilter;
  });
  view=[...view].sort((a,b)=>{
    if(calendarUI.sort==='finish') return a.finishDate-b.finishDate || a.startDate-b.startDate;
    if(calendarUI.sort==='key') return a.key.localeCompare(b.key,undefined,{numeric:true});
    if(calendarUI.sort==='slack') return a.slack-b.slack || a.es-b.es;
    return a.startDate-b.startDate || a.finishDate-b.finishDate;
  });
  view.forEach(r=>{
    const tr=document.createElement('tr');
    if(r.critical) tr.classList.add('critical-row');
    if(calendarUI.selectedKey===r.key) tr.classList.add('calendar-selected');
    tr.tabIndex=0;
    tr.dataset.key=r.key;
    tr.innerHTML=`<td>${r.key}</td><td>${r.name}</td><td>${fmtDate(r.startDate)}</td><td>${fmtDate(r.finishDate)}</td><td>${r.duration}</td><td>${r.pred||'—'}</td><td>${r.slack}</td><td>${r.critical?'Sí':'No'}</td>`;
    tr.addEventListener('click',()=>selectCalendarRow(r));
    tr.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectCalendarRow(r); } });
    tbody.appendChild(tr);
  });
  const total=rows.length, critical=rows.filter(r=>r.critical).length;
  const summary=document.getElementById('calendarSummary');
  summary.innerHTML=`<span><b>${view.length}</b> de ${total} actividades visibles</span><span><b>${critical}</b> críticas</span><span>Selecciona una fila para consultar su detalle.</span>`;
  if(!view.some(r=>r.key===calendarUI.selectedKey)){
    calendarUI.selectedKey=null;
    document.getElementById('calendarDetail').hidden=true;
  }
}

function selectCalendarRow(r){
  calendarUI.selectedKey=r.key;
  const detail=document.getElementById('calendarDetail');
  detail.hidden=false;
  detail.innerHTML=`
    <div><span>Actividad seleccionada</span><strong>${r.key} · ${r.name}</strong></div>
    <div><span>Inicio</span><strong>${fmtDate(r.startDate)}</strong></div>
    <div><span>Fin</span><strong>${fmtDate(r.finishDate)}</strong></div>
    <div><span>Duración</span><strong>${r.duration} días</strong></div>
    <div><span>Holgura</span><strong>${r.slack} días</strong></div>
    <div><span>Condición</span><strong>${r.critical?'Ruta crítica':'No crítica'}</strong></div>`;
  renderCalendar(lastDatedRows);
}

function renderGantt(rows){
  const duration=Math.max(...rows.map(r=>r.ef),0);
  const wrap=document.getElementById('ganttWrap');
  const grid=document.createElement('div'); grid.className='gantt-grid'; grid.style.setProperty('--days',duration);
  const head=document.createElement('div'); head.className='gantt-head';
  head.innerHTML='<div>Clave</div><div>Actividad</div>';
  for(let d=0;d<duration;d++){
    const date=addProjectDays(startInput.value,d,getMode());
    const cell=document.createElement('div'); cell.textContent=`${date.getDate()}/${date.getMonth()+1}`; head.appendChild(cell);
  }
  grid.appendChild(head);
  rows.forEach(r=>{
    const row=document.createElement('div'); row.className='gantt-row';
    row.innerHTML=`<div>${r.key}</div><div class="label">${r.name}</div>`;
    for(let d=0;d<duration;d++){
      const c=document.createElement('div'); c.className='day';
      const date=addProjectDays(startInput.value,d,getMode());
      if(getMode()==='natural' && (date.getDay()===0||date.getDay()===6)) c.classList.add('weekend');
      if(d>=r.es && d<r.ef) c.classList.add(r.critical?'bar-critical':'bar-normal');
      row.appendChild(c);
    }
    grid.appendChild(row);
  });
  wrap.innerHTML=''; wrap.appendChild(grid);
}

function renderNetwork(rows){
  const canvas=document.getElementById('networkCanvas'); canvas.innerHTML='';
  const levelGap=220,rowGap=125;
  const levelByKey={};
  rows.forEach(r=> levelByKey[r.key] = r.pred ? (levelByKey[r.pred]||0)+1 : 0);
  const groups={}; rows.forEach(r=> (groups[levelByKey[r.key]] ||= []).push(r));
  const pos={};
  Object.entries(groups).forEach(([lvl,arr])=>{
    arr.forEach((r,idx)=>{
      const x=30+Number(lvl)*levelGap, y=40+idx*rowGap;
      pos[r.key]={x,y};
      const n=document.createElement('div'); n.className='node'+(r.critical?' critical':''); n.style.left=x+'px'; n.style.top=y+'px';
      n.innerHTML=`<h4>${r.key} · ${r.name}</h4><p>Duración: ${r.duration} días</p><p>ES–EF: ${r.es}–${r.ef}</p><p>LS–LF: ${r.ls}–${r.lf}</p><p>Holgura: ${r.slack}</p>`;
      canvas.appendChild(n);
    });
  });
  rows.filter(r=>r.pred && pos[r.pred] && pos[r.key]).forEach(r=>{
    const a=pos[r.pred], b=pos[r.key];
    const x1=a.x+180,y1=a.y+54,x2=b.x,y2=b.y+54;
    const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
    const line=document.createElement('div'); line.className='connector'+(r.critical && rows.find(x=>x.key===r.pred)?.critical?' critical':'');
    line.style.left=x1+'px';line.style.top=y1+'px';line.style.width=len+'px';line.style.transform=`rotate(${ang}deg)`;canvas.appendChild(line);
  });
}

function openDeleteConfirmation(index){
  pendingDeleteIndex=index;
  const a=activities[index];
  document.getElementById('confirmMessage').textContent=`Vas a eliminar “${a?.key || ''} · ${a?.name || 'esta actividad'}”. Esta acción no se podrá recuperar. Si otra actividad utiliza esta clave como predecesora, deberás corregir esa relación manualmente.`;
  setModalState(document.getElementById('confirmModal'),true);
}
function closeDeleteConfirmation(){
  pendingDeleteIndex=null;
  setModalState(document.getElementById('confirmModal'),false);
}
function setModalState(modal,open){
  modal.classList.toggle('open',open);
  modal.setAttribute('aria-hidden',open?'false':'true');
  document.body.classList.toggle('modal-open',!!document.querySelector('.modal-backdrop.open'));
}
function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function getPreviewTitle(type){
  return ({activities:'Hoja de actividades',gantt:'Diagrama de Gantt',cpm:'Método de la Ruta Crítica (CPM)',calendar:'Calendarización',network:'Red CPM'})[type] || 'Programa de obra';
}
function getPreviewContent(type,rows){
  const table=(headers,body)=>`<table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body.map(cells=>`<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  if(type==='activities'){
    return table(['Clave','Actividad','Predecesora','Duración','ES','EF','LS','LF','Holgura','Crítica'],rows.map(r=>[r.key,escapeHtml(r.name),r.pred||'—',r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'CRÍTICA':'No crítica']));
  }
  if(type==='cpm'){
    return table(['Clave','Actividad','Duración','ES','EF','LS','LF','Holgura','Clasificación'],rows.map(r=>[r.key,escapeHtml(r.name),r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'CRÍTICA':'No crítica']));
  }
  if(type==='calendar'){
    return table(['Clave','Actividad','Inicio','Fin','Duración','Predecesora','Holgura','Ruta crítica'],rows.map(r=>[r.key,escapeHtml(r.name),fmtDate(r.startDate),fmtDate(r.finishDate),r.duration,r.pred||'—',r.slack,r.critical?'Sí':'No']));
  }
  if(type==='gantt'){
    const duration=Math.max(...rows.map(r=>r.ef),0);
    const scale=Array.from({length:duration},(_,d)=>`<div class="g-day-label">${addProjectDays(startInput.value,d,getMode()).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'})}</div>`).join('');
    const bars=rows.map(r=>`<div class="g-row"><div class="g-name"><b>${escapeHtml(r.key)}</b><span>${escapeHtml(r.name)}</span></div><div class="g-track" style="--d:${duration}">${Array.from({length:duration},(_,d)=>`<i class="${d>=r.es&&d<r.ef?(r.critical?'crit':'norm'):''}"></i>`).join('')}</div></div>`).join('');
    return `<div class="g-preview"><div class="g-head"><div>Actividad</div><div class="g-scale" style="--d:${duration}">${scale}</div></div>${bars}</div>`;
  }
  if(type==='network'){
    const ordered=[...rows].sort((a,b)=>a.es-b.es || a.key.localeCompare(b.key,undefined,{numeric:true}));
    return `<div class="network-preview">${ordered.map(r=>`<article class="p-node ${r.critical?'critical':''}"><h4>${escapeHtml(r.key)} · ${escapeHtml(r.name)}</h4><p>Duración: ${r.duration} días</p><p>Predecesora: ${escapeHtml(r.pred||'—')}</p><p>ES–EF: ${r.es}–${r.ef}</p><p>LS–LF: ${r.ls}–${r.lf}</p><p>Holgura: ${r.slack}</p></article>`).join('<span class="flow">→</span>')}</div>`;
  }
  return '';
}
function buildPreviewDocument(){
  const rows=enrichDates(computeCPM());
  const title=document.getElementById('previewTitle').value.trim() || getPreviewTitle(currentPreviewType);
  const subtitle=document.getElementById('previewSubtitle').value.trim();
  const author=document.getElementById('previewAuthor').value.trim();
  const note=document.getElementById('previewNote').value.trim();
  const orientation=document.getElementById('previewOrientation').value;
  const showKPIs=document.getElementById('previewShowKPIs').checked;
  const duration=Math.max(...rows.map(r=>r.ef),0);
  const finish=addProjectDays(startInput.value,duration-1,getMode());
  const critical=rows.filter(r=>r.critical).sort((a,b)=>a.es-b.es);
  const kpis=showKPIs?`<section class="summary"><div><span>Inicio</span><b>${fmtDate(new Date(startInput.value+'T00:00:00'))}</b></div><div><span>Fin programado</span><b>${fmtDate(finish)}</b></div><div><span>Duración</span><b>${duration} días</b></div><div><span>Ruta crítica</span><b>${critical.map(r=>escapeHtml(r.key)).join(' → ')}</b></div></section>`:'';
  const content=getPreviewContent(currentPreviewType,rows);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
  @page{size:A4 ${orientation};margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#fff;font-size:11px}header{border-bottom:3px solid #244a73;padding-bottom:10px;margin-bottom:14px}header small{display:block;text-transform:uppercase;letter-spacing:.12em;color:#64748b;font-weight:700}h1{font-size:23px;margin:5px 0 4px;color:#17365d}header p{margin:3px 0;color:#475569}.author{font-weight:700;color:#244a73!important}.note{white-space:pre-wrap}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 16px}.summary div{border:1px solid #dbe3ee;border-radius:8px;padding:8px}.summary span{display:block;color:#64748b;font-size:9px;font-weight:700}.summary b{display:block;margin-top:4px;font-size:11px}table{width:100%;border-collapse:collapse}th{background:#eaf0f6;color:#17365d;text-align:left}th,td{padding:6px 7px;border:1px solid #dbe3ee}.g-preview{overflow:hidden}.g-head,.g-row{display:grid;grid-template-columns:180px 1fr}.g-head>div{font-weight:700;background:#eef3f8;padding:6px}.g-scale,.g-track{display:grid;grid-template-columns:repeat(var(--d),minmax(5px,1fr))}.g-day-label{font-size:6.5px;text-align:center;writing-mode:vertical-rl;transform:rotate(180deg);padding:2px 0;border-left:1px solid #e8edf3}.g-row{border-bottom:1px solid #e8edf3}.g-name{padding:5px;display:flex;gap:5px;align-items:center}.g-name span{font-size:9px}.g-track i{height:22px;border-left:1px solid #eef2f6}.g-track i.crit{background:#b42318}.g-track i.norm{background:#4f8fbd}.network-preview{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.p-node{width:165px;border:2px solid #244a73;border-radius:8px;padding:8px;background:#eef5fb;break-inside:avoid}.p-node.critical{border-color:#b42318;background:#fee4e2}.p-node h4{margin:0 0 5px;font-size:10px}.p-node p{margin:2px 0;color:#475569;font-size:8.5px}.flow{font-size:18px;color:#94a3b8}footer{margin-top:18px;border-top:1px solid #dbe3ee;padding-top:7px;color:#64748b;font-size:8px;display:flex;justify-content:space-between}
  </style></head><body><header><small>Programación y control de obra</small><h1>${escapeHtml(title)}</h1>${subtitle?`<p>${escapeHtml(subtitle)}</p>`:''}${author?`<p class="author">${escapeHtml(author)}</p>`:''}${note?`<p class="note">${escapeHtml(note)}</p>`:''}</header>${kpis}<main>${content}</main><footer><span>${escapeHtml(author||'Luis Diego Peregrina García')}</span><span>Generado con Gantt + CPM</span></footer></body></html>`;
}
function updatePreviewFrame(){
  const frame=document.getElementById('previewFrame');
  frame.srcdoc=buildPreviewDocument();
}
function openPreview(type){
  currentPreviewType=type;
  document.getElementById('previewModalTitle').textContent=`Vista previa · ${getPreviewTitle(type)}`;
  document.getElementById('previewTitle').value=getPreviewTitle(type);
  setModalState(document.getElementById('previewModal'),true);
  updatePreviewFrame();
}
function closePreview(){ setModalState(document.getElementById('previewModal'),false); }
function downloadPreviewHtml(){
  const html=buildPreviewDocument();
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`${currentPreviewType}_cpm.html`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function printPreview(){
  const frame=document.getElementById('previewFrame');
  frame.contentWindow.focus();
  frame.contentWindow.print();
}

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active')); document.getElementById(tab.dataset.tab).classList.add('active');
}));
startInput.addEventListener('change',render);
document.getElementById('calendarMode').addEventListener('change',render);
document.getElementById('addRowBtn').addEventListener('click',()=>{ activities.push({key:`C${activities.length+1}`,name:'Nueva actividad',pred:'',duration:1}); render(); });
document.getElementById('resetBtn').addEventListener('click',()=>{ activities=structuredClone(initialActivities); startInput.value='2026-09-05'; localStorage.clear(); render(); });
document.getElementById('exportBtn').addEventListener('click',()=>{
  const rows=enrichDates(computeCPM());
  const csv=[['Clave','Actividad','Predecesora','Duración','ES','EF','LS','LF','Holgura','Crítica','Inicio','Fin'],...rows.map(r=>[r.key,r.name,r.pred,r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'Sí':'No',fmtDate(r.startDate),fmtDate(r.finishDate)])]
    .map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  const blob=new Blob(["\ufeff"+csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='programa_obra_cpm.csv'; a.click(); URL.revokeObjectURL(a.href);
});

document.getElementById('confirmCancel').addEventListener('click',closeDeleteConfirmation);
document.getElementById('confirmDelete').addEventListener('click',()=>{
  if(pendingDeleteIndex!==null){ activities.splice(pendingDeleteIndex,1); closeDeleteConfirmation(); render(); }
});
document.getElementById('confirmModal').addEventListener('click',e=>{ if(e.target.id==='confirmModal') closeDeleteConfirmation(); });

document.querySelectorAll('.preview-btn').forEach(btn=>btn.addEventListener('click',()=>openPreview(btn.dataset.preview)));
document.getElementById('previewClose').addEventListener('click',closePreview);
document.getElementById('previewModal').addEventListener('click',e=>{ if(e.target.id==='previewModal') closePreview(); });
['previewTitle','previewSubtitle','previewAuthor','previewNote','previewOrientation','previewShowKPIs'].forEach(id=>{
  const el=document.getElementById(id);
  el.addEventListener(el.type==='checkbox'||el.tagName==='SELECT'?'change':'input',updatePreviewFrame);
});
document.getElementById('previewDownload').addEventListener('click',downloadPreviewHtml);
document.getElementById('previewPrint').addEventListener('click',printPreview);

document.getElementById('calendarSearch').addEventListener('input',e=>{ calendarUI.search=e.target.value; renderCalendar(lastDatedRows); });
document.getElementById('calendarCriticalFilter').addEventListener('change',e=>{ calendarUI.filter=e.target.value; renderCalendar(lastDatedRows); });
document.getElementById('calendarSort').addEventListener('change',e=>{ calendarUI.sort=e.target.value; renderCalendar(lastDatedRows); });
document.getElementById('calendarClearFilters').addEventListener('click',()=>{
  calendarUI.search=''; calendarUI.filter='all'; calendarUI.sort='start'; calendarUI.selectedKey=null;
  document.getElementById('calendarSearch').value='';
  document.getElementById('calendarCriticalFilter').value='all';
  document.getElementById('calendarSort').value='start';
  document.getElementById('calendarDetail').hidden=true;
  renderCalendar(lastDatedRows);
});

document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeDeleteConfirmation(); closePreview(); } });

render();
