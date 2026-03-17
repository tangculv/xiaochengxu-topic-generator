const API_BASE = `${window.location.origin}/api`;
const DECISION_STORAGE_KEY = 'topic-generator-decisions-v4';
const PROJECT_STORAGE_KEY = 'topic-generator-project-state-v1';
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
  S: { label: 'S｜优先立项', shortLabel: '优先立项', action: '建议先做', weight: 0, brief: '值得优先做' },
  A: { label: 'A｜优先验证', shortLabel: '优先验证', action: '建议尽快验证', weight: 1, brief: '值得尽快试' },
  B: { label: 'B｜继续观察', shortLabel: '继续观察', action: '建议继续观察', weight: 2, brief: '先保留观察' },
  C: { label: 'C｜谨慎评估', shortLabel: '谨慎评估', action: '建议谨慎投入', weight: 3, brief: '暂时别投入太多' },
  D: { label: 'D｜暂不投入', shortLabel: '暂不投入', action: '当前不建议投入', weight: 4, brief: '暂时不用做' },
};


const DEFAULT_PROJECT_STATE = {
  stage: '待验证',
  priority: 'P1',
  owner: '',
  nextAction: '',
  validationPlan: '',
  hypothesis: '',
  projectNote: '',
  dueDate: '',
  updatedAt: '',
};

