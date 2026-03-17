const API_BASE = `${window.location.origin}/api`;
const DECISION_STORAGE_KEY = 'topic-generator-decisions-v3';
const LEGACY_STORAGE_KEYS = ['topic-generator-decisions-v2', 'topic-generator-decisions-v1'];

const QUICK_DECISION_TO_DETAIL = {
  要: '立项候选',
  再看: '待观察',
  不要: '淘汰复核',
  未处理: '未处理',
};

const DETAIL_TO_QUICK = {
  收藏: '再看',
  待观察: '再看',
  立项候选: '要',
  淘汰复核: '不要',
  未处理: '未处理',
};

const RELATION_LOGIC = {
  care: '照护型',
  authority: '权威服务型',
  contract: '合同权益型',
  mutual: '互助协作型',
  self: '自我管理型',
};

const ACTION_LOGIC = {
  evaluate: '判断型',
  track: '追踪型',
  distribute: '分发型',
  coordinate: '协调型',
  collect: '收集型',
  verify: '判断型',
};

const DOMAIN_TYPE = {
  健康: '健康管理',
  学业: '教育学习',
  技能: '技能成长',
  金钱: '收入权益',
  时间: '协同排期',
  活动: '组织管理',
  内容: '内容表达',
  关系: '协同排期',
  安全: '组织管理',
};

const SUBDOMAIN_TYPE = {
  饮食: '饮食建议',
  用药: '用药提醒',
  体检: '健康摘要',
  体征: '风险监测',
  康复: '康复跟踪',
  孕产: '孕产照护',
  作业: '作业批改',
  考试: '考点分析',
  错题: '错题纠偏',
  知识点: '知识点诊断',
  复盘: '学习计划',
  乐器: '学员报告',
  口语: '口语训练',
  书法: '作品点评',
  写作: '写作改进',
  健身: '动作评估',
  绘画: '作品点评',
  工时: '工时结算',
  工资: '收入核算',
  记账: '账目归档',
  报销: '票据核验',
  续费: '续费管理',
  排班: '排班协调',
  预约: '预约协同',
  提醒: '任务提醒',
  复诊: '复诊安排',
  通知: '通知汇总',
  签到: '签到管理',
  报名: '报名组织',
  组织: '执行协调',
  互助: '协作互助',
  分工: '分工协同',
  纪念: '关系纪念',
  协作: '协作沉淀',
  作品: '内容点评',
  视频: '视频分析',
  照片: '图像分析',
  笔记: '内容摘要',
};

const GRADE_META = {
  S: { label: 'S｜优先立项', action: '建议先做', weight: 0 },
  A: { label: 'A｜优先验证', action: '建议尽快验证', weight: 1 },
  B: { label: 'B｜保留观察', action: '建议继续观察', weight: 2 },
  C: { label: 'C｜价值有限', action: '建议谨慎投入', weight: 3 },
  D: { label: 'D｜建议淘汰', action: '当前不建议投入', weight: 4 },
};

const PRODUCT_SHAPE_RULES = [
  { test: card => card.logic_action === '判断型' && card.ai.level === 'L3', shape: '工具型', reason: '用户会为了即时判断结果反复使用，适合做高频轻工具。', mvp: '先做单场景输入 → AI判断 → 行动建议结果页。', monetization: '适合订阅制或按成员收费。' },
  { test: card => card.logic_action === '分发型', shape: '报告型', reason: '价值体现在把复杂信息整理成可读报告。', mvp: '先做上传资料 → 自动摘要 → 一键分享报告。', monetization: '适合按报告包、按机构席位或高级模板收费。' },
  { test: card => card.logic_action === '协调型' || card.topic_type_primary === '协同排期', shape: '协作型', reason: '多人协同和提醒是主要价值来源。', mvp: '先做信息收集 + 最优排期 + 自动提醒。', monetization: '适合按团队/组织者订阅收费。' },
  { test: card => /报告|总结|摘要/.test(card.topic_type_secondary), shape: '内容型', reason: '结果内容本身就是可传播资产。', mvp: '先做标准化报告生成模板。', monetization: '适合订阅 + 模板增值。' },
];

const state = {
  index: null,
  dimensions: [],
  currentBatchId: null,
  raw: null,
  cards: [],
  filtered: [],
  selectedId: null,
  sortBy: 'total',
  viewMode: 'cards',
  decisionMap: loadDecisionMap(),
  activeQuickView: 'all',
  filters: {
    logicRelation: 'all',
    logicAction: 'all',
    logicValue: 'all',
    logicStage: 'all',
    topicPrimary: 'all',
    topicSecondary: 'all',
  },
};

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!contentType.includes('application/json')) {
    const preview = text.slice(0, 180).replace(/\n/g, ' ');
    throw new Error(`接口没有返回 JSON，返回内容: ${preview}`);
  }
  return JSON.parse(text);
}

