const AUTHOR = 'Luis Diego Peregrina García';
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
let pendingDeleteKey = null;
const startInput = document.getElementById('projectStart');
startInput.value = localStorage.getItem('cpmStart') || '2026-09-05';

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
function escapeHtml(value){ return String(value ?? '').replace(/[&<>'"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;' }[c])); }
function safeName(value){ return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase(); }

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
  rows.forEach(r=>{
    const tr=document.createElement('tr');
    if(r.critical) tr.classList.add('critical-row');
    tr.innerHTML=`
      <td><input data-key="${escapeHtml(r.key)}" data-f="key" value="${escapeHtml(r.key)}"></td>
      <td><input data-key="${escapeHtml(r.key)}" data-f="name" value="${escapeHtml(r.name)}"></td>
      <td><input data-key="${escapeHtml(r.key)}" data-f="pred" value="${escapeHtml(r.pred||'')}"></td>
      <td><input type="number" min="0" data-key="${escapeHtml(r.key)}" data-f="duration" value="${r.duration}"></td>
      <td>${r.es}</td><td>${r.ef}</td><td>${r.ls}</td><td>${r.lf}</td>
      <td class="slack-cell">${r.slack}</td><td>${r.critical?'CRÍTICA':'No crítica'}</td>
      <td><button class="remove-btn" data-remove="${escapeHtml(r.key)}" title="Eliminar actividad" aria-label="Eliminar ${escapeHtml(r.key)}">×</button></td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('input').forEach(el=>el.addEventListener('change',e=>{
    const originalKey=e.target.dataset.key, f=e.target.dataset.f;
    const index=activities.findIndex(a=>a.key===originalKey);
    if(index<0) return;
    const oldKey=activities[index].key;
    const newValue=f==='duration'?Number(e.target.value):e.target.value.trim();
    activities[index][f]=newValue;
    if(f==='key' && newValue && newValue!==oldKey){
      activities.forEach(a=>{ if(a.pred===oldKey) a.pred=newValue; });
    }
    render();
  }));
  tbody.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>openDeleteModal(btn.dataset.remove)));
}

function openDeleteModal(key){
  const rows=computeCPM();
  const row=rows.find(r=>r.key===key);
  if(!row) return;
  pendingDeleteKey=key;
  document.getElementById('deleteMessage').innerHTML=`Estás a punto de eliminar <strong>${escapeHtml(row.key)} — ${escapeHtml(row.name)}</strong>. Al confirmar, la actividad se quitará de la hoja de actividades y se recalcularán las vistas vinculadas.`;
  document.getElementById('criticalWarning').hidden=!row.critical;
  const modal=document.getElementById('deleteModal');
  modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  document.getElementById('cancelDeleteBtn').focus();
}
function closeDeleteModal(){
  pendingDeleteKey=null;
  const modal=document.getElementById('deleteModal');
  modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
}
function confirmDelete(){
  if(!pendingDeleteKey) return closeDeleteModal();
  const key=pendingDeleteKey;
  activities=activities.filter(a=>a.key!==key);
  activities.forEach(a=>{ if(a.pred===key) a.pred=''; });
  closeDeleteModal();
  render();
}

function slackClass(v,max){ if(v===0) return 'slack-0'; if(v <= max*.33) return 'slack-low'; return 'slack-high'; }
function renderCPM(rows){
  const tbody=document.querySelector('#cpmTable tbody'); tbody.innerHTML='';
  const max=Math.max(...rows.map(r=>r.slack),1);
  rows.forEach(r=>{
    const tr=document.createElement('tr'); if(r.critical) tr.classList.add('critical-row');
    tr.innerHTML=`<td>${escapeHtml(r.key)}</td><td>${escapeHtml(r.name)}</td><td>${r.duration}</td><td>${r.es}</td><td>${r.ef}</td><td>${r.ls}</td><td>${r.lf}</td><td class="${slackClass(r.slack,max)}">${r.slack}</td><td>${r.critical?'CRÍTICA':'No crítica'}</td>`;
    tbody.appendChild(tr);
  });
}

function renderCalendar(rows){
  const tbody=document.querySelector('#calendarTable tbody'); tbody.innerHTML='';
  rows.forEach(r=>{
    const tr=document.createElement('tr'); if(r.critical) tr.classList.add('critical-row');
    tr.innerHTML=`<td>${escapeHtml(r.key)}</td><td>${escapeHtml(r.name)}</td><td>${fmtDate(r.startDate)}</td><td>${fmtDate(r.finishDate)}</td><td>${r.duration}</td><td>${escapeHtml(r.pred||'—')}</td><td>${r.slack}</td><td>${r.critical?'Sí':'No'}</td>`;
    tbody.appendChild(tr);
  });
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
    row.innerHTML=`<div>${escapeHtml(r.key)}</div><div class="label">${escapeHtml(r.name)}</div>`;
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
      n.innerHTML=`<h4>${escapeHtml(r.key)} · ${escapeHtml(r.name)}</h4><p>Duración: ${r.duration} días</p><p>ES–EF: ${r.es}–${r.ef}</p><p>LS–LF: ${r.ls}–${r.lf}</p><p>Holgura: ${r.slack}</p>`;
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

function rowsForExport(type){
  const rows=enrichDates(computeCPM());
  if(type==='activities') return [
    ['Clave','Actividad','Predecesora','Duración','ES','EF','LS','LF','Holgura','Crítica'],
    ...rows.map(r=>[r.key,r.name,r.pred,r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'Sí':'No'])
  ];
  if(type==='cpm') return [
    ['Clave','Actividad','Duración','ES','EF','LS','LF','Holgura','Clasificación'],
    ...rows.map(r=>[r.key,r.name,r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'CRÍTICA':'No crítica'])
  ];
  if(type==='calendar') return [
    ['Clave','Actividad','Inicio','Fin','Duración','Predecesora','Holgura','Ruta crítica'],
    ...rows.map(r=>[r.key,r.name,fmtDate(r.startDate),fmtDate(r.finishDate),r.duration,r.pred,r.slack,r.critical?'Sí':'No'])
  ];
  if(type==='network') return [
    ['Clave','Actividad','Predecesora','Duración','ES','EF','LS','LF','Holgura','Crítica'],
    ...rows.map(r=>[r.key,r.name,r.pred,r.duration,r.es,r.ef,r.ls,r.lf,r.slack,r.critical?'Sí':'No'])
  ];
  if(type==='gantt'){
    const duration=Math.max(...rows.map(r=>r.ef),0);
    const dates=Array.from({length:duration},(_,d)=>fmtDate(addProjectDays(startInput.value,d,getMode())));
    return [
      ['Clave','Actividad',...dates],
      ...rows.map(r=>[r.key,r.name,...Array.from({length:duration},(_,d)=>d>=r.es&&d<r.ef?(r.critical?'CRÍTICA':'PROGRAMADA'):'')])
    ];
  }
  return [];
}

function csvText(aoa){
  return '\ufeff'+aoa.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
}
function downloadBlob(content,type,filename){
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
function downloadCSV(type){
  downloadBlob(csvText(rowsForExport(type)),'text/csv;charset=utf-8;',`${safeName(type)}_gantt_cpm.csv`);
}

function exportWorkbook(){
  if(typeof XLSX==='undefined'){
    alert('No se pudo cargar el componente de exportación XLSX. Puedes descargar cada apartado en CSV de forma individual.');
    return;
  }
  const wb=XLSX.utils.book_new();
  const sheets=[['Actividades','activities'],['Gantt','gantt'],['CPM','cpm'],['Calendarizacion','calendar'],['Red_CPM','network']];
  sheets.forEach(([name,type])=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rowsForExport(type)),name));
  XLSX.writeFile(wb,'programa_obra_gantt_cpm_completo.xlsx');
}

async function makePreview(type){
  const titles={activities:'Hoja de actividades',gantt:'Diagrama de Gantt',cpm:'Método CPM',calendar:'Calendarización',network:'Red CPM'};
  const rows=enrichDates(computeCPM());
  const duration=Math.max(...rows.map(r=>r.ef),0);
  const critical=rows.filter(r=>r.critical).sort((a,b)=>a.es-b.es).map(r=>r.key).join(' → ');
  const finish=fmtDate(addProjectDays(startInput.value,duration-1,getMode()));
  const source=document.getElementById(type==='calendar'?'calendar':type);
  const content=source.querySelector('.section-card').cloneNode(true);
  content.querySelectorAll('.section-actions,.remove-btn').forEach(el=>el.remove());
  content.querySelectorAll('input').forEach(input=>{
    const span=document.createElement('span'); span.textContent=input.value; input.replaceWith(span);
  });
  content.querySelectorAll('select').forEach(select=>{
    const span=document.createElement('span'); span.textContent=select.options[select.selectedIndex]?.text||''; select.replaceWith(span);
  });
  let css='';
  try { css=await fetch('styles.css').then(r=>r.text()); } catch(e) {}
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titles[type]} · Gantt + CPM</title><style>${css}\nbody{background:#fff}.preview-toolbar{position:sticky;top:0;z-index:9999;display:flex;gap:8px;justify-content:flex-end;padding:12px;background:#17365d}.preview-toolbar button{border:0;border-radius:9px;padding:9px 12px;font:600 14px Inter,Arial;cursor:pointer}.preview-sheet{width:min(1600px,96vw);margin:24px auto}.preview-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 20px}.preview-meta>div{border:1px solid #dbe3ee;border-radius:12px;padding:10px}.preview-meta small{display:block;color:#64748b;margin-bottom:4px}.preview-title{border-bottom:2px solid #17365d;padding-bottom:14px}.editable-hint{color:#64748b;font-size:12px}.section-card{box-shadow:none}.section-head{margin-bottom:14px}@media print{.preview-toolbar,.editable-hint{display:none}.preview-sheet{width:100%;margin:0}.card{border:0}} </style></head><body>
  <div class="preview-toolbar"><button onclick="window.print()">Imprimir / PDF</button><button onclick="downloadEditedHtml()">Descargar HTML editado</button></div>
  <main class="preview-sheet" contenteditable="true">
    <header class="preview-title"><span class="eyebrow">Programación y control</span><h1>${titles[type]}</h1><p>Gantt + CPM · ${escapeHtml(AUTHOR)}</p><p class="editable-hint">Puedes editar textos directamente en esta vista antes de descargarla.</p></header>
    <section class="preview-meta"><div><small>Inicio</small><strong>${fmtDate(addProjectDays(startInput.value,0,getMode()))}</strong></div><div><small>Duración total</small><strong>${duration} días</strong></div><div><small>Fin programado</small><strong>${finish}</strong></div><div><small>Ruta crítica</small><strong>${escapeHtml(critical)}</strong></div></section>
    ${content.outerHTML}
    <footer style="margin-top:24px">© ${escapeHtml(AUTHOR)} · Herramienta académica para programación y control de obra.</footer>
  </main>
<script>function downloadEditedHtml(){const clone=document.documentElement.cloneNode(true);const toolbar=clone.querySelector('.preview-toolbar');if(toolbar)toolbar.remove();const blob=new Blob(['<!doctype html>'+clone.outerHTML],{type:'text/html;charset=utf-8'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='${safeName(titles[type])}_personalizado.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),500);}<\/script></body></html>`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const win=window.open(url,'_blank');
  if(!win) downloadBlob(blob,'text/html;charset=utf-8',`${safeName(titles[type])}_vista_previa.html`);
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); tab.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active')); document.getElementById(tab.dataset.tab).classList.add('active');
}));
startInput.addEventListener('change',render);
document.getElementById('calendarMode').addEventListener('change',render);
document.getElementById('addRowBtn').addEventListener('click',()=>{
  const used=new Set(activities.map(a=>a.key)); let n=activities.length+1; while(used.has(`C${n}`)) n++;
  activities.push({key:`C${n}`,name:'Nueva actividad',pred:'',duration:1}); render();
});
document.getElementById('resetBtn').addEventListener('click',()=>{ activities=structuredClone(initialActivities); startInput.value='2026-09-05'; localStorage.clear(); render(); });
document.getElementById('exportWorkbookBtn').addEventListener('click',exportWorkbook);
document.querySelectorAll('.csv-btn').forEach(btn=>btn.addEventListener('click',()=>downloadCSV(btn.dataset.csv)));
document.querySelectorAll('.preview-btn').forEach(btn=>btn.addEventListener('click',()=>makePreview(btn.dataset.preview)));
document.getElementById('cancelDeleteBtn').addEventListener('click',closeDeleteModal);
document.getElementById('confirmDeleteBtn').addEventListener('click',confirmDelete);
document.getElementById('deleteModal').addEventListener('click',e=>{ if(e.target.id==='deleteModal') closeDeleteModal(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && document.getElementById('deleteModal').classList.contains('open')) closeDeleteModal(); });
render();
