(function(){

var STORAGE_KEY = 'grp_tasks_v1';
var THEME_KEY = 'grp_theme_v1';

var GAMES = [
  {id:'hok', name:'王者荣耀', sub:'S36 赛季更新'},
  {id:'naruto', name:'火影忍者手游', sub:'武斗赛版本'},
  {id:'roco', name:'洛克王国', sub:'怀旧联动'}
];

var PHASES = {
  hok: [
    {phase:'warmup', start:0, end:6, label:'预热'},
    {phase:'burst', start:6, end:13, label:'爆发'},
    {phase:'tail', start:13, end:22, label:'长尾'}
  ],
  naruto: [
    {phase:'warmup', start:8, end:15, label:'预热'},
    {phase:'burst', start:15, end:20, label:'爆发'},
    {phase:'tail', start:20, end:27, label:'长尾'}
  ],
  roco: [
    {phase:'warmup', start:17, end:23, label:'预热'},
    {phase:'burst', start:23, end:28, label:'爆发'},
    {phase:'tail', start:28, end:37, label:'长尾'}
  ]
};
var TIMELINE_DAYS = 37;
var TODAY_OFFSET = 3;

var DEFAULT_TASKS = [
  {id:'t1', title:'新赛季英雄概念预热短片 (AIGC)', game:'hok', status:'progress',
    channels:['视频号','抖音'], model:'Kling 1.5', seed:'88291', cfg:'7.5', lut:'Neon_Cold_02',
    date:'09-24', note:'角色定妆图生视频，锁定护甲反光与技能特效轨迹。'},
  {id:'t2', title:'英雄技能高光机制拆解（实机+AI混剪）', game:'hok', status:'scheduled',
    channels:['视频号','抖音','B站'], model:'实拍+PR', seed:'—', cfg:'—', lut:'Arena_Warm',
    date:'09-25', note:'实机高光帧 + AI 补帧转场，突出技能命中反馈。'},
  {id:'t3', title:'玩家圈层热梗二创短剧', game:'hok', status:'published',
    channels:['抖音'], model:'剪映+AE', seed:'—', cfg:'—', lut:'Vlog_Bright',
    date:'09-18', note:'3 款不同前3秒钩子封面完成 A/B Test，已复盘归档。'},
  {id:'t4', title:'武斗赛 BP 预热海报动态化', game:'naruto', status:'todo',
    channels:['B站'], model:'即梦 Dreamina', seed:'—', cfg:'—', lut:'—',
    date:'10-02', note:'静态 BP 海报升级为轻动态入场，配合赛程预告发布。'},
  {id:'t5', title:'洛克王国怀旧联动定妆图生视', game:'roco', status:'progress',
    channels:['视频号','B站'], model:'即梦 Dreamina', seed:'41207', cfg:'6.0', lut:'Pastel_Nostalgia',
    date:'10-12', note:'经典精灵形象电影化重塑，唤起老玩家情怀记忆。'},
  {id:'t6', title:'Master Reel 年度素材归档梳理', game:'hok', status:'todo',
    channels:['B站'], model:'—', seed:'—', cfg:'—', lut:'—',
    date:'10-20', note:'汇总全年三个案例可复用镜头，为年度 Showreel 做素材准备。'}
];

var ASSETS = [
  {name:'cyberpunk_warrior_v2', model:'Kling 1.5', seed:'88291', cfg:'7.5', lut:'Neon_Cold_02', channels:['视频号','抖音'], reuse:0.72, task:'新赛季英雄概念预热短片'},
  {name:'marco_polo_cyber_reload', model:'ComfyUI + ControlNet', seed:'50173', cfg:'8.0', lut:'Magenta_Drift', channels:['B站'], reuse:0.55, task:'王者荣耀 AI 电影概念样片'},
  {name:'ryan_anchor_v3', model:'即梦 Dreamina', seed:'19042', cfg:'7.0', lut:'Neon_Cold_02', channels:['视频号'], reuse:0.88, task:'赛博都市 AI 漫剧概念片'},
  {name:'roco_kingdom_reunion', model:'即梦 Dreamina', seed:'41207', cfg:'6.0', lut:'Pastel_Nostalgia', channels:['视频号','B站'], reuse:0.31, task:'洛克王国怀旧联动定妆图生视'},
  {name:'aberrant_beast_turnaround', model:'海螺 MiniMax', seed:'77310', cfg:'7.8', lut:'Neon_Cold_02', channels:['抖音'], reuse:0.44, task:'赛博都市 AI 漫剧概念片'}
];

var STATUS_META = {
  todo: {label:'待启动', cls:'b-todo', color:'var(--status-todo)'},
  progress: {label:'制作中', cls:'b-progress', color:'var(--status-progress)'},
  scheduled: {label:'已排期', cls:'b-scheduled', color:'var(--status-scheduled)'},
  published: {label:'已发布', cls:'b-published', color:'var(--status-published)'}
};
var STATUS_ORDER = ['todo','progress','scheduled','published'];
var PHASE_COLOR = {warmup:'var(--phase-warmup)', burst:'var(--phase-burst)', tail:'var(--phase-tail)'};

function gameName(id){ var g = GAMES.filter(function(x){return x.id===id;})[0]; return g ? g.name : id; }

function loadTasks(){
  try { var raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch(e) {}
  return DEFAULT_TASKS.slice();
}
function saveTasks(tasks){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch(e) {} }

var tasks = loadTasks();
var filterGame = '';
var filterChannel = '';
var filterAssetChannel = '';
var searchQuery = '';
var assetSort = {col: null, dir: 1};
var barChart = null, doughnutChart = null;

/* ---------- theme ---------- */
function applyTheme(mode){
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.setAttribute('data-theme', mode);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  var btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = mode === 'dark' ? '☀' : '☾';
  try { localStorage.setItem(THEME_KEY, mode || 'auto'); } catch(e) {}
}
function initTheme(){
  var saved = 'auto';
  try { saved = localStorage.getItem(THEME_KEY) || 'auto'; } catch(e) {}
  applyTheme(saved);
  document.getElementById('btn-theme').addEventListener('click', function(){
    var current = document.documentElement.getAttribute('data-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = current ? current === 'dark' : prefersDark;
    applyTheme(isDark ? 'light' : 'dark');
  });
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(function(btn){
  btn.addEventListener('click', function(){
    document.querySelectorAll('.tab').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'insights') renderInsights();
  });
});

/* ---------- stats ---------- */
function renderStats(){
  var total = tasks.length;
  var published = tasks.filter(function(t){return t.status==='published';}).length;
  var pending = tasks.filter(function(t){return t.status!=='published';}).length;
  var avgReuse = Math.round(ASSETS.reduce(function(s,a){return s+a.reuse;},0) / ASSETS.length * 100);
  var stats = [
    {num: GAMES.length, lbl:'本月版本节点', delta:'跨 3 款产品并行排期'},
    {num: total, lbl:'内容任务总数', delta: published + ' 条已发布'},
    {num: avgReuse + '%', lbl:'AIGC 素材平均复用率', delta:'较人工归档 +40%'},
    {num: pending, lbl:'待发布任务', delta:'覆盖视频号/抖音/B站'}
  ];
  document.getElementById('stat-row').innerHTML = stats.map(function(s){
    return '<div class="stat"><div class="num">'+s.num+'</div><div class="lbl">'+s.lbl+'</div><div class="delta">'+s.delta+'</div></div>';
  }).join('');
}

/* ---------- gantt ---------- */
function renderGantt(){
  var axisHtml = '';
  for (var i=0;i<=TIMELINE_DAYS;i+=9){ axisHtml += '<span>D+'+i+'</span>'; }
  document.getElementById('gantt-axis').innerHTML = axisHtml;

  var html = '';
  GAMES.forEach(function(g){
    var segs = PHASES[g.id];
    var segHtml = segs.map(function(s){
      var left = (s.start / TIMELINE_DAYS * 100).toFixed(1);
      var width = ((s.end - s.start) / TIMELINE_DAYS * 100).toFixed(1);
      return '<div class="gantt-seg" title="'+g.name+' · '+s.label+'" style="left:'+left+'%; width:'+width+'%; background:'+PHASE_COLOR[s.phase]+';">'+s.label+'</div>';
    }).join('');
    var todayLeft = (TODAY_OFFSET / TIMELINE_DAYS * 100).toFixed(1);
    html += '<div class="gantt-row">' +
      '<div><div class="game-name">'+g.name+'</div><div class="game-sub">'+g.sub+'</div></div>' +
      '<div class="gantt-track">'+segHtml+'<div class="gantt-today" title="今日"></div></div>' +
    '</div>';
  });
  document.getElementById('gantt-body').innerHTML = html;
  document.querySelectorAll('.gantt-today').forEach(function(el){
    el.style.left = (TODAY_OFFSET / TIMELINE_DAYS * 100).toFixed(1) + '%';
  });
}

/* ---------- filters ---------- */
function populateFilters(){
  var gameSel = document.getElementById('f-game');
  GAMES.forEach(function(g){ var o = document.createElement('option'); o.value = g.id; o.textContent = g.name; gameSel.appendChild(o); });
  refreshChannelFilterOptions();
  var assetChannels = [];
  ASSETS.forEach(function(a){ a.channels.forEach(function(c){ if (assetChannels.indexOf(c)===-1) assetChannels.push(c); }); });
  var achSel = document.getElementById('f-asset-channel');
  assetChannels.forEach(function(c){ var o = document.createElement('option'); o.value = c; o.textContent = c; achSel.appendChild(o); });
}
function refreshChannelFilterOptions(){
  var chSel = document.getElementById('f-channel');
  var existing = Array.prototype.map.call(chSel.options, function(o){return o.value;});
  var allChannels = [];
  tasks.forEach(function(t){ t.channels.forEach(function(c){ if (allChannels.indexOf(c)===-1) allChannels.push(c); }); });
  allChannels.forEach(function(c){
    if (existing.indexOf(c) === -1) { var o = document.createElement('option'); o.value = c; o.textContent = c; chSel.appendChild(o); }
  });
}
document.getElementById('f-game').addEventListener('change', function(e){ filterGame = e.target.value; renderKanban(); });
document.getElementById('f-channel').addEventListener('change', function(e){ filterChannel = e.target.value; renderKanban(); });
document.getElementById('f-asset-channel').addEventListener('change', function(e){ filterAssetChannel = e.target.value; renderAssets(); });
document.getElementById('f-search').addEventListener('input', function(e){ searchQuery = e.target.value.trim().toLowerCase(); renderKanban(); });

/* ---------- kanban ---------- */
function filteredTasks(){
  return tasks.filter(function(t){
    if (filterGame && t.game !== filterGame) return false;
    if (filterChannel && t.channels.indexOf(filterChannel) === -1) return false;
    if (searchQuery && t.title.toLowerCase().indexOf(searchQuery) === -1) return false;
    return true;
  });
}

function renderKanban(){
  var filtered = filteredTasks();
  var html = '';
  STATUS_ORDER.forEach(function(st){
    var meta = STATUS_META[st];
    var colTasks = filtered.filter(function(t){ return t.status === st; });
    html += '<div class="kcol" data-status="'+st+'">' +
      '<div class="kcol-head"><span class="kcol-title">'+meta.label+'</span><span class="kcol-count">'+colTasks.length+'</span></div>' +
      '<div class="kcol-bar" style="background:'+meta.color+';"></div>' +
      '<div class="kcol-body">';
    if (colTasks.length === 0) {
      html += '<div class="empty-col">暂无任务</div>';
    } else {
      colTasks.forEach(function(t){
        var chipsHtml = t.channels.map(function(c){ return '<span class="chip">'+c+'</span>'; }).join('') + '<span class="chip">'+t.date+'</span>';
        html += '<div class="kcard" draggable="true" data-id="'+t.id+'">' +
          '<div class="kcard-title">'+t.title+'</div>' +
          '<div class="kcard-game">'+gameName(t.game)+'</div>' +
          '<div class="kcard-chips">'+chipsHtml+'</div>' +
        '</div>';
      });
    }
    html += '</div></div>';
  });
  document.getElementById('kanban-board').innerHTML = html;

  document.querySelectorAll('.kcard').forEach(function(card){
    card.addEventListener('click', function(){ openDetail(card.dataset.id); });
    card.addEventListener('dragstart', function(e){
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', function(){ card.classList.remove('dragging'); });
  });

  document.querySelectorAll('.kcol').forEach(function(col){
    col.addEventListener('dragover', function(e){ e.preventDefault(); col.classList.add('drop-target'); });
    col.addEventListener('dragleave', function(){ col.classList.remove('drop-target'); });
    col.addEventListener('drop', function(e){
      e.preventDefault();
      col.classList.remove('drop-target');
      var id = e.dataTransfer.getData('text/plain');
      var t = tasks.filter(function(x){ return x.id === id; })[0];
      if (t && t.status !== col.dataset.status) {
        t.status = col.dataset.status;
        saveTasks(tasks);
        renderStats(); renderKanban();
      }
    });
  });
}

/* ---------- assets ---------- */
function filteredAssets(){
  var list = ASSETS.filter(function(a){
    if (filterAssetChannel && a.channels.indexOf(filterAssetChannel) === -1) return false;
    return true;
  });
  if (assetSort.col) {
    list = list.slice().sort(function(a,b){
      var av = a[assetSort.col], bv = b[assetSort.col];
      if (assetSort.col === 'reuse') { return (av - bv) * assetSort.dir; }
      return String(av).localeCompare(String(bv)) * assetSort.dir;
    });
  }
  return list;
}
function renderAssets(){
  var filtered = filteredAssets();
  document.getElementById('asset-count').textContent = filtered.length + ' / ' + ASSETS.length + ' 条素材';
  document.getElementById('asset-body').innerHTML = filtered.map(function(a){
    var chipsHtml = a.channels.map(function(c){ return '<span class="chip">'+c+'</span>'; }).join(' ');
    var pct = Math.round(a.reuse * 100);
    return '<tr>' +
      '<td>' + a.name + '</td>' +
      '<td class="mono">' + a.model + '</td>' +
      '<td class="mono">' + a.seed + '</td>' +
      '<td class="mono">' + a.cfg + '</td>' +
      '<td class="mono">' + a.lut + '</td>' +
      '<td>' + chipsHtml + '</td>' +
      '<td><div class="reuse-bar"><div class="reuse-track"><div class="reuse-fill" style="width:' + pct + '%;"></div></div><span class="mono">' + pct + '%</span></div></td>' +
      '<td style="max-width:180px;">' + a.task + '</td>' +
    '</tr>';
  }).join('');
}
document.querySelectorAll('table.assets th[data-sort]').forEach(function(th){
  th.addEventListener('click', function(){
    var col = th.dataset.sort;
    if (assetSort.col === col) { assetSort.dir *= -1; } else { assetSort = {col: col, dir: 1}; }
    document.querySelectorAll('table.assets th[data-sort] .arrow').forEach(function(a){ a.textContent = ''; });
    th.querySelector('.arrow').textContent = assetSort.dir === 1 ? '▲' : '▼';
    renderAssets();
  });
});

/* ---------- insights (Chart.js) ---------- */
function renderInsights(){
  var byGame = {};
  GAMES.forEach(function(g){ byGame[g.id] = 0; });
  tasks.forEach(function(t){ byGame[t.game] = (byGame[t.game]||0) + 1; });

  var channelCount = {};
  tasks.forEach(function(t){ t.channels.forEach(function(c){ channelCount[c] = (channelCount[c]||0) + 1; }); });

  var ctx1 = document.getElementById('chart-by-game');
  var ctx2 = document.getElementById('chart-by-channel');
  if (!window.Chart || !ctx1 || !ctx2) return;

  if (barChart) barChart.destroy();
  if (doughnutChart) doughnutChart.destroy();

  var inkSoft = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim() || '#565C72';
  var border = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#DFE1E8';

  barChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: GAMES.map(function(g){ return g.name; }),
      datasets: [{ data: GAMES.map(function(g){ return byGame[g.id] || 0; }), backgroundColor: ['#2F5FC4','#C24E2F','#6B6FB0'], borderRadius: 5, maxBarThickness: 46 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision:0, color: inkSoft }, grid: { color: border } },
        x: { ticks: { color: inkSoft }, grid: { display: false } }
      }
    }
  });

  var channelLabels = Object.keys(channelCount);
  doughnutChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: channelLabels,
      datasets: [{ data: channelLabels.map(function(c){ return channelCount[c]; }), backgroundColor: ['#C98A22','#2F5FC4','#1F8F5F','#C24E2F'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: inkSoft, boxWidth: 10, font: { size: 11 } } } }
    }
  });

  var lb = ASSETS.slice().sort(function(a,b){ return b.reuse - a.reuse; });
  document.getElementById('leaderboard').innerHTML = lb.map(function(a, i){
    return '<li><span class="lb-name"><span class="lb-rank">'+(i+1)+'</span>'+a.name+'</span><span class="mono">'+Math.round(a.reuse*100)+'%</span></li>';
  }).join('');
}