function loadDecisionMap() {
  try {
    const current = localStorage.getItem(DECISION_STORAGE_KEY);
    if (current) return JSON.parse(current);
    for (const key of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const legacy = JSON.parse(raw);
      const migrated = Object.fromEntries(Object.entries(legacy).map(([id, value]) => {
        const detailDecision = value.detailDecision || value.decision || '未处理';
        const quickDecision = value.quickDecision || DETAIL_TO_QUICK[detailDecision] || '未处理';
        return [id, {
          quickDecision,
          detailDecision,
          note: value.note || '',
          updatedAt: value.updatedAt || new Date().toISOString(),
        }];
      }));
      localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return {};
  } catch {
    return {};
  }
}

function persistDecisionMap() {
  localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(state.decisionMap));
}

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
  openGenerator: document.getElementById('open-generator'),
  closeGenerator: document.getElementById('close-generator'),
  generatorPanel: document.getElementById('generator-panel'),
  clearFilters: document.getElementById('clear-filters'),
  quickViews: document.getElementById('quick-views'),
  batchTitle: document.getElementById('batch-title'),
  batchMeta: document.getElementById('batch-meta'),
  activeStrategyTags: document.getElementById('active-strategy-tags'),
  summaryMetrics: document.getElementById('summary-metrics'),
  gradeMetrics: document.getElementById('grade-metrics'),
  funnelMetrics: document.getElementById('funnel-metrics'),
  quickMetrics: document.getElementById('quick-metrics'),
  decisionMetrics: document.getElementById('decision-metrics'),
  logicDistribution: document.getElementById('logic-distribution'),
  typeDistribution: document.getElementById('type-distribution'),
  relationFilter: document.getElementById('relation-filter'),
  domainFilter: document.getElementById('domain-filter'),
  statusFilter: document.getElementById('status-filter'),
  quickFilter: document.getElementById('quick-filter'),
  decisionFilter: document.getElementById('decision-filter'),
  scoreFilter: document.getElementById('score-filter'),
  scoreValue: document.getElementById('score-value'),
  keywordFilter: document.getElementById('keyword-filter'),
  scoreBars: document.getElementById('score-bars'),
  ideaList: document.getElementById('idea-list'),
  ideaTableBody: document.getElementById('idea-table-body'),
  listCount: document.getElementById('list-count'),
  activeStrategy: document.getElementById('active-strategy'),
  detailContent: document.getElementById('detail-content'),
  sortTotal: document.getElementById('sort-total'),
  sortPriority: document.getElementById('sort-priority'),
  sortGrade: document.getElementById('sort-grade'),
  viewCards: document.getElementById('view-cards'),
  viewTable: document.getElementById('view-table'),
  cardsView: document.getElementById('cards-view'),
  tableView: document.getElementById('table-view'),
  logicRelationChips: document.getElementById('logic-relation-chips'),
  logicActionChips: document.getElementById('logic-action-chips'),
  logicValueChips: document.getElementById('logic-value-chips'),
  logicStageChips: document.getElementById('logic-stage-chips'),
  topicPrimaryChips: document.getElementById('topic-primary-chips'),
  topicSecondaryChips: document.getElementById('topic-secondary-chips'),
};

const uniq = values => [...new Set(values)].filter(Boolean);

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data.message || `请求失败: ${path}`);
  return data;
}

function recommendationGrade(card) {
  const total = card.scores.total;
  const priority = Number(card.priority_score || 0);
  if (card.status === 'rejected' || (card.rejection_reasons || []).length >= 2) return 'D';
  if (total >= 88 && priority >= 74) return 'S';
  if (total >= 80 && priority >= 66) return 'A';
  if (total >= 72) return 'B';
  return 'C';
}

function gradeClass(grade) {
  return `grade-${grade.toLowerCase()}`;
}

function gradeLabel(grade) {
  return GRADE_META[grade]?.label || grade;
}

function gradeActionHint(grade) {
  return GRADE_META[grade]?.action || '继续观察';
}

function deriveLogicValue(card) {
  const values = [];
  const price = parseFloat(String(card.payment.price || '').replace(/[^\d.]/g, '')) || 0;
  if (price >= 29 || /机构|子女|家属/.test(card.payment.who || '')) values.push('强付费');
  if ((card.priority_score || 0) >= 70 || /群|传播|协作/.test(card.spread.description || '')) values.push('强传播');
  if ((card.scores.real_pain || 0) >= 13) values.push('高痛点');
  if (['L2', 'L3'].includes(card.ai.level)) values.push('高AI杠杆');
  if (!/作业帮|飞书文档|普通提醒类 App/.test(card.competition.existing || '')) values.push('低竞争');
  return values[0] || '高痛点';
}

function deriveLogicStage(card, grade) {
  if (grade === 'S' || card.quickDecision === '要' || card.detailDecision === '立项候选') return '可立项';
  if (grade === 'A') return '可测试';
  if (grade === 'B' || card.quickDecision === '再看') return '可观察';
  return '建议淘汰';
}

function deriveTopicPrimary(card) {
  return DOMAIN_TYPE[card.domain.name] || `${card.domain.name}类`;
}

function deriveTopicSecondary(card) {
  return SUBDOMAIN_TYPE[card.domain.sub] || card.domain.sub;
}

function deriveProcessedState(card) {
  return card.quickDecision === '未处理' && card.detailDecision === '未处理' && !card.manualNote ? '未处理' : '已处理';
}

function deriveProductShape(card) {
  const matched = PRODUCT_SHAPE_RULES.find(rule => rule.test(card));
  if (matched) return matched;
  return {
    shape: '订阅型',
    reason: '场景具备持续复用空间，更适合按月提供稳定价值。',
    mvp: '先做单点价值最强的核心能力，形成可复用的日常入口。',
    monetization: '适合订阅 + 高级分析增值。',
  };
}

