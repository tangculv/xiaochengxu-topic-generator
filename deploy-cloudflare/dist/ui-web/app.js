const API_BASE = `${window.location.origin}/api`;
const DECISION_STORAGE_KEY = 'topic-generator-decisions-v1';
const CLOUD_MODE_MESSAGE = '当前为云端演示版：可浏览、筛选、人工标注；实时生成请使用本地版。';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!contentType.includes('application/json')) {
    const preview = text.slice(0, 120).replace(/\n/g, ' ');
    throw new Error(`接口没有返回 JSON。返回内容: ${preview}`);
  }
  return JSON.parse(text);
}

const state = {
  index: null,
  dimensions: [],
  currentBatchId: null,
  raw: null,
  cards: [],
  filtered: [],
  selectedId: null,
  sortBy: 'total',
  decisionMap: loadDecisionMap(),
};

function loadDecisionMap() {
  try { return JSON.parse(localStorage.getItem(DECISION_STORAGE_KEY) || '{}'); } catch { return {}; }
}
function persistDecisionMap() { localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(state.decisionMap)); }

const els = {
  batchSelect: document.getElementById('batch-select'),
  generateRelation: document.getElementById('generate-relation'),
  generateName: document.getElementById('generate-name'),
  generateMultiplier: document.getElementById('generate-multiplier'),
  generateQuality: document.getElementById('generate-quality'),
  generateBatch: document.getElementById('generate-batch'),
  generateStatus: document.getElementById('generate-status'),
  commandPreview: document.getElementById('command-preview'),
  refreshBatches: document.getElementById('refresh-batches'),
  batchTitle: document.getElementById('batch-title'),
  batchMeta: document.getElementById('batch-meta'),
  summaryMetrics: document.getElementById('summary-metrics'),
  decisionMetrics: document.getElementById('decision-metrics'),
  relationFilter: document.getElementById('relation-filter'),
  domainFilter: document.getElementById('domain-filter'),
  statusFilter: document.getElementById('status-filter'),
  decisionFilter: document.getElementById('decision-filter'),
  scoreFilter: document.getElementById('score-filter'),
  scoreValue: document.getElementById('score-value'),
  keywordFilter: document.getElementById('keyword-filter'),
  scoreBars: document.getElementById('score-bars'),
  ideaList: document.getElementById('idea-list'),
  listCount: document.getElementById('list-count'),
  detailContent: document.getElementById('detail-content'),
  sortTotal: document.getElementById('sort-total'),
  sortPriority: document.getElementById('sort-priority'),
};