/* ---------- CSV export ---------- */
function toCsv(rows, headers){
  var lines = [headers.join(',')];
  rows.forEach(function(r){
    lines.push(headers.map(function(h){
      var v = r[h] === undefined ? '' : String(r[h]);
      if (v.indexOf(',') !== -1 || v.indexOf('"') !== -1) v = '"' + v.replace(/"/g,'""') + '"';
      return v;
    }).join(','));
  });
  return lines.join('\n');
}
function downloadFile(filename, content, mime){
  var blob = new Blob([content], {type: mime || 'text/plain'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
document.getElementById('btn-export-tasks').addEventListener('click', function(){
  var rows = tasks.map(function(t){
    return {title: t.title, game: gameName(t.game), status: STATUS_META[t.status].label, channels: t.channels.join('/'), date: t.date, model: t.model, seed: t.seed, cfg: t.cfg, lut: t.lut, note: t.note};
  });
  downloadFile('tasks.csv', '\uFEFF' + toCsv(rows, ['title','game','status','channels','date','model','seed','cfg','lut','note']), 'text/csv');
});
document.getElementById('btn-export-assets').addEventListener('click', function(){
  var rows = ASSETS.map(function(a){
    return {name: a.name, model: a.model, seed: a.seed, cfg: a.cfg, lut: a.lut, channels: a.channels.join('/'), reuse: Math.round(a.reuse*100)+'%', task: a.task};
  });
  downloadFile('assets.csv', '\uFEFF' + toCsv(rows, ['name','model','seed','cfg','lut','channels','reuse','task']), 'text/csv');
});

/* ---------- detail drawer ---------- */
function openDetail(id){
  var t = tasks.filter(function(x){ return x.id === id; })[0];
  if (!t) return;
  var meta = STATUS_META[t.status];
  var chipsHtml = t.channels.map(function(c){ return '<span class="chip">'+c+'</span>'; }).join(' ');
  var statusOptions = STATUS_ORDER.map(function(s){
    return '<option value="'+s+'"'+(s===t.status?' selected':'')+'>'+STATUS_META[s].label+'</option>';
  }).join('');
  document.getElementById('drawer').innerHTML =
    '<span class="badge '+meta.cls+'">'+meta.label+'</span>' +
    '<h3 style="margin-top:10px;">'+t.title+'</h3>' +
    '<div class="d-sub">'+gameName(t.game)+' · 排期 '+t.date+'</div>' +
    '<div class="detail-grid">' +
      '<div class="detail-item"><div class="k">模型 / 平台</div><div class="v">'+t.model+'</div></div>' +
      '<div class="detail-item"><div class="k">Seed</div><div class="v">'+t.seed+'</div></div>' +
      '<div class="detail-item"><div class="k">CFG</div><div class="v">'+t.cfg+'</div></div>' +
      '<div class="detail-item"><div class="k">调色 LUT</div><div class="v">'+t.lut+'</div></div>' +
    '</div>' +
    '<div class="field"><label>分发渠道</label>'+chipsHtml+'</div>' +
    '<div class="field"><label>备注</label><div style="font-size:12.5px; color:var(--ink-soft); line-height:1.6;">'+t.note+'</div></div>' +
    '<div class="field"><label>更新状态</label><select id="detail-status">'+statusOptions+'</select></div>' +
    '<div class="drawer-actions">' +
      '<button class="ghost" id="btn-delete-task">删除任务</button>' +
      '<button class="ghost" id="btn-close-detail">关闭</button>' +
      '<button class="primary" id="btn-save-status">保存状态</button>' +
    '</div>';
  showOverlay();
  document.getElementById('btn-close-detail').addEventListener('click', closeOverlay);
  document.getElementById('btn-save-status').addEventListener('click', function(){
    t.status = document.getElementById('detail-status').value;
    saveTasks(tasks);
    renderStats(); renderKanban();
    closeOverlay();
  });
  document.getElementById('btn-delete-task').addEventListener('click', function(){
    tasks = tasks.filter(function(x){ return x.id !== id; });
    saveTasks(tasks);
    renderStats(); renderKanban();
    closeOverlay();
  });
}

/* ---------- add task form ---------- */
function openAddForm(){
  var gameOptions = GAMES.map(function(g){ return '<option value="'+g.id+'">'+g.name+'</option>'; }).join('');
  document.getElementById('drawer').innerHTML =
    '<h3>新建任务</h3>' +
    '<div class="d-sub">加入内容排期看板，绑定 AIGC 生产参数</div>' +
    '<div class="field"><label>任务名称</label><input type="text" id="in-title" placeholder="例如：新英雄上线预热短片"></div>' +
    '<div class="error-msg" id="err-title">请填写任务名称</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>关联游戏</label><select id="in-game">'+gameOptions+'</select></div>' +
      '<div class="field"><label>排期日期</label><input type="text" id="in-date" placeholder="09-30"></div>' +
    '</div>' +
    '<div class="field"><label>分发渠道（用 / 分隔）</label><input type="text" id="in-channel" placeholder="视频号/抖音"></div>' +
    '<div class="field-row">' +
      '<div class="field"><label>模型 / 平台</label><input type="text" id="in-model" placeholder="Kling 1.5"></div>' +
      '<div class="field"><label>Seed</label><input type="text" id="in-seed" placeholder="——"></div>' +
    '</div>' +
    '<div class="field"><label>备注</label><textarea id="in-note" rows="2" placeholder="拍摄 / 生成要点"></textarea></div>' +
    '<div class="drawer-actions">' +
      '<button class="ghost" id="btn-cancel-add">取消</button>' +
      '<button class="primary" id="btn-confirm-add">创建任务</button>' +
    '</div>';
  showOverlay();
  document.getElementById('btn-cancel-add').addEventListener('click', closeOverlay);
  document.getElementById('btn-confirm-add').addEventListener('click', function(){
    var titleEl = document.getElementById('in-title');
    var title = titleEl.value.trim();
    if (!title) { document.getElementById('err-title').style.display = 'block'; titleEl.focus(); return; }
    var channelRaw = document.getElementById('in-channel').value.trim();
    var channels = channelRaw ? channelRaw.split('/').map(function(s){return s.trim();}).filter(Boolean) : ['未指定'];
    var newTask = {
      id: 't' + Date.now(), title: title, game: document.getElementById('in-game').value, status: 'todo',
      channels: channels, model: document.getElementById('in-model').value.trim() || '待定',
      seed: document.getElementById('in-seed').value.trim() || '—', cfg: '—', lut: '—',
      date: document.getElementById('in-date').value.trim() || '待排期',
      note: document.getElementById('in-note').value.trim() || '暂无备注'
    };
    tasks.unshift(newTask);
    saveTasks(tasks);
    refreshChannelFilterOptions();
    renderStats(); renderKanban();
    closeOverlay();
  });
}
document.getElementById('btn-add-task').addEventListener('click', openAddForm);

function showOverlay(){ document.getElementById('overlay').classList.add('show'); }
function closeOverlay(){ document.getElementById('overlay').classList.remove('show'); }
document.getElementById('overlay').addEventListener('click', function(e){ if (e.target.id === 'overlay') closeOverlay(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeOverlay(); });

document.getElementById('today-tag').textContent = new Date().toLocaleDateString('zh-CN', {year:'numeric', month:'2-digit', day:'2-digit'}).replace(/\//g,'-');

/* ---------- init ---------- */
initTheme();
populateFilters();
renderStats();
renderGantt();
renderKanban();
renderAssets();

})();