function deriveDecisionFunnelStage(card) {
  if (card.detailDecision === '立项候选' || card.quickDecision === '要') return '已进入立项池';
  if (card.quickDecision === '再看' || card.detailDecision === '收藏' || card.detailDecision === '待观察') return '已标记';
  if (card.quickDecision === '不要' || card.detailDecision === '淘汰复核' || card.status === 'rejected') return '已淘汰';
  if (card.processed_state === '已处理') return '已查看';
  return '总候选';
}

function enrichCards(cards) {
  return cards.map(card => {
    const stored = state.decisionMap[card.id] || {};
    const detailDecision = stored.detailDecision || stored.decision || '未处理';
    const quickDecision = stored.quickDecision || DETAIL_TO_QUICK[detailDecision] || '未处理';
    const manualNote = stored.note || '';
    const grade = recommendationGrade(card);
    const enriched = {
      ...card,
      quickDecision,
      detailDecision,
      manualNote,
      recommendation_grade: grade,
      grade_label: gradeLabel(grade),
      grade_action_hint: gradeActionHint(grade),
      logic_relation: RELATION_LOGIC[card.relation.type] || '其他逻辑',
      logic_action: ACTION_LOGIC[card.action.category] || '判断型',
      topic_type_primary: deriveTopicPrimary(card),
      topic_type_secondary: deriveTopicSecondary(card),
    };
    enriched.logic_value = deriveLogicValue(enriched);
    enriched.logic_stage = deriveLogicStage(enriched, grade);
    enriched.processed_state = deriveProcessedState(enriched);
    const productShape = deriveProductShape(enriched);
    enriched.product_shape = productShape.shape;
    enriched.product_shape_reason = productShape.reason;
    enriched.mvp_entry_suggestion = productShape.mvp;
    enriched.monetization_hint = productShape.monetization;
    enriched.opportunity_summary = `${enriched.payment.who}愿意为“${enriched.payment.why}”付费，适合从${enriched.topic_type_secondary}切入。`;
    enriched.risk_summary = (enriched.risks || [])[0] || (enriched.rejection_reasons || []).join(' / ') || '暂无明显风险';
    enriched.main_reason = `${enriched.logic_relation} + ${enriched.logic_value}，且更适合做${enriched.product_shape}。`;
    enriched.decision_funnel_stage = deriveDecisionFunnelStage(enriched);
    return enriched;
  });
}

async function loadIndex() {
  const [index, dimensions] = await Promise.all([request('/batches'), request('/dimensions')]);
  state.index = index;
  state.dimensions = dimensions.relations;
  renderBatchOptions();
  renderGenerateOptions();
  if (!state.currentBatchId) state.currentBatchId = state.index.batches[0]?.batch_id || null;
  if (state.currentBatchId) await loadBatch(state.currentBatchId);
}

function renderBatchOptions() {
  els.batchSelect.innerHTML = state.index.batches.map(batch => `<option value="${batch.batch_id}">${batch.batch_id} · ${batch.name}</option>`).join('');
  els.batchSelect.value = state.currentBatchId || state.index.batches[0]?.batch_id || '';
}

function renderGenerateOptions() {
  els.generateRelation.innerHTML = ['<option value="">全部关系</option>']
    .concat(state.dimensions.map(item => `<option value="${item.id}">${item.id} · ${item.from} → ${item.to}</option>`))
    .join('');
}

async function loadBatch(batchId) {
  state.currentBatchId = batchId;
  const payload = await request(`/batches/${batchId}`);
  state.raw = payload;
  state.cards = enrichCards(payload.cards);
  state.selectedId = state.cards[0]?.id || null;
  els.batchTitle.textContent = payload.batch.name;
  els.batchMeta.textContent = `${payload.batch.batch_id} · ${payload.batch.created} · 导出 ${payload.batch.export_csv || '无'}`;
  populateFilters(state.cards);
  renderQuickViews(state.cards);
  renderMetrics(payload.batch, state.cards, state.cards);
  applyFilters();
}

function metric(label, value, hint = '') {
  return `<div class="metric"><span class="muted">${label}</span><strong>${value}</strong>${hint ? `<p class="muted small">${hint}</p>` : ''}</div>`;
}

function renderMetrics(batch, allCards, currentCards) {
  const total = allCards.length;
  const highValue = allCards.filter(card => ['S', 'A'].includes(card.recommendation_grade)).length;
  const processed = allCards.filter(card => card.processed_state === '已处理').length;
  const projectPool = allCards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要').length;
  const unprocessed = total - processed;
  const topLogic = Object.entries(countBy(allCards, card => card.logic_relation))[0]?.[0] || '暂无';
  els.summaryMetrics.innerHTML = [
    metric('总题数', total),
    metric('高价值题占比', `${total ? Math.round((highValue / total) * 100) : 0}%`, `${highValue} 个 S/A 级`),
    metric('已处理进度', `${total ? Math.round((processed / total) * 100) : 0}%`, `${processed}/${total}`),
    metric('立项池数量', projectPool),
    metric('未处理数量', unprocessed),
    metric('当前主逻辑', topLogic),
  ].join('');

  const gradeCounts = countBy(allCards, card => card.recommendation_grade, ['S', 'A', 'B', 'C', 'D']);
  els.gradeMetrics.innerHTML = Object.entries(gradeCounts).map(([label, value]) => metric(GRADE_META[label].label, value, GRADE_META[label].action)).join('');

  const funnel = {
    '总候选': allCards.length,
    '已查看': allCards.filter(card => card.processed_state === '已处理').length,
    '已标记“要”': allCards.filter(card => card.quickDecision === '要').length,
    '已进入立项池': allCards.filter(card => card.detailDecision === '立项候选').length,
    '已淘汰': allCards.filter(card => card.quickDecision === '不要' || card.status === 'rejected' || card.detailDecision === '淘汰复核').length,
  };
  els.funnelMetrics.innerHTML = Object.entries(funnel).map(([label, value]) => metric(label, value)).join('');

  const quickCounts = countBy(allCards, card => card.quickDecision, ['要', '再看', '不要', '未处理']);
  els.quickMetrics.innerHTML = Object.entries(quickCounts).map(([label, value]) => metric(label, value)).join('');

  const detailCounts = countBy(allCards, card => card.detailDecision, ['收藏', '待观察', '立项候选', '淘汰复核', '未处理']);
  els.decisionMetrics.innerHTML = Object.entries(detailCounts).map(([label, value]) => metric(label, value)).join('');

  renderBars(els.logicDistribution, countBy(allCards, card => card.logic_relation));
  renderBars(els.typeDistribution, countBy(allCards, card => card.topic_type_primary));
  renderScoreBars(currentCards);
}