const PROJECT_STAGES = ['待验证', '准备原型', '准备开发', '已上线'];
const PROJECT_PRIORITIES = ['P0', 'P1', 'P2'];
const KEYBOARD_DECISION_MAP = {
  y: '要',
  r: '再看',
  n: '不要',
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
  projectMap: loadProjectMap(),
  activeQuickView: 'all',
  activeSystemView: 'none',
  mobileDetailOpen: false,
  pendingActionFocus: 'none',
  executionSubview: 'all',
  autoSuggestedIds: [],
  filters: {
    logicRelation: 'all',
    logicAction: 'all',
    logicValue: 'all',
    logicStage: 'all',
    topicPrimary: 'all',
    topicSecondary: 'all',
  },
  expandedCards: new Set(),
  selectedCards: new Set(),
  expandAll: false,
  mainTab: 'ideas',
  focusMode: true,
  hideProcessedInFocus: true,
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

function loadProjectMap() {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistProjectMap() {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(state.projectMap));
}

function getProjectState(cardId) {
  return {
    ...DEFAULT_PROJECT_STATE,
    ...(state.projectMap[cardId] || {}),
  };
}

function updateProjectState(cardId, patch) {
  state.projectMap[cardId] = {
    ...getProjectState(cardId),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  persistProjectMap();
  state.cards = enrichCards(state.raw.cards);
  applyFilters();
}

function updateProjectStateBatch(cardIds, patch) {
  cardIds.forEach(cardId => {
    state.projectMap[cardId] = {
      ...getProjectState(cardId),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  });
  persistProjectMap();
  state.cards = enrichCards(state.raw.cards);
  applyFilters();
}

function updateProjectStateBatchWithMap(patchMap) {
  Object.entries(patchMap).forEach(([cardId, patch]) => {
    state.projectMap[cardId] = {
      ...getProjectState(cardId),
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  });
  persistProjectMap();
  state.cards = enrichCards(state.raw.cards);
  applyFilters();
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
  systemViews: document.getElementById('system-views'),
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
  detailPanel: document.getElementById('detail-panel'),
  detailContent: document.getElementById('detail-content'),
  mobileDetailBackdrop: document.getElementById('mobile-detail-backdrop'),
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
  actionInsights: document.getElementById('action-insights'),
  inlineAiTip: document.getElementById('inline-ai-tip'),
  projectGuidance: document.getElementById('project-guidance'),
  workspaceSecondaryTools: document.getElementById('workspace-secondary-tools'),
  projectTodoStrip: document.getElementById('project-todo-strip'),
  projectSubviews: document.getElementById('project-subviews'),
  suggestedQueue: document.getElementById('suggested-queue'),
  selectionMore: document.getElementById('selection-more'),
  selectionCount: document.getElementById('selection-count'),
  selectionHint: document.getElementById('selection-hint'),
  batchWant: document.getElementById('batch-want'),
  batchReview: document.getElementById('batch-review'),
  batchReject: document.getElementById('batch-reject'),
  batchProject: document.getElementById('batch-project'),
  clearSelection: document.getElementById('clear-selection'),
  batchStageValidate: document.getElementById('batch-stage-validate'),
  batchStagePrototype: document.getElementById('batch-stage-prototype'),
  batchStageBuild: document.getElementById('batch-stage-build'),
  batchPriorityP0: document.getElementById('batch-priority-p0'),
  batchFillOwner: document.getElementById('batch-fill-owner'),
  batchFillNextAction: document.getElementById('batch-fill-next-action'),
  batchFillValidation: document.getElementById('batch-fill-validation'),
  toggleAllExpanded: document.getElementById('toggle-all-expanded'),
  selectAllTable: document.getElementById('select-all-table'),
  tabIdeas: document.getElementById('tab-ideas'),
  tabOverview: document.getElementById('tab-overview'),
  focusMode: document.getElementById('focus-mode'),
  ideasTab: document.getElementById('ideas-tab'),
  overviewTab: document.getElementById('overview-tab'),
  projectPipeline: document.getElementById('project-pipeline'),
  mobileDetailToggle: document.getElementById('mobile-detail-toggle'),
  mobileTableTip: document.getElementById('mobile-table-tip'),
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

function gradeShortLabel(grade) {
  return GRADE_META[grade]?.shortLabel || grade;
}

function gradeActionHint(grade) {
  return GRADE_META[grade]?.action || '继续观察';
}

function gradeBrief(grade) {
  return GRADE_META[grade]?.brief || '继续观察';
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

function deriveStrengths(card) {
  const strengths = [];
  if (['S', 'A'].includes(card.recommendation_grade)) strengths.push('综合评分高');
  if (card.logic_value === '强付费') strengths.push('付费意愿清晰');
  if (card.logic_value === '强传播') strengths.push('传播潜力好');
  if (card.logic_value === '高痛点') strengths.push('痛点强烈');
  if (card.logic_value === '高AI杠杆') strengths.push('AI 杠杆高');
  if (card.logic_value === '低竞争') strengths.push('竞争相对可控');
  return uniq(strengths).slice(0, 3);
}

function deriveWeaknesses(card) {
  const weaknesses = [];
  if (card.recommendation_grade === 'B') weaknesses.push('仍需更多验证');
  if (['C', 'D'].includes(card.recommendation_grade)) weaknesses.push('当前确定性不够');
  if ((card.risks || []).length) weaknesses.push(card.risks[0]);
  if ((card.rejection_reasons || []).length) weaknesses.push(card.rejection_reasons[0]);
  if ((card.priority_score || 0) < 66) weaknesses.push('优先级尚未明显拉开');
  return uniq(weaknesses).slice(0, 3);
}

function deriveValidationNeed(card) {
  if (card.recommendation_grade === 'S') return '验证用户是否愿意持续复用，并确认 MVP 的首个高频入口。';
  if (card.recommendation_grade === 'A') return '先验证是否能在单点场景中形成明显付费或复购信号。';
  if (card.recommendation_grade === 'B') return '先做低成本 MVP，观察真实留存与转化。';
  return '先补用户需求与竞争验证，再决定是否继续投入。';
}

function deriveWorthDoingReason(card) {
  if (card.logic_value === '强付费') return `付费对象明确，而且 ${card.payment.why || '付费理由比较顺'}。`;
  if (card.logic_value === '高痛点') return `痛点足够强，用户会为了减少麻烦主动尝试。`;
  if (card.logic_value === '高AI杠杆') return `AI 能把复杂判断压缩成更省事的日常操作。`;
  if (card.logic_value === '低竞争') return `当前替代方案不够强，存在可切入的窗口。`;
  return `场景清晰，而且 ${card.user.primary} 的使用动机明确。`;
}

function deriveHoldReason(card) {
  if (card.recommendation_grade === 'S') return '不是先证明有没有需求，而是先证明能不能稳定复用。';
  if (card.recommendation_grade === 'A') return '方向成立，但还需要先证明转化或留存是否够强。';
  if (card.recommendation_grade === 'B') return '目前更像候选方向，暂时不适合直接重投入。';
  if ((card.risks || []).length) return card.risks[0];
  return '当前确定性还不够，建议先低成本验证。';
}

function deriveValidationMethod(card) {
  if (card.product_shape === '工具型') return '先做单页面工具，验证用户是否愿意连续 3 次以上重复使用。';
  if (card.product_shape === '报告型') return '先做上传资料 → 自动出报告，验证用户是否愿意分享或复购。';
  if (card.product_shape === '协作型') return '先做最小协作链路，验证是否真有多人协同需求。';
  return '先做最小闭环 MVP，验证是否能形成真实回访和转化。';
}

function deriveNextAction(card) {
  if (card.quickDecision === '要' || card.detailDecision === '立项候选') return '补齐 MVP 方案，并安排首轮验证。';
  if (card.quickDecision === '再看') return '补一轮需求验证，再决定是否进入立项池。';
  if (card.quickDecision === '不要') return '记录淘汰原因，避免后续重复投入。';
  return '先做一次快速判断，再决定是否继续深入。';
}

function deriveProjectReadiness(card) {
  if (card.detailDecision === '立项候选' || card.quickDecision === '要') return '可以进入立项准备';
  if (card.quickDecision === '再看') return '适合继续观察';
  return '暂不进入立项';
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
      grade_short_label: gradeShortLabel(grade),
      grade_action_hint: gradeActionHint(grade),
      logic_relation: RELATION_LOGIC[card.relation.type] || '其他逻辑',
      logic_action: ACTION_LOGIC[card.action.category] || '判断型',
      topic_type_primary: deriveTopicPrimary(card),
      topic_type_secondary: deriveTopicSecondary(card),
    };
    enriched.logic_value = deriveLogicValue(enriched);
    enriched.logic_stage = deriveLogicStage(enriched, grade);
    enriched.processed_state = deriveProcessedState(enriched);
    const projectState = getProjectState(card.id);
    const productShape = deriveProductShape(enriched);
    enriched.product_shape = productShape.shape;
    enriched.product_shape_reason = productShape.reason;
    enriched.mvp_entry_suggestion = productShape.mvp;
    enriched.monetization_hint = productShape.monetization;
    enriched.project = projectState;
    enriched.opportunity_summary = `${enriched.payment.who}愿意为“${enriched.payment.why}”付费，适合先从${enriched.topic_type_secondary}切入。`;
    enriched.risk_summary = (enriched.risks || [])[0] || (enriched.rejection_reasons || []).join(' / ') || '暂无明显风险';
    enriched.main_reason = `${enriched.logic_relation}、${enriched.logic_value}，更适合先做${enriched.product_shape}。`;
    enriched.decision_funnel_stage = deriveDecisionFunnelStage(enriched);
    enriched.strengths = deriveStrengths(enriched);
    enriched.weaknesses = deriveWeaknesses(enriched);
    enriched.validation_need = deriveValidationNeed(enriched);
    enriched.worth_doing_reason = deriveWorthDoingReason(enriched);
    enriched.hold_reason = deriveHoldReason(enriched);
    enriched.validation_method = deriveValidationMethod(enriched);
    enriched.next_action = projectState.nextAction || deriveNextAction(enriched);
    enriched.project_readiness = deriveProjectReadiness(enriched);
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
  state.selectedCards.clear();
  state.expandedCards.clear();
  state.expandAll = false;
  els.batchTitle.textContent = payload.batch.name;
  els.batchMeta.textContent = `${payload.batch.batch_id} · ${payload.batch.created} · 导出 ${payload.batch.export_csv || '无'}`;
  populateFilters(state.cards);
  renderQuickViews(state.cards);
  renderSystemViews(state.cards);
  renderMetrics(payload.batch, state.cards, state.cards);
  renderSelectionState();
  applyFilters();
}

function metric(label, value, hint = '', jumpView = '') {
  return `<div class="metric ${jumpView ? 'metric-clickable' : ''}" ${jumpView ? `data-jump-view="${jumpView}"` : ''}><span class="muted">${label}</span><strong>${value}</strong>${hint ? `<p class="muted small">${hint}</p>` : ''}</div>`;
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
    '待验证': allCards.filter(card => card.project.stage === '待验证').length,
    '准备原型': allCards.filter(card => card.project.stage === '准备原型').length,
    '准备开发': allCards.filter(card => card.project.stage === '准备开发').length,
    '已淘汰': allCards.filter(card => card.quickDecision === '不要' || card.status === 'rejected' || card.detailDecision === '淘汰复核').length,
  };
  const funnelJumpMap = {
    '已进入立项池': 'project',
    '待验证': 'validate',
    '准备原型': 'prototype',
    '准备开发': 'build',
  };
  els.funnelMetrics.innerHTML = Object.entries(funnel).map(([label, value]) => metric(label, value, '', funnelJumpMap[label] || '')).join('');

  const quickCounts = countBy(allCards, card => card.quickDecision, ['要', '再看', '不要', '未处理']);
  els.quickMetrics.innerHTML = Object.entries(quickCounts).map(([label, value]) => metric(label, value)).join('');

  const detailCounts = countBy(allCards, card => card.detailDecision, ['收藏', '待观察', '立项候选', '淘汰复核', '未处理']);
  els.decisionMetrics.innerHTML = Object.entries(detailCounts).map(([label, value]) => metric(label, value)).join('');

  renderBars(els.logicDistribution, countBy(allCards, card => card.logic_relation));
  renderBars(els.typeDistribution, countBy(allCards, card => card.topic_type_primary));
  renderScoreBars(currentCards);
  renderActionInsights(allCards, currentCards);
  renderInlineAiTip(currentCards);
  renderProjectPipeline(allCards);
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

function renderQuickViews(cards, currentList = state.filtered) {
  const batchCreated = state.raw?.batch?.created || '';
  const items = [
    { id: 'all', label: '全部选题', description: '查看当前批次的全部题目', count: cards.length },
    { id: 'priority', label: '优先看', description: '优先看最值得处理的题目', count: cards.filter(card => ['S', 'A'].includes(card.recommendation_grade)).length },
    { id: 'project', label: '立项池', description: '你已经归入立项池的题目', count: cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要').length },
    { id: 'pipeline', label: '推进中', description: '已进入推进流程的题目', count: cards.filter(card => ['待验证', '准备原型', '准备开发', '已上线'].includes(card.project.stage)).length },
    { id: 'validate', label: '待验证', description: '下一步要先验证价值的题目', count: cards.filter(card => card.project.stage === '待验证').length },
    { id: 'prototype', label: '准备原型', description: '适合进入原型设计的题目', count: cards.filter(card => card.project.stage === '准备原型').length },
    { id: 'build', label: '准备开发', description: '已经接近开发排期的题目', count: cards.filter(card => card.project.stage === '准备开发').length },
    { id: 'unprocessed', label: '仅看未处理', description: '只看你还没做判断的题目', count: cards.filter(card => card.quickDecision === '未处理').length },
    { id: 'reviewed', label: '已处理', description: '你已经看过并做过判断的题目', count: cards.filter(card => card.processed_state === '已处理').length },
    { id: 'today', label: '本批新增', description: '只看这个批次里刚生成的题目', count: cards.filter(card => String(card.created || '').startsWith(batchCreated)).length },
  ];
  els.quickViews.innerHTML = items.map(item => `
    <button class="nav-item ${state.activeQuickView === item.id ? 'active' : ''}" data-quick-view="${item.id}">
      <div>
        <strong>${item.label}</strong>${state.activeSystemView === item.id ? `<span class="nav-inline-hint">当前</span>` : ''}
        <div class="muted small">${item.description}</div>
      </div>
      <span class="muted small">${item.count}</span>
    </button>
  `).join('');
}

function renderSystemViews(cards) {
  const items = [
    { id: 'recommendLaunch', label: '优先立项', description: '适合优先推进立项的题目', count: cards.filter(card => card.recommendation_grade === 'S' && ['强付费', '低竞争'].includes(card.logic_value)).length },
    { id: 'recommendValidate', label: '优先验证', description: '适合先做验证的题目', count: cards.filter(card => ['S', 'A'].includes(card.recommendation_grade) && card.project.stage === '待验证').length },
    { id: 'mvpEasy', label: '低成本 MVP', description: '更适合低成本先做 MVP 的题目', count: cards.filter(card => ['判断型', '分发型'].includes(card.logic_action)).length },
  ];
  els.systemViews.innerHTML = items.map(item => `
    <button class="nav-item ${state.activeSystemView === item.id ? 'active' : ''}" data-system-view="${item.id}">
      <div>
        <strong>${item.label}</strong>${state.activeQuickView === item.id ? `<span class="nav-inline-hint">当前</span>` : ''}
        <div class="muted small">${item.description}</div>
      </div>
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

function getSystemViewLabel() {
  const map = {
    recommendLaunch: '系统建议=优先立项',
    recommendValidate: '系统建议=优先验证',
    mvpEasy: '系统建议=低成本 MVP',
  };
  return map[state.activeSystemView] || null;
}

function getQuickViewLabel() {
  const map = {
    today: '本批新增',
    priority: '优先看',
    project: '立项池',
    pipeline: '推进中',
    validate: '待验证',
    prototype: '准备原型',
    build: '准备开发',
    launched: '已上线',
    unprocessed: '仅看未处理',
    reviewed: '已处理',
    spread: '高传播',
    payment: '强付费',
    lowCompetition: '低竞争',
  };
  return map[state.activeQuickView] || null;
}

function getActiveStrategyParts() {
  const entries = [
    ['视角', getQuickViewLabel()],
    ['推荐', getSystemViewLabel()],
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
  els.activeStrategy.textContent = entries.length ? `当前筛选：${entries.map(([label, value]) => `${label}=${value}`).join(' / ')}` : '当前筛选：全部题目';
}

function matchesQuickView(card) {
  switch (state.activeQuickView) {
    case 'today': return String(card.created || '').startsWith(state.raw?.batch?.created || '');
    case 'priority': return ['S', 'A'].includes(card.recommendation_grade);
    case 'project': return card.detailDecision === '立项候选' || card.quickDecision === '要';
    case 'pipeline': return ['待验证', '准备原型', '准备开发', '已上线'].includes(card.project.stage);
    case 'validate': return card.project.stage === '待验证';
    case 'prototype': return card.project.stage === '准备原型';
    case 'build': return card.project.stage === '准备开发';
    case 'launched': return card.project.stage === '已上线';
    case 'unprocessed': return card.quickDecision === '未处理';
    case 'reviewed': return card.processed_state === '已处理';
    case 'spread': return card.logic_value === '强传播';
    case 'payment': return card.logic_value === '强付费';
    case 'lowCompetition': return card.logic_value === '低竞争';
    default: return true;
  }
}

function matchesExecutionSubview(card) {
  switch (state.executionSubview) {
    case 'missingAction':
      return !card.project.nextAction;
    case 'missingValidation':
      return card.project.stage === '待验证' && !card.project.validationPlan;
    case 'readyPrototype':
      return card.project.stage === '待验证' && card.project.nextAction && card.project.validationPlan;
    case 'p0':
      return card.project.priority === 'P0';
    default:
      return true;
  }
}

function resetExecutionSubviewIfNeeded() {
  if (!['project', 'pipeline', 'validate'].includes(state.activeQuickView)) {
    state.executionSubview = 'all';
  }
}

function buildSuggestedQueue(cards) {
  const candidates = cards
    .filter(card => ['project', 'pipeline', 'validate'].includes(state.activeQuickView) ? true : (card.detailDecision === '立项候选' || card.quickDecision === '要' || card.project.stage === '待验证'))
    .slice()
    .sort((a, b) => executionWeight(b) - executionWeight(a));
  const missingAction = candidates.filter(card => !card.project.nextAction).slice(0, 4);
  const missingValidation = candidates.filter(card => card.project.stage === '待验证' && !card.project.validationPlan).slice(0, 4);
  const readyPrototype = candidates.filter(card => card.project.stage === '待验证' && card.project.nextAction && card.project.validationPlan).slice(0, 4);
  if (missingAction.length) return { type: 'fillNextAction', label: '系统推荐：先补动作', hint: '这些题已经值得推进，但卡在下一步动作不清楚', cards: missingAction };
  if (missingValidation.length) return { type: 'fillValidation', label: '系统推荐：先补验证', hint: '这些题已经进入待验证，但验证方式还没写清楚', cards: missingValidation };
  if (readyPrototype.length) return { type: 'stagePrototype', label: '系统推荐：推进到原型', hint: '这些题验证信息已齐，可以进入原型设计', cards: readyPrototype };
  return { type: 'project', label: '系统推荐：继续挑立项题', hint: '当前执行队列已较完整，可以继续补充新的立项题', cards: candidates.slice(0, 4) };
}

function applySuggestedQueueSelection(suggestion) {
  state.selectedCards = new Set((suggestion?.cards || []).map(card => card.id));
  state.autoSuggestedIds = [...state.selectedCards];
  setPendingActionFocus(suggestion?.type || 'none');
  renderSelectionState();
}

function renderSuggestedQueue(cards) {
  if (!els.suggestedQueue) return false;
  const relevant = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage));
  if (!relevant.length) {
    els.suggestedQueue.classList.add('hidden');
    els.suggestedQueue.innerHTML = '';
    return false;
  }
  const suggestion = buildSuggestedQueue(relevant);
  const selectedCount = suggestion.cards.filter(card => state.selectedCards.has(card.id)).length;
  const compactLabel = selectedCount ? `已选推荐 ${selectedCount}/${suggestion.cards.length}` : `选择这组 ${suggestion.cards.length} 题`;
  els.suggestedQueue.classList.remove('hidden');
  els.suggestedQueue.innerHTML = `
    <div class="suggestion-main compact-suggestion-main">
      <div class="todo-strip-main suggestion-copy">
        <strong>推荐题组</strong>
        <span class="muted small">${suggestion.cards.length} 个题适合一起处理：${suggestion.hint}</span>
      </div>
      <div class="suggestion-actions">
        <button class="button ghost small-button" data-suggest-apply="${suggestion.type}">${compactLabel}</button>
      </div>
    </div>
    <div class="todo-strip-metrics suggestion-list">
      ${suggestion.cards.map(card => `<button class="todo-chip ${state.selectedCards.has(card.id) ? 'good' : ''}" data-suggest-select="${card.id}">${card.one_liner.slice(0, isMobileLayout() ? 10 : 16)}</button>`).join('')}
    </div>
  `;
  return true;
}

function matchesSystemView(card) {
  switch (state.activeSystemView) {
    case 'recommendLaunch':
      return card.recommendation_grade === 'S' && ['强付费', '低竞争'].includes(card.logic_value);
    case 'recommendValidate':
      return ['S', 'A'].includes(card.recommendation_grade) && card.project.stage === '待验证';
    case 'mvpEasy':
      return ['判断型', '分发型'].includes(card.logic_action);
    default:
      return true;
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
  const autoHideProcessed = state.focusMode && state.hideProcessedInFocus;

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
    const matchSystemView = matchesSystemView(card);
    const matchExecutionSubview = matchesExecutionSubview(card);
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
    const matchFocusProcessed = !autoHideProcessed || card.quickDecision === '未处理';
    return matchRelation && matchDomain && matchStatus && matchQuick && matchDetail && matchScore && matchLogicRelation && matchLogicAction && matchLogicValue && matchLogicStage && matchTopicPrimary && matchTopicSecondary && matchQuickView && matchSystemView && matchExecutionSubview && matchKeyword && matchFocusProcessed;
  });

  list.sort(sortComparator());
  state.filtered = list;
  syncSelectionWithVisibleCards();
  if (!list.find(card => card.id === state.selectedId)) state.selectedId = list[0]?.id || null;
  renderMetrics(state.raw.batch, state.cards, list);
  renderList(list);
  renderTable(list);
  renderDetail(list.find(card => card.id === state.selectedId));
  renderQuickViews(state.cards);
  renderSystemViews(state.cards);
  renderActiveStrategyTags();
  renderSelectionState();
  renderProjectGuidance(list);
  renderProjectTodoStrip(list);
  renderProjectSubViews(state.cards);
  renderSuggestedQueue(list);
  syncWorkspaceSecondaryTools();
  renderProjectExecutionBar(list);
  els.listCount.textContent = `当前 ${list.length} / 总计 ${state.cards.length}`;
  bindInteractiveNodes();
  syncMobileDetailState();
  syncBatchActionFocus();
  syncMobileTableTip();
}

function executionWeight(card) {
  let score = 0;
  if (card.detailDecision === '立项候选' || card.quickDecision === '要') score += 40;
  if (card.project.stage === '待验证') score += 30;
  if (!card.project.nextAction) score += 12;
  if (card.project.stage === '待验证' && !card.project.validationPlan) score += 10;
  if (!card.project.owner) score += 6;
  score += (card.priority_score || 0) / 10;
  return score;
}

function sortComparator() {
  if (state.activeQuickView === 'project' || state.activeQuickView === 'pipeline' || state.activeQuickView === 'validate') {
    return (a, b) => executionWeight(b) - executionWeight(a) || b.priority_score - a.priority_score || b.scores.total - a.scores.total;
  }
  if (state.sortBy === 'priority') return (a, b) => b.priority_score - a.priority_score || b.scores.total - a.scores.total;
  if (state.sortBy === 'grade') return (a, b) => GRADE_META[a.recommendation_grade].weight - GRADE_META[b.recommendation_grade].weight || b.priority_score - a.priority_score;
  return (a, b) => b.scores.total - a.scores.total || b.priority_score - a.priority_score;
}

function decisionBadge(decision) {
  const cls = decision === '立项候选' ? 'priority' : decision === '淘汰复核' ? 'danger' : decision === '待观察' ? 'warn' : 'neutral';
  return `<span class="score-pill ${cls}" title="当前判断">${decision}</span>`;
}

function quickBadge(quickDecision) {
  const cls = quickDecision === '要' ? 'priority' : quickDecision === '不要' ? 'danger' : quickDecision === '再看' ? 'warn' : 'neutral';
  return `<span class="score-pill ${cls}" title="快速判断">${quickDecision}</span>`;
}

function renderQuickActionButtons(card) {
  return [
    ['要', 'want'],
    ['再看', 'review'],
    ['不要', 'reject'],
  ].map(([label, cls]) => `<button class="quick-action ${card.quickDecision === label ? `active ${cls}` : ''}" data-action="quick" data-quick="${label}" data-id="${card.id}">${label}</button>`).join('');
}

function isExpanded(cardId) {
  return state.expandAll || state.expandedCards.has(cardId);
}

function renderCompactReason(card) {
  return card.main_reason || gradeBrief(card.recommendation_grade);
}

function deriveProjectMissingInfo(card) {
  const missing = [];
  if ((card.detailDecision === '立项候选' || card.quickDecision === '要') && !card.project.nextAction) missing.push('缺下一步动作');
  if (card.project.stage === '待验证' && !card.project.validationPlan) missing.push('缺验证计划');
  if (!card.project.owner) missing.push('缺负责人');
  return missing;
}

function renderProjectSubViews(cards) {
  if (!els.projectSubviews) return false;
  if (!['project', 'pipeline', 'validate'].includes(state.activeQuickView)) {
    els.projectSubviews.classList.add('hidden');
    els.projectSubviews.innerHTML = '';
    return false;
  }
  const actionable = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage));
  const items = [
    { id: 'all', label: '全部执行项', count: actionable.length, hint: '回到完整执行队列' },
    { id: 'missingAction', label: '缺动作', count: actionable.filter(card => !card.project.nextAction).length, hint: '先补下一步动作' },
    { id: 'missingValidation', label: '缺验证', count: actionable.filter(card => card.project.stage === '待验证' && !card.project.validationPlan).length, hint: '先补验证计划' },
    { id: 'readyPrototype', label: '可进原型', count: actionable.filter(card => card.project.stage === '待验证' && card.project.nextAction && card.project.validationPlan).length, hint: '优先推进到原型' },
    { id: 'p0', label: 'P0', count: actionable.filter(card => card.project.priority === 'P0').length, hint: '最优先项目' },
  ];
  const active = items.find(item => item.id === state.executionSubview) || items[0];
  const compactList = isMobileLayout() ? items.slice(0, 3) : items;
  els.projectSubviews.classList.remove('hidden');
  els.projectSubviews.innerHTML = `
    <div class="subview-summary compact-subview-summary">
      <strong>执行筛选</strong>
      <span class="muted small">当前查看：${active.label}</span>
    </div>
    <div class="subview-actions">
      ${compactList.map(item => `
        <button class="filter-chip execution-subview ${state.executionSubview === item.id ? 'active' : ''}" data-execution-subview="${item.id}">
          ${item.label}<span class="count">${item.count}</span>
        </button>
      `).join('')}
      ${isMobileLayout() ? '<button class="button ghost small-button" data-toggle-subviews="more">更多</button>' : ''}
    </div>
    ${isMobileLayout() ? `<div class="subview-more hidden" id="subview-more-list">${items.slice(3).map(item => `
      <button class="filter-chip execution-subview ${state.executionSubview === item.id ? 'active' : ''}" data-execution-subview="${item.id}">
        ${item.label}<span class="count">${item.count}</span>
      </button>
    `).join('')}</div>` : `<span class="muted small subview-hint">${active.hint}</span>`}
  `;
  return true;
}

function renderProjectTodoStrip(cards) {
  if (!els.projectTodoStrip) return false;
  const inPool = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage));
  const missingOwner = inPool.filter(card => !card.project.owner).length;
  const missingAction = inPool.filter(card => !card.project.nextAction).length;
  const missingValidation = inPool.filter(card => card.project.stage === '待验证' && !card.project.validationPlan).length;
  const readyPrototype = inPool.filter(card => card.project.stage === '待验证' && card.project.nextAction && card.project.validationPlan).length;
  if (!inPool.length) {
    els.projectTodoStrip.classList.add('hidden');
    els.projectTodoStrip.innerHTML = '';
    return false;
  }
  els.projectTodoStrip.classList.remove('hidden');
  els.projectTodoStrip.innerHTML = `
    <div class="todo-strip-main compact-todo-main">
      <strong>执行缺口</strong>
      <span class="muted small">只保留推进所需的关键缺口，方便你直接补齐。</span>
    </div>
    <div class="todo-strip-metrics">
      <button class="todo-chip" data-todo-jump="project">立项池 ${inPool.length}</button>
      <button class="todo-chip ${missingOwner ? 'warn' : ''}" data-todo-jump="missingOwner">负责人 ${missingOwner}</button>
      <button class="todo-chip ${missingAction ? 'warn' : ''}" data-todo-jump="missingAction">下一步 ${missingAction}</button>
      <button class="todo-chip ${missingValidation ? 'warn' : ''}" data-todo-jump="missingValidation">验证 ${missingValidation}</button>
      <button class="todo-chip ${readyPrototype ? 'good' : ''}" data-todo-jump="readyPrototype">原型 ${readyPrototype}</button>
    </div>
  `;
  return true;
}

function renderExpandedSection(card) {
  const missing = deriveProjectMissingInfo(card);
  return `
    <div class="card-expanded ${isExpanded(card.id) ? '' : 'hidden'}">
      <div class="card-body">
        <p><strong>这题在做什么：</strong>${card.opportunity_summary}</p>
        <p><strong>怎么赚钱更顺：</strong>${card.monetization_hint}</p>
        <p><strong>现在要注意：</strong>${card.risk_summary}</p>
      </div>
      ${missing.length ? `<div class="summary-line">${missing.map(item => `<span class="tag warn-tag">${item}</span>`).join('')}</div>` : ''}
      ${card.manualNote ? `<div class="summary-line"><span class="tag">备注</span><span class="muted small">${card.manualNote}</span></div>` : ''}
    </div>
  `;
}

function renderList(cards) {
  if (!cards.length) {
    els.ideaList.innerHTML = '<div class="empty-state">当前没有符合条件的选题。你可以换个筛选条件，或者先点“查看全部”。</div>';
    return;
  }
  els.ideaList.innerHTML = cards.map(card => `
    <article class="idea-card ${card.id === state.selectedId ? 'active' : ''}" data-id="${card.id}" data-grade="${card.recommendation_grade}">
      <div class="card-topline">
        <div class="card-topline-left">
          <span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.grade_short_label}</span>
          ${quickBadge(card.quickDecision)}
          ${card.detailDecision !== '未处理' ? decisionBadge(card.detailDecision) : ''}
        </div>
        <div class="card-topline-right">
          <span class="card-score-text">总分 ${card.scores.total}</span>
          <span class="card-score-text">优先级 ${card.priority_score}</span>
        </div>
      </div>

      <div class="card-main-row">
        <div class="card-main-copy">
          <h3>${card.one_liner}</h3>
          <p class="card-reason">${renderCompactReason(card)}</p>
          <div class="card-meta-row">
            <strong class="card-user">${card.user.primary}</strong>
            <span class="tag emphasis">${card.logic_relation}</span>
            <span class="tag">${card.topic_type_primary}</span>
            ${deriveProjectMissingInfo(card).slice(0, 2).map(item => `<span class="tag warn-tag">${item}</span>`).join('')}
          </div>
        </div>
        <label class="bulk-pick ${state.selectedCards.has(card.id) ? 'active' : ''}" title="选中后可做批量操作">
          <input type="checkbox" data-action="select-card" data-id="${card.id}" ${state.selectedCards.has(card.id) ? 'checked' : ''} />
          <span>${state.selectedCards.has(card.id) ? '已选中' : '选中此题'}</span>
        </label>
      </div>

      <div class="card-actions-row">
        <div class="card-actions card-actions-primary">
          ${renderQuickActionButtons(card)}
        </div>
        <div class="card-actions card-actions-secondary">
          <button class="quick-action favorite-toggle ${card.detailDecision === '收藏' ? 'active review' : ''}" data-action="favorite" data-id="${card.id}">收藏</button>
          <button class="quick-action" data-action="open" data-id="${card.id}">查看详情</button>
          <button class="button ghost small-button" data-action="toggle-expand" data-id="${card.id}">${isExpanded(card.id) ? '收起补充信息' : '展开补充信息'}</button>
        </div>
      </div>
      ${renderExpandedSection(card)}
    </article>
  `).join('');
}

function renderTable(cards) {
  if (!cards.length) {
    els.ideaTableBody.innerHTML = '<tr><td colspan="11" class="muted">当前没有符合条件的题目</td></tr>';
    return;
  }
  els.ideaTableBody.innerHTML = cards.map(card => `
    <tr class="${card.id === state.selectedId ? 'active' : ''}" data-id="${card.id}">
      <td><input type="checkbox" data-action="select-card" data-id="${card.id}" ${state.selectedCards.has(card.id) ? 'checked' : ''} /></td>
      <td>
        <strong>${card.one_liner}</strong>
        <div class="muted small">${card.grade_short_label}</div>
      </td>
      <td>${card.logic_relation}<br/><span class="muted small">${card.logic_action}</span></td>
      <td>${card.topic_type_primary}<br/><span class="muted small">${card.topic_type_secondary}</span></td>
      <td>${card.scores.total}</td>
      <td>${card.priority_score}</td>
      <td><span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.grade_short_label}</span></td>
      <td>${card.payment.price}</td>
      <td>${card.product_shape}</td>
      <td>${card.ai.level}</td>
      <td>${card.quickDecision}</td>
    </tr>
  `).join('');
  if (els.selectAllTable) {
    const visibleCount = cards.length;
    const selectedVisible = cards.filter(card => state.selectedCards.has(card.id)).length;
    els.selectAllTable.checked = visibleCount > 0 && visibleCount === selectedVisible;
    els.selectAllTable.indeterminate = selectedVisible > 0 && selectedVisible < visibleCount;
  }
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
  moveSelectionAfterDecision(cardId);
  applyFilters();
}

function updateDecisionBatch(cardIds, patch) {
  cardIds.forEach(cardId => {
    const previous = state.decisionMap[cardId] || { quickDecision: '未处理', detailDecision: '未处理', note: '' };
    const next = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.quickDecision && !patch.detailDecision) next.detailDecision = QUICK_DECISION_TO_DETAIL[patch.quickDecision] || previous.detailDecision;
    if (patch.detailDecision && !patch.quickDecision) next.quickDecision = DETAIL_TO_QUICK[patch.detailDecision] || previous.quickDecision;
    state.decisionMap[cardId] = next;
  });
  persistDecisionMap();
  state.cards = enrichCards(state.raw.cards);
  applyFilters();
}

function renderDecisionReasons(card) {
  return `
    <div class="detail-grid-three">
      <div class="mini-panel mini-panel-strong">
        <span class="muted small">值得做的核心原因</span>
        <strong>${card.worth_doing_reason}</strong>
      </div>
      <div class="mini-panel">
        <span class="muted small">暂时别重投入的原因</span>
        <strong>${card.hold_reason}</strong>
      </div>
      <div class="mini-panel mini-panel-warn">
        <span class="muted small">最适合的验证方式</span>
        <strong>${card.validation_method}</strong>
      </div>
    </div>
  `;
}

function renderDetail(card) {
  if (!card) {
    els.detailContent.innerHTML = '<p class="muted">没有符合条件的选题。</p>';
    return;
  }
  const stageOptions = PROJECT_STAGES.map(item => `<option value="${item}" ${card.project.stage === item ? 'selected' : ''}>${item}</option>`).join('');
  const priorityOptions = PROJECT_PRIORITIES.map(item => `<option value="${item}" ${card.project.priority === item ? 'selected' : ''}>${item}</option>`).join('');
  els.detailContent.innerHTML = `
    <section class="detail-block detail-hero-block">
      <div class="score-row">
        <span class="grade-pill ${gradeClass(card.recommendation_grade)}">${card.grade_label}</span>
        ${quickBadge(card.quickDecision)}
        ${decisionBadge(card.detailDecision)}
      </div>
      <h2>${card.one_liner}</h2>
      <p class="muted">${card.id} · 模板 ${card.template_id}</p>
      <div class="decision-callout ${card.recommendation_grade === 'S' ? 'good' : card.recommendation_grade === 'A' ? 'focus' : 'neutral'}">
        <strong>系统判断：${card.recommendation_grade === 'S' ? '值得优先立项' : card.recommendation_grade === 'A' ? '值得优先验证' : card.recommendation_grade === 'B' ? '建议继续观察' : '当前不建议投入'}</strong>
        <p>${card.grade_action_hint}。主要因为 ${card.main_reason}</p>
        <p class="muted small">总分 ${card.scores.total} · 优先级 ${card.priority_score} · ${card.logic_relation} · ${card.topic_type_primary}</p>
      </div>
      ${renderDecisionReasons(card)}
    </section>

    <section class="detail-block">
      <h3>结论先看</h3>
      <div class="detail-conclusion">
        <strong>${card.worth_doing_reason}</strong>
        <p>当前建议：${card.project_readiness}。下一步优先做：${card.next_action}</p>
      </div>
      <p><strong>这题值得看，是因为：</strong>${card.worth_doing_reason}</p>
      <p><strong>现在不要直接重投入，是因为：</strong>${card.hold_reason}</p>
      <p><strong>最合适的验证方式：</strong>${card.validation_method}</p>
    </section>

    <section class="detail-block">
      <h3>用户与商业</h3>
      <div class="kv-grid">
        <div class="kv-item"><span>核心用户</span><strong>${card.user.primary}</strong></div>
        <div class="kv-item"><span>次级用户</span><strong>${card.user.secondary}</strong></div>
        <div class="kv-item"><span>谁买单</span><strong>${card.payment.who}</strong></div>
        <div class="kv-item"><span>价格带</span><strong>${card.payment.price}</strong></div>
      </div>
      <p><strong>为什么愿意付费：</strong>${card.payment.why}</p>
      <p><strong>更适合怎么收费：</strong>${card.monetization_hint}</p>
      <p class="muted">免费版：${card.payment.free_tier}<br/>付费版：${card.payment.vip_tier}</p>
    </section>

    <section class="detail-block">
      <h3>产品切入建议</h3>
      <div class="detail-conclusion subtle">
        <strong>${card.product_shape}</strong>
        <p>${card.product_shape_reason}</p>
      </div>
      <div class="kv-grid">
        <div class="kv-item"><span>推荐形态</span><strong>${card.product_shape}</strong></div>
        <div class="kv-item"><span>页面类型</span><strong>${card.action.page_type || '结果页'}</strong></div>
      </div>
      <p><strong>最小可行版本：</strong>${card.mvp_entry_suggestion}</p>
      <p><strong>马上可做的动作：</strong>${card.next_action}</p>
    </section>

    <section class="detail-block">
      <h3>立项推进区</h3>
      <div class="kv-grid">
        <div class="kv-item"><span>当前阶段</span><strong>${card.project.stage}</strong></div>
        <div class="kv-item"><span>优先级</span><strong>${card.project.priority}</strong></div>
        <div class="kv-item"><span>负责人</span><strong>${card.project.owner || '我自己'}</strong></div>
        <div class="kv-item"><span>建议状态</span><strong>${card.project_readiness}</strong></div>
      </div>
      <label>
        <span>推进阶段</span>
        <select id="project-stage">${stageOptions}</select>
      </label>
      <label>
        <span>优先级</span>
        <select id="project-priority">${priorityOptions}</select>
      </label>
      <label>
        <span>负责人</span>
        <input id="project-owner" type="text" value="${card.project.owner || ''}" placeholder="例如：我自己" />
      </label>
      <label>
        <span>下一步动作</span>
        <input id="project-next-action" type="text" value="${card.project.nextAction || card.next_action || ''}" placeholder="例如：写出 MVP 页面流程" />
      </label>
      <label>
        <span>核心假设</span>
        <textarea id="project-hypothesis" rows="3" placeholder="这题成立，最关键依赖什么假设">${card.project.hypothesis || ''}</textarea>
      </label>
      <label>
        <span>验证计划</span>
        <textarea id="project-validation-plan" rows="3" placeholder="准备怎么验证它">${card.project.validationPlan || card.validation_method || ''}</textarea>
      </label>
      <label>
        <span>目标日期</span>
        <input id="project-due-date" type="text" value="${card.project.dueDate || ''}" placeholder="例如：本周内" />
      </label>
      <label>
        <span>推进备注</span>
        <textarea id="project-note" rows="3" placeholder="记录推进中的判断">${card.project.projectNote || ''}</textarea>
      </label>
      <div class="inline-actions">
        <button id="save-project-state" class="button primary">保存推进信息</button>
        <button id="project-to-pool" class="button secondary">加入立项池并设为待验证</button>
        <button id="project-next-stage" class="button ghost">推进到下一阶段</button>
      </div>
    </section>

    <section class="detail-block">
      <h3>你的判断与备注</h3>
      <label>
        <span>第一步：快速判断</span>
        <select id="detail-quick-decision">
          ${['未处理', '要', '再看', '不要'].map(item => `<option value="${item}" ${card.quickDecision === item ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>第二步：归类标签</span>
        <select id="detail-decision">
          ${['未处理', '收藏', '待观察', '立项候选', '淘汰复核'].map(item => `<option value="${item}" ${card.detailDecision === item ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>备注</span>
        <textarea id="detail-note" rows="4" placeholder="写下你为什么看好，或为什么暂时不做">${card.manualNote || ''}</textarea>
      </label>
      <div class="inline-actions">
        <button id="save-decision" class="button primary">保存当前判断</button>
        <button id="mark-project" class="button secondary">标记为立项候选</button>
      </div>
    </section>

    <section class="detail-block">
      <h3>替代方案与风险</h3>
      <div class="detail-conclusion subtle danger-tone">
        <strong>真正的风险不在功能，而在用户是否愿意稳定采用</strong>
        <p>${card.risk_summary}</p>
      </div>
      <p><strong>用户现在怎么解决：</strong>${card.competition.existing}</p>
      <p><strong>你能做出的差异：</strong>${card.competition.gap}</p>
      <p><strong>真正难的地方：</strong>${card.competition.moat}</p>
      <ul class="bullet-list">${(card.risks || []).map(item => `<li>${item}</li>`).join('')}</ul>
      ${card.rejection_reasons?.length ? `<p class="danger-text"><strong>淘汰原因：</strong>${card.rejection_reasons.join(' / ')}</p>` : ''}
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

  document.getElementById('save-project-state')?.addEventListener('click', () => {
    updateProjectState(card.id, {
      stage: document.getElementById('project-stage').value,
      priority: document.getElementById('project-priority').value,
      owner: document.getElementById('project-owner').value.trim() || '我自己',
      nextAction: document.getElementById('project-next-action').value.trim(),
      hypothesis: document.getElementById('project-hypothesis').value.trim(),
      validationPlan: document.getElementById('project-validation-plan').value.trim(),
      dueDate: document.getElementById('project-due-date').value.trim(),
      projectNote: document.getElementById('project-note').value.trim(),
    });
  });

  document.getElementById('project-to-pool')?.addEventListener('click', () => {
    updateDecision(card.id, {
      quickDecision: '要',
      detailDecision: '立项候选',
      note: document.getElementById('detail-note').value.trim(),
    });
    updateProjectState(card.id, {
      stage: '待验证',
      priority: document.getElementById('project-priority').value,
      owner: document.getElementById('project-owner').value.trim() || '我自己',
      nextAction: document.getElementById('project-next-action').value.trim() || card.next_action,
      hypothesis: document.getElementById('project-hypothesis').value.trim(),
      validationPlan: document.getElementById('project-validation-plan').value.trim() || card.validation_method,
      dueDate: document.getElementById('project-due-date').value.trim(),
      projectNote: document.getElementById('project-note').value.trim(),
    });
  });

  document.getElementById('project-next-stage')?.addEventListener('click', () => {
    const currentIndex = PROJECT_STAGES.indexOf(card.project.stage);
    const nextStage = PROJECT_STAGES[Math.min(currentIndex + 1, PROJECT_STAGES.length - 1)] || card.project.stage;
    updateProjectState(card.id, {
      stage: nextStage,
      priority: document.getElementById('project-priority').value,
      owner: document.getElementById('project-owner').value.trim() || '我自己',
      nextAction: document.getElementById('project-next-action').value.trim() || card.next_action,
      hypothesis: document.getElementById('project-hypothesis').value.trim(),
      validationPlan: document.getElementById('project-validation-plan').value.trim() || card.validation_method,
      dueDate: document.getElementById('project-due-date').value.trim(),
      projectNote: document.getElementById('project-note').value.trim(),
    });
  });
}

function toggleCardExpansion(cardId) {
  if (state.expandedCards.has(cardId)) state.expandedCards.delete(cardId);
  else state.expandedCards.add(cardId);
  renderList(state.filtered);
  bindInteractiveNodes();
}

function toggleCardSelection(cardId, checked) {
  if (checked) state.selectedCards.add(cardId);
  else state.selectedCards.delete(cardId);
  renderSelectionState();
  renderList(state.filtered);
  renderTable(state.filtered);
  bindInteractiveNodes();
}

function syncSelectionWithVisibleCards() {
  const visibleIds = new Set(state.filtered.map(card => card.id));
  state.selectedCards = new Set([...state.selectedCards].filter(id => visibleIds.has(id)));
}

function isMobileLayout() {
  return window.innerWidth <= 768;
}

function syncMobileDetailState() {
  if (!els.detailPanel || !els.mobileDetailToggle) return;
  const mobile = isMobileLayout();
  const open = mobile ? state.mobileDetailOpen : true;
  els.detailPanel.classList.toggle('mobile-collapsed', mobile && !state.mobileDetailOpen);
  els.detailPanel.classList.toggle('mobile-sheet-open', mobile && state.mobileDetailOpen);
  els.mobileDetailBackdrop?.classList.toggle('visible', mobile && state.mobileDetailOpen);
  els.mobileDetailToggle.textContent = open ? '收起分析面板' : '展开分析面板';
  els.mobileDetailToggle.setAttribute('aria-expanded', String(open));
}

function setMobileDetailOpen(open) {
  state.mobileDetailOpen = Boolean(open);
  syncMobileDetailState();
}

function setPendingActionFocus(action) {
  state.pendingActionFocus = action || 'none';
}

function syncBatchActionFocus() {
  const map = {
    fillOwner: els.batchFillOwner,
    fillNextAction: els.batchFillNextAction,
    fillValidation: els.batchFillValidation,
    stagePrototype: els.batchStagePrototype,
    stageValidate: els.batchStageValidate,
    project: els.batchProject,
  };
  Object.values(map).forEach(btn => btn?.classList.remove('attention'));
  const target = map[state.pendingActionFocus];
  target?.classList.add('attention');
}

function syncMobileTableTip() {
  if (!els.mobileTableTip) return;
  const shouldShow = isMobileLayout() && state.viewMode === 'table';
  els.mobileTableTip.classList.toggle('hidden', !shouldShow);
}

function syncSelectionMoreState() {
  if (!els.selectionMore) return;
  const count = state.selectedCards.size;
  if (!count) els.selectionMore.open = false;
  if (!isMobileLayout() && count) els.selectionMore.open = true;
  if (isMobileLayout() && count <= 2) els.selectionMore.open = false;
}

function setViewForCurrentLayout(viewMode) {
  state.viewMode = viewMode;
  els.viewCards.classList.toggle('active', viewMode === 'cards');
  els.viewTable.classList.toggle('active', viewMode === 'table');
  els.cardsView.classList.toggle('hidden', viewMode !== 'cards');
  els.tableView.classList.toggle('hidden', viewMode !== 'table');
  syncMobileTableTip();
}

function renderProjectGuidance(cards) {
  if (!els.projectGuidance) return;
  const relevant = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage));
  if (!relevant.length) {
    els.projectGuidance.classList.add('hidden');
    els.projectGuidance.innerHTML = '';
    els.workspaceSecondaryTools && (els.workspaceSecondaryTools.open = false);
    return;
  }
  const suggestion = buildSuggestedQueue(relevant);
  const actionLabelMap = {
    fillNextAction: '先补动作',
    fillValidation: '先补验证',
    stagePrototype: '先推进原型',
    project: '继续补立项',
  };
  const todoCount = relevant.filter(card => !card.project.nextAction || (card.project.stage === '待验证' && !card.project.validationPlan)).length;
  const summaryLabel = actionLabelMap[suggestion.type] || '继续推进';
  els.projectGuidance.classList.remove('hidden');
  els.projectGuidance.innerHTML = `
    <div class="guidance-copy">
      <strong>现在最建议：${summaryLabel}</strong>
      <span class="muted small">${suggestion.hint}｜当前执行队列 ${relevant.length} 项，待补关键动作 ${todoCount} 项。</span>
    </div>
    <div class="guidance-actions">
      <button class="button ghost small-button" data-guidance-apply="${suggestion.type}">处理推荐题组</button>
      <button class="button ghost small-button" data-guidance-toggle="tools">${els.workspaceSecondaryTools?.open ? '收起辅助区' : '展开执行辅助'}</button>
    </div>
  `;
}

function syncWorkspaceSecondaryTools() {
  if (!els.workspaceSecondaryTools) return;
  const visibleChildren = [els.projectTodoStrip, els.projectSubviews, els.suggestedQueue].filter(node => node && !node.classList.contains('hidden'));
  const hasContent = visibleChildren.length > 0;
  els.workspaceSecondaryTools.classList.toggle('hidden', !hasContent);
  if (!hasContent) {
    els.workspaceSecondaryTools.open = false;
    return;
  }
  if (isMobileLayout()) {
    els.workspaceSecondaryTools.open = false;
    return;
  }
  if (!['project', 'pipeline', 'validate'].includes(state.activeQuickView)) {
    els.workspaceSecondaryTools.open = false;
  }
}

function renderSelectionState() {
  syncBatchActionFocus();
  const count = state.selectedCards.size;
  const selectedCards = state.cards.filter(card => state.selectedCards.has(card.id));
  const selectedStages = uniq(selectedCards.map(card => card.project.stage));
  const missingOwner = selectedCards.filter(card => !card.project.owner).length;
  const missingAction = selectedCards.filter(card => !card.project.nextAction).length;
  const missingValidation = selectedCards.filter(card => card.project.stage === '待验证' && !card.project.validationPlan).length;
  els.selectionCount.textContent = `已选 ${count} 项`;
  const autoHideText = state.focusMode && state.hideProcessedInFocus ? '连续处理已开启：做过判断的题会自动从当前列表隐藏。' : '';
  if (count) {
    const stageText = selectedStages.length === 1 ? `当前都在“${selectedStages[0]}”` : `包含 ${selectedStages.length} 种推进状态`;
    const gapSummary = [missingOwner ? `缺负责人 ${missingOwner}` : '', missingAction ? `缺动作 ${missingAction}` : '', missingValidation ? `缺验证 ${missingValidation}` : ''].filter(Boolean);
    const compact = isMobileLayout() && count <= 2;
    const mobileHint = compact ? '复杂操作已收进下方折叠区。' : (isMobileLayout() ? '先用上方四个高频动作，其他推进操作再展开。' : '你可以直接在下方继续批量推进。');
    els.selectionHint.textContent = isMobileLayout()
      ? `已选 ${count} 项；${gapSummary.length ? gapSummary.join('，') : stageText}。${mobileHint}`
      : `已选中的题目可以一起改判断结果或推进阶段，${stageText}${gapSummary.length ? `；${gapSummary.join('，')}` : ''}。${mobileHint}`;
  } else {
    els.selectionHint.textContent = autoHideText || '先在卡片或表格里选中题目，再做批量操作。';
  }
  [els.batchWant, els.batchReview, els.batchReject, els.batchProject, els.batchStageValidate, els.batchStagePrototype, els.batchStageBuild, els.batchPriorityP0, els.batchFillOwner, els.batchFillNextAction, els.batchFillValidation, els.clearSelection].forEach(btn => {
    if (!btn) return;
    btn.disabled = count === 0;
  });
  syncSelectionMoreState();
}

function clearSelection() {
  state.selectedCards.clear();
  setPendingActionFocus('none');
  renderSelectionState();
  renderList(state.filtered);
  renderTable(state.filtered);
  bindInteractiveNodes();
}

function renderActionInsights(allCards, currentCards) {
  const pendingHigh = currentCards.filter(card => ['S', 'A'].includes(card.recommendation_grade) && card.quickDecision === '未处理');
  const pendingAll = currentCards.filter(card => card.quickDecision === '未处理');
  const rejectRate = currentCards.length ? Math.round((currentCards.filter(card => card.quickDecision === '不要' || card.status === 'rejected').length / currentCards.length) * 100) : 0;
  const topShape = Object.entries(countBy(currentCards, card => card.product_shape))[0]?.[0] || '工具型';
  const pipelineCount = currentCards.filter(card => ['待验证', '准备原型', '准备开发', '已上线'].includes(card.project.stage)).length;
  const overdueValidation = currentCards.filter(card => card.project.stage === '待验证' && (!card.project.nextAction || !card.project.validationPlan)).length;
  const insights = [
    {
      title: '下一步最值得处理',
      body: pendingHigh.length
        ? `先处理当前筛选结果里还未判断的 ${pendingHigh.length} 个 S/A 级题目，优先把高价值题快速收敛到“要 / 再看 / 不要”。`
        : '当前高价值题已经基本处理完，可以切到“低竞争”或“强付费”视角做第二轮收敛。',
    },
    {
      title: '这一批是否值得继续看',
      body: currentCards.filter(card => ['S', 'A'].includes(card.recommendation_grade)).length >= 8
        ? '值得继续看：当前筛选结果中高价值题数量充足，适合继续做立项判断。'
        : '建议收窄策略：当前高价值题不多，可以切到系统推荐路径或提高最低分。',
    },
    {
      title: '你的筛选状态',
      body: pendingAll.length > Math.max(12, Math.round(currentCards.length * 0.5))
        ? `还没判断的题较多（${pendingAll.length} 个），建议先批量过一轮“再看 / 不要”，让列表更干净。`
        : `当前筛选已较聚焦，淘汰率约 ${rejectRate}% ，当前更适合进入细看与立项比较。`,
    },
    {
      title: '产品形态趋势',
      body: `当前结果里“${topShape}”占比最高，说明这一批题更适合从 ${topShape} 的 MVP 方式切入。`,
    },
    {
      title: '推进状态提醒',
      body: pipelineCount ? `当前筛选结果里已有 ${pipelineCount} 个题进入推进视角，建议优先补齐验证动作和负责人。` : '当前结果还没有真正进入推进流程的题，建议先把“要”的题放入待验证。',
    },
    {
      title: '待办提醒',
      body: overdueValidation ? `有 ${overdueValidation} 个待验证题还没写清下一步动作或验证计划，建议优先补齐。` : '待验证题的动作定义相对完整，可以继续推进到原型阶段。',
    },
  ];
  els.actionInsights.innerHTML = insights.map(item => `
    <div class="insight-card">
      <span class="insight-label">${item.title}</span>
      <p>${item.body}</p>
    </div>
  `).join('');
}


function renderInlineAiTip(currentCards) {
  const pendingHigh = currentCards.filter(card => ['S', 'A'].includes(card.recommendation_grade) && card.quickDecision === '未处理');
  const pendingAll = currentCards.filter(card => card.quickDecision === '未处理');
  if (state.focusMode && state.hideProcessedInFocus) {
    els.inlineAiTip.textContent = isMobileLayout() ? '连续处理已开启：做完即自动隐藏。' : `连续处理已开启：当前列表只保留未处理题，做完判断会自动收起。`;
    return;
  }
  if (pendingHigh.length) {
    els.inlineAiTip.textContent = isMobileLayout() ? `先看 ${pendingHigh.length} 个高价值未判断题。` : `建议先看：${pendingHigh.length} 个还没判断的 S/A 级题。`;
    return;
  }
  if (pendingAll.length) {
    els.inlineAiTip.textContent = isMobileLayout() ? `还有 ${pendingAll.length} 个未判断，建议先快速过一轮。` : `还有 ${pendingAll.length} 个题没判断，建议先批量过一轮“再看 / 不要”。`;
    return;
  }
  els.inlineAiTip.textContent = isMobileLayout() ? '当前范围已经比较聚焦，可以开始细看。' : '当前范围已经收得比较准，可以开始细看和比较了。';
}

function renderProjectExecutionBar(cards) {
  if (!els.inlineAiTip) return;
  if (!['project', 'pipeline', 'validate'].includes(state.activeQuickView)) return;
  const actionable = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage));
  if (!actionable.length) return;
  const missingAction = actionable.filter(card => !card.project.nextAction).length;
  const missingValidation = actionable.filter(card => card.project.stage === '待验证' && !card.project.validationPlan).length;
  const readyPrototype = actionable.filter(card => card.project.stage === '待验证' && card.project.nextAction && card.project.validationPlan).length;
  const top = actionable.slice().sort((a, b) => executionWeight(b) - executionWeight(a))[0];
  els.inlineAiTip.textContent = isMobileLayout()
    ? `执行队列 ${actionable.length}｜缺动作 ${missingAction}｜缺验证 ${missingValidation}`
    : `当前执行队列：${actionable.length} 项｜缺动作 ${missingAction}｜缺验证 ${missingValidation}｜可进原型 ${readyPrototype}${top ? `｜最该先动：${top.one_liner}` : ''}`;
}

function deriveProjectClusterKey(card) {
  return [card.topic_type_primary, card.topic_type_secondary, card.logic_relation].filter(Boolean).join('｜');
}

function buildProjectClusters(cards) {
  const poolCards = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发', '已上线'].includes(card.project.stage));
  const map = new Map();
  poolCards.forEach(card => {
    const key = deriveProjectClusterKey(card);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: `${card.topic_type_primary} · ${card.topic_type_secondary}`,
        logic: card.logic_relation,
        count: 0,
        validate: 0,
        prototype: 0,
        build: 0,
        launched: 0,
        topCard: card,
      });
    }
    const cluster = map.get(key);
    cluster.count += 1;
    if (card.project.stage === '待验证') cluster.validate += 1;
    if (card.project.stage === '准备原型') cluster.prototype += 1;
    if (card.project.stage === '准备开发') cluster.build += 1;
    if (card.project.stage === '已上线') cluster.launched += 1;
    if ((card.priority_score || 0) > (cluster.topCard?.priority_score || 0)) cluster.topCard = card;
  });
  return [...map.values()].sort((a, b) => b.count - a.count || (b.topCard?.priority_score || 0) - (a.topCard?.priority_score || 0)).slice(0, 6);
}

function renderProjectPipeline(cards) {
  const inPool = cards.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要');
  const stageCounts = Object.fromEntries(PROJECT_STAGES.map(stage => [stage, inPool.filter(card => card.project.stage === stage).length]));
  const recurring = Object.entries(countBy(cards, card => card.topic_type_primary)).slice(0, 5);
  const topPool = inPool.slice().sort((a, b) => b.priority_score - a.priority_score).slice(0, 5);
  const clusters = buildProjectClusters(cards);
  els.projectPipeline.innerHTML = `
    <div class="insight-card">
      <span class="insight-label">立项推进看板</span>
      <p>${PROJECT_STAGES.map(stage => `${stage} ${stageCounts[stage] || 0} 项`).join(' · ')}</p>
    </div>
    <div class="insight-card">
      <span class="insight-label">高频方向</span>
      <p>${recurring.length ? recurring.map(([label, count]) => `${label} ${count} 次`).join(' · ') : '暂无明显重复方向'}</p>
    </div>
    <div class="insight-card">
      <span class="insight-label">当前最值得推进</span>
      <p>${topPool.length ? topPool.map(card => card.one_liner).slice(0, 2).join('；') : '还没有进入立项池的题目'}</p>
    </div>
    <div class="project-cluster-panel">
      <div class="project-cluster-header">
        <span class="insight-label">反复出现的立项方向</span>
        <span class="muted small">帮助你识别哪些方向不止出现一次</span>
      </div>
      ${clusters.length ? clusters.map(cluster => `
        <div class="project-cluster-item">
          <div class="project-cluster-main">
            <strong>${cluster.label}</strong>
            <span class="tag emphasis">${cluster.logic}</span>
            <span class="score-pill neutral">${cluster.count} 次进入推进视角</span>
          </div>
          <div class="project-cluster-meta">
            <span>待验证 ${cluster.validate}</span>
            <span>原型 ${cluster.prototype}</span>
            <span>开发 ${cluster.build}</span>
            <span>上线 ${cluster.launched}</span>
          </div>
          <p class="muted small">当前代表题：${cluster.topCard?.one_liner || '暂无'}</p>
        </div>
      `).join('') : '<div class="empty-state">当前还没有形成重复进入推进流程的方向。</div>'}
    </div>
  `;
}

function moveSelectionAfterDecision(cardId) {
  if (!state.focusMode) return;
  const visibleIds = state.filtered.map(card => card.id);
  const index = visibleIds.indexOf(cardId);
  if (index === -1) return;
  const nextId = visibleIds[index + 1] || visibleIds[index - 1] || null;
  state.selectedId = nextId;
}

function handleKeyboardNavigation(event) {
  const activeTag = document.activeElement?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
  if (!state.filtered.length) return;
  const currentIndex = state.filtered.findIndex(card => card.id === state.selectedId);
  if (event.key === 'j' || event.key === 'J') {
    event.preventDefault();
    state.selectedId = state.filtered[Math.min(currentIndex + 1, state.filtered.length - 1)]?.id || state.selectedId;
    renderList(state.filtered);
    renderTable(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
    return;
  }
  if (event.key === 'k' || event.key === 'K') {
    event.preventDefault();
    state.selectedId = state.filtered[Math.max(currentIndex - 1, 0)]?.id || state.selectedId;
    renderList(state.filtered);
    renderTable(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
    return;
  }
  const quick = KEYBOARD_DECISION_MAP[event.key?.toLowerCase()];
  if (quick && state.selectedId) {
    event.preventDefault();
    updateDecision(state.selectedId, { quickDecision: quick });
  }
}

function setMainTab(tab) {
  state.mainTab = tab;
  els.tabIdeas.classList.toggle('active', tab === 'ideas');
  els.tabOverview.classList.toggle('active', tab === 'overview');
  els.ideasTab.classList.toggle('hidden', tab !== 'ideas');
  els.overviewTab.classList.toggle('hidden', tab !== 'overview');
}

function bindInteractiveNodes() {
  document.querySelectorAll('.idea-card').forEach(node => node.addEventListener('click', event => {
    if (event.target.closest('[data-action]') || event.target.closest('input[type="checkbox"]')) return;
    state.selectedId = node.dataset.id;
    if (isMobileLayout()) state.mobileDetailOpen = true;
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
    if (isMobileLayout()) state.mobileDetailOpen = true;
    renderList(state.filtered);
    renderTable(state.filtered);
    renderDetail(state.filtered.find(card => card.id === state.selectedId));
    bindInteractiveNodes();
  }));

  document.querySelectorAll('[data-action="toggle-expand"]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    toggleCardExpansion(node.dataset.id);
  }));

  document.querySelectorAll('[data-action="select-card"]').forEach(node => node.addEventListener('change', event => {
    event.stopPropagation();
    toggleCardSelection(node.dataset.id, node.checked);
  }));

  document.querySelectorAll('.idea-table tbody tr').forEach(node => node.addEventListener('click', event => {
    if (event.target.closest('input[type="checkbox"]')) return;
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
    resetExecutionSubviewIfNeeded();
    applyFilters();
  }));

  document.querySelectorAll('[data-execution-subview]').forEach(node => node.addEventListener('click', () => {
    state.executionSubview = node.dataset.executionSubview;
    if (state.executionSubview === 'missingAction') setPendingActionFocus('fillNextAction');
    else if (state.executionSubview === 'missingValidation') setPendingActionFocus('fillValidation');
    else if (state.executionSubview === 'readyPrototype') setPendingActionFocus('stagePrototype');
    else if (state.executionSubview === 'p0') setPendingActionFocus('none');
    else setPendingActionFocus('none');
    applyFilters();
  }));

  document.querySelectorAll('[data-toggle-subviews="more"]').forEach(node => node.addEventListener('click', () => {
    const more = document.getElementById('subview-more-list');
    more?.classList.toggle('hidden');
  }));

  document.querySelectorAll('[data-guidance-apply]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    const suggestion = buildSuggestedQueue(state.filtered.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage)));
    applySuggestedQueueSelection(suggestion);
    renderProjectGuidance(state.filtered);
    renderSuggestedQueue(state.filtered);
    renderList(state.filtered);
    renderTable(state.filtered);
    bindInteractiveNodes();
  }));

  document.querySelectorAll('[data-guidance-toggle="tools"]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    if (els.workspaceSecondaryTools) {
      els.workspaceSecondaryTools.open = !els.workspaceSecondaryTools.open;
      renderProjectGuidance(state.filtered);
    }
  }));

  document.querySelectorAll('[data-suggest-select]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    const id = node.dataset.suggestSelect;
    if (state.selectedCards.has(id)) state.selectedCards.delete(id);
    else state.selectedCards.add(id);
    renderSelectionState();
    renderSuggestedQueue(state.filtered);
    renderList(state.filtered);
    renderTable(state.filtered);
    bindInteractiveNodes();
  }));

  document.querySelectorAll('[data-suggest-apply]').forEach(node => node.addEventListener('click', event => {
    event.stopPropagation();
    const suggestion = buildSuggestedQueue(state.filtered.filter(card => card.detailDecision === '立项候选' || card.quickDecision === '要' || ['待验证', '准备原型', '准备开发'].includes(card.project.stage)));
    applySuggestedQueueSelection(suggestion);
    renderSuggestedQueue(state.filtered);
    renderList(state.filtered);
    renderTable(state.filtered);
    bindInteractiveNodes();
  }));

  document.querySelectorAll('[data-system-view]').forEach(node => node.addEventListener('click', () => {
    state.activeSystemView = state.activeSystemView === node.dataset.systemView ? 'none' : node.dataset.systemView;
    applyFilters();
  }));
  document.querySelectorAll('[data-todo-jump]').forEach(node => node.addEventListener('click', () => {
    const target = node.dataset.todoJump;
    setMainTab('ideas');
    if (target === 'project') {
      state.activeQuickView = 'project';
      state.executionSubview = 'all';
      setPendingActionFocus('project');
      applyFilters();
      return;
    }
    if (target === 'readyPrototype') {
      state.activeQuickView = 'validate';
      state.executionSubview = 'readyPrototype';
      setPendingActionFocus('stagePrototype');
      applyFilters();
      return;
    }
    if (target === 'missingOwner') {
      state.activeQuickView = 'project';
      state.executionSubview = 'all';
      setPendingActionFocus('fillOwner');
      applyFilters();
      return;
    }
    if (target === 'missingAction') {
      state.activeQuickView = 'project';
      state.executionSubview = 'missingAction';
      setPendingActionFocus('fillNextAction');
      applyFilters();
      return;
    }
    if (target === 'missingValidation') {
      state.activeQuickView = 'validate';
      state.executionSubview = 'missingValidation';
      setPendingActionFocus('fillValidation');
      applyFilters();
      return;
    }
  }));

  document.querySelectorAll('.metric[data-jump-view]').forEach(node => node.addEventListener('click', () => {
    const jump = node.dataset.jumpView;
    if (!jump) return;
    setMainTab('ideas');
    state.activeQuickView = jump;
    resetExecutionSubviewIfNeeded();
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
  if (isMobileLayout() && viewMode === 'table') {
    state.mobileDetailOpen = false;
  }
  setViewForCurrentLayout(viewMode);
}

function clearFilterState() {
  state.activeQuickView = 'all';
  state.activeSystemView = 'none';
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

function toggleExpandAll() {
  state.expandAll = !state.expandAll;
  if (!state.expandAll) state.expandedCards.clear();
  els.toggleAllExpanded.textContent = state.expandAll ? '恢复轻量模式' : '展开当前列表摘要';
  renderList(state.filtered);
  bindInteractiveNodes();
}

function toggleSelectAllVisible(checked) {
  if (checked) state.filtered.forEach(card => state.selectedCards.add(card.id));
  else state.filtered.forEach(card => state.selectedCards.delete(card.id));
  renderSelectionState();
  renderList(state.filtered);
  renderTable(state.filtered);
  bindInteractiveNodes();
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
els.toggleAllExpanded.addEventListener('click', toggleExpandAll);
els.tabIdeas.addEventListener('click', () => setMainTab('ideas'));
els.tabOverview.addEventListener('click', () => setMainTab('overview'));
els.focusMode?.addEventListener('click', () => {
  state.focusMode = !state.focusMode;
  if (!state.focusMode) state.hideProcessedInFocus = false;
  else if (!state.hideProcessedInFocus) state.hideProcessedInFocus = true;
  els.focusMode.classList.toggle('active', state.focusMode);
  els.focusMode.textContent = state.focusMode ? '连续处理' : '普通浏览';
  if (els.focusHideProcessed) {
    els.focusHideProcessed.checked = state.hideProcessedInFocus;
    els.focusHideProcessed.disabled = !state.focusMode;
  }
  applyFilters();
});
els.selectAllTable?.addEventListener('change', () => toggleSelectAllVisible(els.selectAllTable.checked));
els.focusHideProcessed?.addEventListener('change', () => {
  state.hideProcessedInFocus = Boolean(els.focusHideProcessed.checked);
  applyFilters();
});
els.mobileDetailToggle?.addEventListener('click', () => {
  setMobileDetailOpen(!state.mobileDetailOpen);
});
els.mobileDetailBackdrop?.addEventListener('click', () => {
  setMobileDetailOpen(false);
});
window.addEventListener('resize', () => {
  if (!isMobileLayout()) state.mobileDetailOpen = false;
  if (isMobileLayout() && state.viewMode === 'table' && state.mainTab === 'ideas') {
    setViewForCurrentLayout('cards');
  }
  syncSelectionMoreState();
  syncMobileDetailState();
  syncMobileTableTip();
});

document.querySelectorAll('.filter-toggle').forEach(button => button.addEventListener('click', () => {
  const target = document.getElementById(button.dataset.toggleGroup);
  target?.classList.toggle('hidden');
  button.parentElement?.classList.toggle('open', !target?.classList.contains('hidden'));
}));

els.batchWant.addEventListener('click', () => { setPendingActionFocus('none'); updateDecisionBatch([...state.selectedCards], { quickDecision: '要' }); });
els.batchReview.addEventListener('click', () => { setPendingActionFocus('none'); updateDecisionBatch([...state.selectedCards], { quickDecision: '再看' }); });
els.batchReject.addEventListener('click', () => { setPendingActionFocus('none'); updateDecisionBatch([...state.selectedCards], { quickDecision: '不要' }); });
els.batchProject.addEventListener('click', () => {
  const ids = [...state.selectedCards];
  updateDecisionBatch(ids, { quickDecision: '要', detailDecision: '立项候选' });
  updateProjectStateBatch(ids, { stage: '待验证' });
});
els.batchStageValidate?.addEventListener('click', () => { setPendingActionFocus('none'); updateProjectStateBatch([...state.selectedCards], { stage: '待验证' }); });
els.batchStagePrototype?.addEventListener('click', () => { setPendingActionFocus('none'); updateProjectStateBatch([...state.selectedCards], { stage: '准备原型' }); });
els.batchStageBuild?.addEventListener('click', () => { setPendingActionFocus('none'); updateProjectStateBatch([...state.selectedCards], { stage: '准备开发' }); });
els.batchPriorityP0?.addEventListener('click', () => { setPendingActionFocus('none'); updateProjectStateBatch([...state.selectedCards], { priority: 'P0' }); });
els.batchFillOwner?.addEventListener('click', () => { setPendingActionFocus('none'); batchFillOwner(); });
els.batchFillNextAction?.addEventListener('click', () => { setPendingActionFocus('none'); batchFillNextAction(); });
els.batchFillValidation?.addEventListener('click', () => { setPendingActionFocus('none'); batchFillValidation(); });
function batchFillNextAction() {
  const ids = [...state.selectedCards];
  const patchMap = {};
  ids.forEach(id => {
    const card = state.cards.find(item => item.id === id);
    if (!card) return;
    patchMap[id] = {
      owner: card.project.owner || '我自己',
      nextAction: card.project.nextAction || card.next_action,
      validationPlan: card.project.validationPlan || card.validation_method,
    };
  });
  updateProjectStateBatchWithMap(patchMap);
}

function batchFillOwner() {
  updateProjectStateBatch([...state.selectedCards], { owner: '我自己' });
}

function batchFillValidation() {
  const ids = [...state.selectedCards];
  const patchMap = {};
  ids.forEach(id => {
    const card = state.cards.find(item => item.id === id);
    if (!card) return;
    patchMap[id] = {
      validationPlan: card.project.validationPlan || card.validation_method,
    };
  });
  updateProjectStateBatchWithMap(patchMap);
}
els.clearSelection.addEventListener('click', clearSelection);
document.querySelectorAll('.idea-table thead th[data-sort]').forEach(th => th.addEventListener('click', () => {
  const key = th.dataset.sort;
  if (key === 'priority_score') return setSort('priority');
  if (key === 'recommendation_grade') return setSort('grade');
  return setSort('total');
}));

document.addEventListener('keydown', handleKeyboardNavigation);

loadIndex().then(() => {
  buildCommandPreview();
  setView('cards');
  setMainTab('ideas');
  toggleGenerator(false);
  renderSelectionState();
  syncMobileDetailState();
  if (els.focusMode) els.focusMode.textContent = state.focusMode ? '连续处理' : '普通浏览';
  if (els.focusHideProcessed) {
    els.focusHideProcessed.checked = state.hideProcessedInFocus;
    els.focusHideProcessed.disabled = !state.focusMode;
  }
}).catch(error => {
  document.body.innerHTML = `<pre style="padding:24px;color:#0f172a">加载失败：${error.message}\n请检查服务是否正常启动，然后访问 /ui-web/</pre>`;
});