const uniq = values => [...new Set(values)].filter(Boolean);
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data.message || `请求失败: ${path}`);
  return data;
}
function enrichCards(cards) { return cards.map(card => ({ ...card, manualDecision: state.decisionMap[card.id]?.decision || '未处理', manualNote: state.decisionMap[card.id]?.note || '' })); }
async function loadIndex() {
  const [index, dimensions] = await Promise.all([request('/batches'), request('/dimensions')]);
  state.index = index; state.dimensions = dimensions; renderBatchOptions(); renderGenerateOptions();
  if (!state.currentBatchId) state.currentBatchId = state.index.batches[0]?.batch_id || null;
  if (state.currentBatchId) await loadBatch(state.currentBatchId);
}
function renderBatchOptions() { els.batchSelect.innerHTML = state.index.batches.map(batch => `<option value="${batch.batch_id}">${batch.batch_id} · ${batch.name}</option>`).join(''); els.batchSelect.value = state.currentBatchId || state.index.batches[0]?.batch_id || ''; }
function renderGenerateOptions() { els.generateRelation.innerHTML = ['<option value="">全部关系</option>'].concat(state.dimensions.map(item => `<option value="${item.id}">${item.id} · ${item.from} → ${item.to}</option>`)).join(''); }
async function loadBatch(batchId) {
  state.currentBatchId = batchId; const payload = await request(`/batches/${batchId}`); state.raw = payload; state.cards = enrichCards(payload.cards); state.selectedId = state.cards[0]?.id || null;
  els.batchTitle.textContent = `${payload.batch.name}`; els.batchMeta.textContent = `${payload.batch.batch_id} · ${payload.batch.created} · 导出 ${payload.batch.export_csv || '无'}`;
  renderMetrics(payload.batch, state.cards); populateFilters(state.cards); applyFilters();
}
function renderMetrics(batch, cards) {
  const candidates = cards.filter(card => card.status === 'candidate').length; const rejected = cards.filter(card => card.status === 'rejected').length;
  const topScore = Math.max(...cards.map(card => card.scores.total), 0); const topPriority = Math.max(...cards.map(card => card.priority_score), 0);
  const items = [['生成数', batch.ideas_generated], ['候选数', candidates], ['淘汰数', rejected], ['最高分', topScore], ['最高优先级', topPriority], ['模式', '云端演示']];
  els.summaryMetrics.innerHTML = items.map(([label, value]) => `<div class="metric"><span class="muted">${label}</span><strong>${value}</strong></div>`).join('');
  const decisions = ['收藏', '待观察', '立项候选', '淘汰复核'];
  els.decisionMetrics.innerHTML = decisions.map(label => `<div class="metric"><span class="muted">${label}</span><strong>${cards.filter(card => card.manualDecision === label).length}</strong></div>`).join('');
}
function populateFilters(cards) { els.relationFilter.innerHTML = ['<option value="all">全部</option>'].concat(uniq(cards.map(card => card.relation.type)).map(item => `<option value="${item}">${item}</option>`)).join(''); els.domainFilter.innerHTML = ['<option value="all">全部</option>'].concat(uniq(cards.map(card => card.domain.name)).map(item => `<option value="${item}">${item}</option>`)).join(''); }
function applyFilters() {
  const relationType = els.relationFilter.value, domain = els.domainFilter.value, status = els.statusFilter.value, decision = els.decisionFilter.value, minScore = Number(els.scoreFilter.value), keyword = els.keywordFilter.value.trim().toLowerCase();
  let list = state.cards.filter(card => {
    const haystack = [card.one_liner, card.user.primary, card.user.secondary, card.competition.gap, card.manualDecision, card.manualNote, ...(card.risks || []), ...(card.rejection_reasons || [])].join(' ').toLowerCase();
    return (relationType === 'all' || card.relation.type === relationType) && (domain === 'all' || card.domain.name === domain) && (status === 'all' || card.status === status) && (decision === 'all' || card.manualDecision === decision) && card.scores.total >= minScore && (!keyword || haystack.includes(keyword));
  });
  list.sort((a,b)=> state.sortBy === 'priority' ? b.priority_score - a.priority_score || b.scores.total - a.scores.total : b.scores.total - a.scores.total || b.priority_score - a.priority_score);
  state.filtered = list; if (!list.find(card => card.id === state.selectedId)) state.selectedId = list[0]?.id || null; renderBars(list); renderList(list); renderDetail(list.find(card => card.id === state.selectedId)); els.listCount.textContent = `当前 ${list.length} 个`;
}
function renderBars(cards) { const buckets=[50,60,70,80,90]; const counts=buckets.map(start=>cards.filter(card=>card.scores.total>=start&&card.scores.total<start+10).length); const max=Math.max(...counts,1); els.scoreBars.innerHTML=buckets.map((start,index)=>`<div class="bar"><strong>${start}-${start+9}</strong><p class="muted">${counts[index]} 个</p><div class="bar-fill" style="width:${Math.round((counts[index]/max)*100)}%"></div></div>`).join(''); }
function decisionBadge(decision) { const cls = decision === '立项候选' ? 'priority' : decision === '淘汰复核' ? 'danger' : ''; return `<span class="score-pill ${cls}">${decision}</span>`; }
function renderList(cards) { els.ideaList.innerHTML = cards.map(card => `<article class="idea-card ${card.id===state.selectedId?'active':''}" data-id="${card.id}"><div class="score-row"><span class="score-pill ${card.status==='rejected'?'danger':''}">${card.status==='candidate'?'候选':'淘汰'}</span>${decisionBadge(card.manualDecision)}<span class="score-pill">总分 ${card.scores.total}</span><span class="score-pill priority">优先级 ${card.priority_score}</span></div><h3>${card.one_liner}</h3><div class="tags"><span class="tag">${card.relation.from} → ${card.relation.to}</span><span class="tag">${card.domain.name}-${card.domain.sub}</span><span class="tag">${card.ai.level}</span></div><p class="muted">${card.payment.price} · ${card.spread.description}</p>${card.manualNote?`<p class="muted small">备注：${card.manualNote}</p>`:''}</article>`).join(''); document.querySelectorAll('.idea-card').forEach(node=>node.addEventListener('click',()=>{ state.selectedId=node.dataset.id; renderList(state.filtered); renderDetail(state.filtered.find(card=>card.id===state.selectedId)); })); }
function updateDecision(cardId, decision, note) { state.decisionMap[cardId] = { decision, note }; persistDecisionMap(); state.cards = state.cards.map(card => card.id === cardId ? { ...card, manualDecision: decision, manualNote: note } : card); renderMetrics(state.raw.batch, state.cards); applyFilters(); }
function renderDetail(card) {
  if (!card) { els.detailContent.innerHTML = '<p class="muted">没有符合条件的选题。</p>'; return; }
  els.detailContent.innerHTML = `<div><h2>${card.one_liner}</h2><p class="muted">${card.id} · 模板 ${card.template_id}</p></div><section class="detail-block"><h3>云端说明</h3><p class="muted">${CLOUD_MODE_MESSAGE}</p></section><section class="detail-block"><h3>人工决策</h3><label><span>当前标签</span><select id="detail-decision">${['未处理','收藏','待观察','立项候选','淘汰复核'].map(item=>`<option value="${item}" ${card.manualDecision===item?'selected':''}>${item}</option>`).join('')}</select></label><label><span>备注</span><textarea id="detail-note" rows="4" placeholder="记录你的判断依据">${card.manualNote||''}</textarea></label><button id="save-decision" class="button primary">保存人工判断</button></section><section class="detail-block"><h3>定位</h3><div class="kv-grid"><div class="kv-item"><span>关系</span><strong>${card.relation.from} → ${card.relation.to}</strong></div><div class="kv-item"><span>动作</span><strong>${card.action.name}</strong></div><div class="kv-item"><span>领域</span><strong>${card.domain.name} / ${card.domain.sub}</strong></div><div class="kv-item"><span>AI</span><strong>${card.ai.level} / ${card.ai.capability}</strong></div></div></section><section class="detail-block"><h3>用户与付费</h3><p><strong>用户：</strong>${card.user.primary}</p><p><strong>次级：</strong>${card.user.secondary}</p><p><strong>价格：</strong>${card.payment.price}</p><p><strong>支付动机：</strong>${card.payment.why}</p><p class="muted">免费层：${card.payment.free_tier}<br/>VIP：${card.payment.vip_tier}</p></section><section class="detail-block"><h3>评分</h3><div class="kv-grid">${Object.entries(card.scores).map(([k,v])=>`<div class="kv-item"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div></section><section class="detail-block"><h3>传播 / 竞品 / 风险</h3><p><strong>传播：</strong>${card.spread.description}</p><p><strong>竞品：</strong>${card.competition.existing}</p><p><strong>差异：</strong>${card.competition.gap}</p><p><strong>壁垒：</strong>${card.competition.moat}</p><ul class="bullet-list">${(card.risks||[]).map(item=>`<li>${item}</li>`).join('')}</ul>${card.rejection_reasons?.length?`<p class="danger-text"><strong>淘汰原因：</strong>${card.rejection_reasons.join(' / ')}</p>`:''}</section>`;
  document.getElementById('save-decision')?.addEventListener('click',()=>{ const decision=document.getElementById('detail-decision').value; const note=document.getElementById('detail-note').value.trim(); updateDecision(card.id, decision, note); });
}
function buildCommandPreview() { const relation = els.generateRelation.value; const name = els.generateName.value.trim() || '云端演示'; const multiplier = Number(els.generateMultiplier.value || 1); const qualityMode = els.generateQuality.value; els.commandPreview.textContent = JSON.stringify({ relation, name, multiplier, qualityMode, mode: 'cloud-demo' }, null, 2); }
async function handleGenerate() { els.generateStatus.textContent = CLOUD_MODE_MESSAGE; }
els.batchSelect.addEventListener('change', async()=>loadBatch(els.batchSelect.value));
els.refreshBatches.addEventListener('click', async()=>{ await loadIndex(); els.generateStatus.textContent = '批次列表已刷新'; });
els.generateBatch.addEventListener('click', handleGenerate);
els.generateMultiplier.addEventListener('change', buildCommandPreview);
els.generateRelation.addEventListener('change', buildCommandPreview);
els.generateName.addEventListener('input', buildCommandPreview);
els.generateQuality.addEventListener('change', buildCommandPreview);
els.scoreFilter.addEventListener('input', ()=>{ els.scoreValue.textContent = els.scoreFilter.value; applyFilters(); });
els.keywordFilter.addEventListener('input', applyFilters);
els.relationFilter.addEventListener('change', applyFilters);
els.domainFilter.addEventListener('change', applyFilters);
els.statusFilter.addEventListener('change', applyFilters);
els.decisionFilter.addEventListener('change', applyFilters);
els.sortTotal.addEventListener('click', ()=>{ state.sortBy='total'; els.sortTotal.classList.add('active'); els.sortPriority.classList.remove('active'); applyFilters(); });
els.sortPriority.addEventListener('click', ()=>{ state.sortBy='priority'; els.sortPriority.classList.add('active'); els.sortTotal.classList.remove('active'); applyFilters(); });
loadIndex().then(()=>{ buildCommandPreview(); els.generateStatus.textContent = CLOUD_MODE_MESSAGE; }).catch(error=>{ document.body.innerHTML = `<pre style="padding:24px;color:#fff">加载失败：${error.message}</pre>`; });