function countBy(cards, selector, fixedOrder = null) {
  const map = {};
  cards.forEach(card => {
    const key = selector(card);
    map[key] = (map[key] || 0) + 1;
  });
  if (fixedOrder) return Object.fromEntries(fixedOrder.map(key => [key, map[key] || 0]));
  return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1]));
}

function renderBars(target, counts) {
  const entries = Object.entries(counts).filter(([, value]) => value > 0);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  target.innerHTML = entries.length ? entries.map(([label, count]) => {
    const width = Math.round((count / max) * 100);
    return `<div class="bar"><div class="bar-header"><strong>${label}</strong><span class="muted small">${count}</span></div><div class="bar-fill" style="width:${width}%"></div></div>`;
  }).join('') : '<div class="empty-state">暂无分布数据</div>';
}

function renderScoreBars(cards) {
  const buckets = [50, 60, 70, 80, 90];
  const counts = buckets.map(start => cards.filter(card => card.scores.total >= start && card.scores.total < start + 10).length);
  const max = Math.max(...counts, 1);
  els.scoreBars.innerHTML = buckets.map((start, index) => {
    const count = counts[index];
    const width = Math.round((count / max) * 100);
    return `<div class="bar"><div class="bar-header"><strong>${start}-${start + 9}</strong><span class="muted small">${count} 个</span></div><div class="bar-fill" style="width:${width}%"></div></div>`;
  }).join('');
}

function renderQuickViews(cards) {
  const batchCreated = state.raw?.batch?.created || '';
  const items = [
    { id: 'all', label: '全部选题', count: cards.length },
    { id: 'today', label: '今日新生成', count: cards.filter(card => String(card.created || '').startsWith(batchCreated)).length },
    { id: 'priority', label: '值得先看', count: cards.filter(card => ['S', 'A'].includes(card.recommendation_grade)).length },
    { id: 'project', label: '立项池', count: cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要').length },
    { id: 'reviewed', label: '我已标记', count: cards.filter(card => card.processed_state === '已处理').length },
    { id: 'spread', label: '高传播', count: cards.filter(card => card.logic_value === '强传播').length },
    { id: 'payment', label: '强付费', count: cards.filter(card => card.logic_value === '强付费').length },
    { id: 'lowCompetition', label: '低竞争', count: cards.filter(card => card.logic_value === '低竞争').length },
  ];
  els.quickViews.innerHTML = items.map(item => `
    <button class="nav-item ${state.activeQuickView === item.id ? 'active' : ''}" data-quick-view="${item.id}">
      <strong>${item.label}</strong>
      <span class="muted small">${item.count}</span>
    </button>
  `).join('');
}

function populateFilters(cards) {
  els.relationFilter.innerHTML = ['<option value="all">全部</option>']
    .concat(uniq(cards.map(card => card.relation.type)).map(item => `<option value="${item}">${RELATION_LOGIC[item] || item}</option>`))
    .join('');
  els.domainFilter.innerHTML = ['<option value="all">全部</option>']
    .concat(uniq(cards.map(card => card.domain.name)).map(item => `<option value="${item}">${item}</option>`))
    .join('');

  renderChipGroup(els.logicRelationChips, 'logicRelation', countBy(cards, card => card.logic_relation), '全部逻辑');
  renderChipGroup(els.logicActionChips, 'logicAction', countBy(cards, card => card.logic_action), '全部动作');
  renderChipGroup(els.logicValueChips, 'logicValue', countBy(cards, card => card.logic_value), '全部价值');
  renderChipGroup(els.logicStageChips, 'logicStage', countBy(cards, card => card.logic_stage), '全部阶段');
  renderChipGroup(els.topicPrimaryChips, 'topicPrimary', countBy(cards, card => card.topic_type_primary), '全部类型');
  renderChipGroup(els.topicSecondaryChips, 'topicSecondary', countBy(cards, card => card.topic_type_secondary), '全部子类');
}

function renderChipGroup(target, filterKey, counts, allLabel) {
  const active = state.filters[filterKey] || 'all';
  const buttons = [`<button class="filter-chip ${active === 'all' ? 'active' : ''}" data-filter-key="${filterKey}" data-filter-value="all">${allLabel}</button>`]
    .concat(Object.entries(counts).map(([label, count]) => `
      <button class="filter-chip ${active === label ? 'active' : ''}" data-filter-key="${filterKey}" data-filter-value="${label}">
        ${label}<span class="count">${count}</span>
      </button>
    `));
  target.innerHTML = buttons.join('');
}

function getActiveStrategyParts() {
  const entries = [
    ['视角', state.activeQuickView !== 'all' ? state.activeQuickView : null],
    ['逻辑', state.filters.logicRelation !== 'all' ? state.filters.logicRelation : null],
    ['动作', state.filters.logicAction !== 'all' ? state.filters.logicAction : null],
    ['价值', state.filters.logicValue !== 'all' ? state.filters.logicValue : null],
    ['阶段', state.filters.logicStage !== 'all' ? state.filters.logicStage : null],
    ['类型', state.filters.topicPrimary !== 'all' ? state.filters.topicPrimary : null],
    ['子类', state.filters.topicSecondary !== 'all' ? state.filters.topicSecondary : null],
  ].filter(([, value]) => value);
  return entries;
}

function renderActiveStrategyTags() {
  const entries = getActiveStrategyParts();
  els.activeStrategyTags.innerHTML = entries.length
    ? entries.map(([label, value]) => `<span class="strategy-tag">${label} · ${value}</span>`).join('')
    : '<span class="strategy-tag">当前策略 · 全部选题</span>';
  els.activeStrategy.textContent = entries.length ? `当前策略：${entries.map(([label, value]) => `${label}=${value}`).join(' / ')}` : '当前策略：全部选题';
}

function matchesQuickView(card) {
  switch (state.activeQuickView) {
    case 'today': return String(card.created || '').startsWith(state.raw?.batch?.created || '');
    case 'priority': return ['S', 'A'].includes(card.recommendation_grade);
    case 'project': return card.detailDecision === '立项候选' || card.quickDecision === '要';
    case 'reviewed': return card.processed_state === '已处理';
    case 'spread': return card.logic_value === '强传播';
    case 'payment': return card.logic_value === '强付费';
    case 'lowCompetition': return card.logic_value === '低竞争';
    default: return true;
  }
}

function applyFilters() {
  const relationType = els.relationFilter.value;
  const domain = els.domainFilter.value;
  const status = els.statusFilter.value;
  const quickDecision = els.quickFilter.value;
  const detailDecision = els.decisionFilter.value;
  const minScore = Number(els.scoreFilter.value);
  const keyword = els.keywordFilter.value.trim().toLowerCase();

  let list = state.cards.filter(card => {
    const matchRelation = relationType === 'all' || card.relation.type === relationType;
    const matchDomain = domain === 'all' || card.domain.name === domain;
    const matchStatus = status === 'all' || card.status === status;
    const matchQuick = quickDecision === 'all' || card.quickDecision === quickDecision;
    const matchDetail = detailDecision === 'all' || card.detailDecision === detailDecision;
    const matchScore = card.scores.total >= minScore;
    const matchLogicRelation = state.filters.logicRelation === 'all' || card.logic_relation === state.filters.logicRelation;
    const matchLogicAction = state.filters.logicAction === 'all' || card.logic_action === state.filters.logicAction;
    const matchLogicValue = state.filters.logicValue === 'all' || card.logic_value === state.filters.logicValue;
    const matchLogicStage = state.filters.logicStage === 'all' || card.logic_stage === state.filters.logicStage;
    const matchTopicPrimary = state.filters.topicPrimary === 'all' || card.topic_type_primary === state.filters.topicPrimary;
    const matchTopicSecondary = state.filters.topicSecondary === 'all' || card.topic_type_secondary === state.filters.topicSecondary;
    const matchQuickView = matchesQuickView(card);
    const haystack = [
      card.one_liner,
      card.logic_relation,
      card.logic_action,
      card.logic_value,
      card.logic_stage,
      card.topic_type_primary,
      card.topic_type_secondary,
      card.user.primary,
      card.user.secondary,
      card.competition.gap,
      card.quickDecision,
      card.detailDecision,
      card.manualNote,
      card.payment.why,
      card.product_shape,
      card.mvp_entry_suggestion,
      ...(card.risks || []),
      ...(card.rejection_reasons || []),
    ].join(' ').toLowerCase();
    const matchKeyword = !keyword || haystack.includes(keyword);
    return matchRelation && matchDomain && matchStatus && matchQuick && matchDetail && matchScore && matchLogicRelation && matchLogicAction && matchLogicValue && matchLogicStage && matchTopicPrimary && matchTopicSecondary && matchQuickView && matchKeyword;
  });

  list.sort(sortComparator());
  state.filtered = list;
  if (!list.find(card => card.id === state.selectedId)) state.selectedId = list[0]?.id || null;
  renderMetrics(state.raw.batch, state.cards, list);
  renderList(list);
  renderTable(list);
  renderDetail(list.find(card => card.id === state.selectedId));
  renderQuickViews(state.cards);
  renderActiveStrategyTags();
  els.listCount.textContent = `当前 ${list.length} / 总计 ${state.cards.length}`;
  bindInteractiveNodes();
}

function sortComparator() {
  if (state.sortBy === 'priority') return (a, b) => b.priority_score - a.priority_score || b.scores.total - a.scores.total;
  if (state.sortBy === 'grade') return (a, b) => GRADE_META[a.recommendation_grade].weight - GRADE_META[b.recommendation_grade].weight || b.priority_score - a.priority_score;
  return (a, b) => b.scores.total - a.scores.total || b.priority_score - a.priority_score;
}

function decisionBadge(decision) {
  const cls = decision === '立项候选' ? 'priority' : decision === '淘汰复核' ? 'danger' : decision === '待观察' ? 'warn' : 'neutral';
  return `<span class="score-pill ${cls}">${decision}</span>`;
}

function quickBadge(quickDecision) {
  const cls = quickDecision === '要' ? 'priority' : quickDecision === '不要' ? 'danger' : quickDecision === '再看' ? 'warn' : 'neutral';
  return `<span class="score-pill ${cls}">${quickDecision}</span>`;
}

function renderQuickActionButtons(card) {
  return [
    ['要', 'want'],
    ['再看', 'review'],
    ['不要', 'reject'],
  ].map(([label, cls]) => `<button class="quick-action ${card.quickDecision === label ? `active ${cls}` : ''}" data-action="quick" data-quick="${label}" data-id="${card.id}">${label}</button>`).join('');
}

function renderList(cards) {
  if (!cards.length) {
    els.ideaList.innerHTML = '<div class="empty-state">当前筛选条件下没有选题，换一个视角或降低最低分试试。</div>';
    return;
  }
  els.ideaList.innerHTML = cards.map(card => `
    <article class="idea-card ${card.id === state.selectedId ? 'active' : ''}" data-id="${card.id}">
      <div class="card-header">
        <div class="score-row">
          <span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.grade_label}</span>
          <span class="score-pill ${card.status === 'rejected' ? 'danger' : ''}">${card.status === 'candidate' ? '候选' : '淘汰'}</span>
          ${quickBadge(card.quickDecision)}
          ${decisionBadge(card.detailDecision)}
        </div>
        <div class="score-row">
          <span class="score-pill">总分 ${card.scores.total}</span>
          <span class="score-pill priority">优先级 ${card.priority_score}</span>
        </div>
      </div>
      <h3>${card.one_liner}</h3>
      <p class="muted"><strong>${card.grade_action_hint}</strong> · ${card.main_reason}</p>
      <div class="tags">
        <span class="tag emphasis">${card.logic_relation}</span>
        <span class="tag emphasis">${card.logic_action}</span>
        <span class="tag emphasis">${card.logic_value}</span>
        <span class="tag">${card.topic_type_primary}</span>
        <span class="tag">${card.topic_type_secondary}</span>
        <span class="tag">${card.product_shape}</span>
      </div>
      <div class="card-body">
        <p><strong>一句话机会：</strong>${card.opportunity_summary}</p>
        <p><strong>目标用户：</strong>${card.user.primary}</p>
        <p><strong>商业摘要：</strong>${card.monetization_hint}</p>
        <p><strong>风险一句话：</strong>${card.risk_summary}</p>
      </div>
      <div class="card-actions">
        ${renderQuickActionButtons(card)}
        <button class="quick-action favorite-toggle ${card.detailDecision === '收藏' ? 'active review' : ''}" data-action="favorite" data-id="${card.id}">收藏</button>
        <button class="quick-action" data-action="open" data-id="${card.id}">查看详情</button>
      </div>
      ${card.manualNote ? `<div class="summary-line"><span class="tag">备注</span><span class="muted small">${card.manualNote}</span></div>` : ''}
    </article>
  `).join('');
}

function renderTable(cards) {
  if (!cards.length) {
    els.ideaTableBody.innerHTML = '<tr><td colspan="10" class="muted">暂无结果</td></tr>';
    return;
  }
  els.ideaTableBody.innerHTML = cards.map(card => `
    <tr class="${card.id === state.selectedId ? 'active' : ''}" data-id="${card.id}">
      <td>
        <strong>${card.one_liner}</strong>
        <div class="muted small">${card.grade_action_hint}</div>
      </td>
      <td>${card.logic_relation}<br/><span class="muted small">${card.logic_action}</span></td>
      <td>${card.topic_type_primary}<br/><span class="muted small">${card.topic_type_secondary}</span></td>
      <td>${card.scores.total}</td>
      <td>${card.priority_score}</td>
      <td><span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.recommendation_grade}</span></td>
      <td>${card.payment.price}</td>
      <td>${card.product_shape}</td>
      <td>${card.ai.level}</td>
      <td>${card.quickDecision}</td>
    </tr>
  `).join('');
}

function updateDecision(cardId, patch) {
  const previous = state.decisionMap[cardId] || { quickDecision: '未处理', detailDecision: '未处理', note: '' };
  const next = {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (patch.quickDecision && !patch.detailDecision) next.detailDecision = QUICK_DECISION_TO_DETAIL[patch.quickDecision] || previous.detailDecision;
  if (patch.detailDecision && !patch.quickDecision) next.quickDecision = DETAIL_TO_QUICK[patch.detailDecision] || previous.quickDecision;
  state.decisionMap[cardId] = next;
  persistDecisionMap();
  state.cards = enrichCards(state.raw.cards);
  applyFilters();
}

function renderDetail(card) {
  if (!card) {
    els.detailContent.innerHTML = '<p class="muted">没有符合条件的选题。</p>';
    return;
  }
  els.detailContent.innerHTML = `
    <section class="detail-block">
      <div class="score-row">
        <span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.grade_label}</span>
        ${quickBadge(card.quickDecision)}
        ${decisionBadge(card.detailDecision)}
      </div>
      <h2>${card.one_liner}</h2>
      <p class="muted">${card.id} · 模板 ${card.template_id}</p>
      <p><strong>快速结论：</strong>${card.grade_action_hint}</p>
      <p><strong>主要原因：</strong>${card.main_reason}</p>
      <div class="summary-line">
        <span class="tag emphasis">${card.logic_relation}</span>
        <span class="tag emphasis">${card.logic_action}</span>
        <span class="tag emphasis">${card.logic_value}</span>
        <span class="tag">${card.logic_stage}</span>
        <span class="tag">${card.product_shape}</span>
      </div>
    </section>

    <section class="detail-block">
      <h3>机会分析</h3>
      <p><strong>这是个什么机会：</strong>${card.opportunity_summary}</p>
      <p><strong>为什么是现在：</strong>${card.logic_value} + ${card.ai.level} 级 AI 能力，让这个场景比传统工具更容易形成明确差异。</p>
      <p><strong>为什么值得你看：</strong>${card.grade_action_hint}，而且当前更适合从 ${card.topic_type_secondary} 这个入口切入。</p>
    </section>

    <section class="detail-block">
      <h3>用户与商业</h3>
      <div class="kv-grid">
        <div class="kv-item"><span>核心用户</span><strong>${card.user.primary}</strong></div>
        <div class="kv-item"><span>次级用户</span><strong>${card.user.secondary}</strong></div>
        <div class="kv-item"><span>谁买单</span><strong>${card.payment.who}</strong></div>
        <div class="kv-item"><span>价格带</span><strong>${card.payment.price}</strong></div>
      </div>
      <p><strong>为什么会付费：</strong>${card.payment.why}</p>
      <p><strong>更可能的收费方式：</strong>${card.monetization_hint}</p>
      <p class="muted">免费层：${card.payment.free_tier}<br/>会员层：${card.payment.vip_tier}</p>
    </section>

    <section class="detail-block">
      <h3>产品形态建议</h3>
      <div class="kv-grid">
        <div class="kv-item"><span>推荐形态</span><strong>${card.product_shape}</strong></div>
        <div class="kv-item"><span>页面类型</span><strong>${card.action.page_type || '结果页'}</strong></div>
      </div>
      <p><strong>为什么适合：</strong>${card.product_shape_reason}</p>
      <p><strong>MVP 切入建议：</strong>${card.mvp_entry_suggestion}</p>
    </section>

    <section class="detail-block">
      <h3>竞争与风险</h3>
      <p><strong>替代方案：</strong>${card.competition.existing}</p>
      <p><strong>差异点：</strong>${card.competition.gap}</p>
      <p><strong>难点：</strong>${card.competition.moat}</p>
      <ul class="bullet-list">${(card.risks || []).map(item => `<li>${item}</li>`).join('')}</ul>
      ${card.rejection_reasons?.length ? `<p class="danger-text"><strong>淘汰原因：</strong>${card.rejection_reasons.join(' / ')}</p>` : ''}
    </section>

    <section class="detail-block">
      <h3>人工决策与沉淀</h3>
      <label>
        <span>第一层：快速决策</span>
        <select id="detail-quick-decision">
          ${['未处理', '要', '再看', '不要'].map(item => `<option value="${item}" ${card.quickDecision === item ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>第二层：详细标签</span>
        <select id="detail-decision">
          ${['未处理', '收藏', '待观察', '立项候选', '淘汰复核'].map(item => `<option value="${item}" ${card.detailDecision === item ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>备注</span>
        <textarea id="detail-note" rows="4" placeholder="记录你的判断依据">${card.manualNote || ''}</textarea>
      </label>
      <div class="inline-actions">
        <button id="save-decision" class="button primary">保存判断</button>
        <button id="mark-project" class="button secondary">加入立项池</button>
      </div>
    </section>

    <section class="detail-block">
      <h3>评分拆解</h3>
      <div class="kv-grid">${Object.entries(card.scores).map(([k, v]) => `<div class="kv-item"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>
    </section>
  `;

  document.getElementById('save-decision')?.addEventListener('click', () => {
    updateDecision(card.id, {
      quickDecision: document.getElementById('detail-quick-decision').value,
      detailDecision: document.getElementById('detail-decision').value,
      note: document.getElementById('detail-note').value.trim(),
    });
  });

  document.getElementById('mark-project')?.addEventListener('click', () => {
    updateDecision(card.id, {
      quickDecision: '要',
      detailDecision: '立项候选',
      note: document.getElementById('detail-note').value.trim(),
    });
  });
}

function bindInteractiveNodes() {
  document.querySelectorAll('.idea-card').forEach(node => node.addEventListener('click', event => {
    if (event.target.closest('[data-action]')) return;
    state.selectedId = node.dataset.id;
    renderList(state.filtered);
    renderTable(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
  }));

  document.querySelectorAll('[data-action="quick"]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    updateDecision(node.dataset.id, { quickDecision: node.dataset.quick });
  }));

  document.querySelectorAll('[data-action="favorite"]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    const card = state.cards.find(item => item.id === node.dataset.id);
    const nextDetail = card?.detailDecision === '收藏' ? QUICK_DECISION_TO_DETAIL[card.quickDecision] || '未处理' : '收藏';
    updateDecision(node.dataset.id, { detailDecision: nextDetail });
  }));

  document.querySelectorAll('[data-action="open"]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    state.selectedId = node.dataset.id;
    renderList(state.filtered);
    renderTable(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
  }));

  document.querySelectorAll('.idea-table tbody tr').forEach(node => node.addEventListener('click', () => {
    state.selectedId = node.dataset.id;
    renderTable(state.filtered);
    renderList(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
  }));

  document.querySelectorAll('.filter-chip').forEach(node => node.addEventListener('click', () => {
    state.filters[node.dataset.filterKey] = node.dataset.filterValue;
    populateFilters(state.cards);
    applyFilters();
  }));

  document.querySelectorAll('[data-quick-view]').forEach(node => node.addEventListener('click', () => {
    state.activeQuickView = node.dataset.quickView;
    applyFilters();
  }));
}

function buildCommandPreview() {
  const relation = els.generateRelation.value;
  const name = els.generateName.value.trim() || '页面触发批次';
  const multiplier = Number(els.generateMultiplier.value || 1);
  const qualityMode = els.generateQuality.value;
  els.commandPreview.textContent = JSON.stringify({ relation, name, multiplier, qualityMode, endpoint: 'POST /api/generate' }, null, 2);
}

async function handleGenerate() {
  const relation = els.generateRelation.value || null;
  const name = els.generateName.value.trim() || '页面触发批次';
  const multiplier = Number(els.generateMultiplier.value || 1);
  const qualityMode = els.generateQuality.value || 'focused';
  const batchId = `BATCH-WEB-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;
  els.generateBatch.disabled = true;
  els.generateStatus.textContent = '正在生成批次，请稍候...';
  buildCommandPreview();
  try {
    const result = await request('/generate', {
      method: 'POST',
      body: JSON.stringify({ relation, name, multiplier, batch_id: batchId, quality_mode: qualityMode }),
    });
    els.generateStatus.textContent = `生成完成：${result.batch.batch_id}，共 ${result.cards_count} 条`;
    await loadIndex();
    if (result.batch?.batch_id) {
      await loadBatch(result.batch.batch_id);
      els.batchSelect.value = result.batch.batch_id;
    }
  } catch (error) {
    els.generateStatus.textContent = `生成失败：${error.message}`;
  } finally {
    els.generateBatch.disabled = false;
  }
}

function setSort(sortBy) {
  state.sortBy = sortBy;
  [els.sortTotal, els.sortPriority, els.sortGrade].forEach(btn => btn.classList.remove('active'));
  if (sortBy === 'total') els.sortTotal.classList.add('active');
  if (sortBy === 'priority') els.sortPriority.classList.add('active');
  if (sortBy === 'grade') els.sortGrade.classList.add('active');
  applyFilters();
}

function setView(viewMode) {
  state.viewMode = viewMode;
  els.viewCards.classList.toggle('active', viewMode === 'cards');
  els.viewTable.classList.toggle('active', viewMode === 'table');
  els.cardsView.classList.toggle('hidden', viewMode !== 'cards');
  els.tableView.classList.toggle('hidden', viewMode !== 'table');
}

function clearFilterState() {
  state.activeQuickView = 'all';
  state.filters = {
    logicRelation: 'all',
    logicAction: 'all',
    logicValue: 'all',
    logicStage: 'all',
    topicPrimary: 'all',
    topicSecondary: 'all',
  };
  els.statusFilter.value = 'all';
  els.quickFilter.value = 'all';
  els.decisionFilter.value = 'all';
  els.relationFilter.value = 'all';
  els.domainFilter.value = 'all';
  els.scoreFilter.value = '70';
  els.scoreValue.textContent = '70';
  els.keywordFilter.value = '';
  populateFilters(state.cards);
  applyFilters();
}

function toggleGenerator(open) {
  els.generatorPanel.classList.toggle('hidden', !open);
}

els.batchSelect.addEventListener('change', async () => loadBatch(els.batchSelect.value));
els.refreshBatches.addEventListener('click', async () => { await loadIndex(); els.generateStatus.textContent = '批次列表已刷新'; });
els.generateBatch.addEventListener('click', handleGenerate);
els.generateMultiplier.addEventListener('change', buildCommandPreview);
els.generateRelation.addEventListener('change', buildCommandPreview);
els.generateName.addEventListener('input', buildCommandPreview);
els.generateQuality.addEventListener('change', buildCommandPreview);
els.scoreFilter.addEventListener('input', () => { els.scoreValue.textContent = els.scoreFilter.value; applyFilters(); });
els.keywordFilter.addEventListener('input', applyFilters);
els.relationFilter.addEventListener('change', applyFilters);
els.domainFilter.addEventListener('change', applyFilters);
els.statusFilter.addEventListener('change', applyFilters);
els.quickFilter.addEventListener('change', applyFilters);
els.decisionFilter.addEventListener('change', applyFilters);
els.sortTotal.addEventListener('click', () => setSort('total'));
els.sortPriority.addEventListener('click', () => setSort('priority'));
els.sortGrade.addEventListener('click', () => setSort('grade'));
els.viewCards.addEventListener('click', () => setView('cards'));
els.viewTable.addEventListener('click', () => setView('table'));
els.clearFilters.addEventListener('click', clearFilterState);
els.openGenerator.addEventListener('click', () => toggleGenerator(true));
els.closeGenerator.addEventListener('click', () => toggleGenerator(false));
document.querySelectorAll('.idea-table thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const key = th.dataset.sort;
  if (key === 'priority_score') return setSort('priority');
  if (key === 'recommendation_grade') return setSort('grade');
  return setSort('total');
}));

loadIndex().then(() => {
  buildCommandPreview();
  setView('cards');
  toggleGenerator(false);
}).catch(error => {
  document.body.innerHTML = `<pre style="padding:24px;color:#0f172a">加载失败：${error.message}\n请检查服务是否正常启动，然后访问 /ui-web/</pre>`;
});
