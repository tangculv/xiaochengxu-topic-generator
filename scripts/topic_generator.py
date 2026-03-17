#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
TOPIC_ROOT = ROOT / '选题库'
DIMENSIONS_DIR = TOPIC_ROOT / 'dimensions'
GENERATED_DIR = TOPIC_ROOT / 'generated'
CANDIDATES_DIR = TOPIC_ROOT / 'candidates'
REJECTED_DIR = TOPIC_ROOT / 'rejected'
BATCHES_DIR = TOPIC_ROOT / 'batches'
EXPORTS_DIR = TOPIC_ROOT / 'exports'
OBSIDIAN_DIR = ROOT / 'obsidian'

SPREAD_SCORES = {'must_use_in_group': 10, 'shareable_result': 7, 'word_of_mouth': 5, 'personal': 2}
TOOLING_PENALTY = {'very_low': 0, 'low': 1, 'medium': 2, 'high': 4}

DEFAULT_DATA = {
    'relations': [
        {'id': 'R-CARE-01', 'type': 'care', 'from': '成年子女', 'to': '老年父母', 'obligation_strength': 5, 'group_size': '3-8', 'frequency': 'daily', 'spread_mechanism': 'family_group', 'spread_score': 'word_of_mouth', 'population_estimate': 300000000, 'population_label': '3亿', 'tooling_level': 'very_low', 'obligations': ['饮食照护', '用药管理', '体检理解', '健康监测'], 'notes': '工具化程度极低，家庭照护责任强'},
        {'id': 'R-CARE-03', 'type': 'care', 'from': '父母', 'to': '学龄儿童', 'obligation_strength': 5, 'group_size': '1-2', 'frequency': 'daily', 'spread_mechanism': 'family_group', 'spread_score': 'must_use_in_group', 'population_estimate': 100000000, 'population_label': '1亿', 'tooling_level': 'medium', 'obligations': ['监督作业', '分析错题', '追踪学习进度'], 'notes': '家长高频刚需，群内传播强'},
        {'id': 'R-CARE-05', 'type': 'care', 'from': '家属', 'to': '慢病患者', 'obligation_strength': 5, 'group_size': '3-8', 'frequency': 'daily', 'spread_mechanism': 'family_group', 'spread_score': 'word_of_mouth', 'population_estimate': 400000000, 'population_label': '4亿', 'tooling_level': 'very_low', 'obligations': ['监督用药', '饮食禁忌', '监测体征', '理解医嘱'], 'notes': '照护责任重，付费动机强'},
        {'id': 'R-CARE-06', 'type': 'care', 'from': '家属', 'to': '术后康复患者', 'obligation_strength': 5, 'group_size': '3-8', 'frequency': 'daily', 'spread_mechanism': 'family_group', 'spread_score': 'word_of_mouth', 'population_estimate': 20000000, 'population_label': '2000万', 'tooling_level': 'very_low', 'obligations': ['记录恢复进度', '识别异常', '提醒复诊'], 'notes': '康复管理高频、信息碎片化'},
        {'id': 'R-CARE-07', 'type': 'care', 'from': '家属', 'to': '孕产妇', 'obligation_strength': 5, 'group_size': '3-8', 'frequency': 'daily', 'spread_mechanism': 'family_group', 'spread_score': 'must_use_in_group', 'population_estimate': 10000000, 'population_label': '1000万', 'tooling_level': 'medium', 'obligations': ['饮食管理', '产检记录', '风险提醒'], 'notes': '家庭决策链长，传播性好'},
        {'id': 'R-AUTH-03', 'type': 'authority', 'from': '培训班老师', 'to': '学员家长', 'obligation_strength': 4, 'group_size': '10-30', 'frequency': 'weekly', 'spread_mechanism': 'class_group', 'spread_score': 'must_use_in_group', 'population_estimate': 50000000, 'population_label': '5000万', 'tooling_level': 'low', 'obligations': ['布置练习', '评估反馈', '发送进步报告'], 'notes': '老师端付费明确，报告天然传播'},
        {'id': 'R-AUTH-04', 'type': 'authority', 'from': '体育教练', 'to': '学员', 'obligation_strength': 4, 'group_size': '10-50', 'frequency': 'weekly', 'spread_mechanism': 'interest_group', 'spread_score': 'shareable_result', 'population_estimate': 30000000, 'population_label': '3000万', 'tooling_level': 'low', 'obligations': ['动作评估', '训练计划', '伤病预警'], 'notes': '垂直训练场景适合视觉 AI'},
        {'id': 'R-AUTH-06', 'type': 'authority', 'from': '社区干部', 'to': '居民', 'obligation_strength': 4, 'group_size': '50-500', 'frequency': 'weekly', 'spread_mechanism': 'community_group', 'spread_score': 'must_use_in_group', 'population_estimate': 50000000, 'population_label': '5000万', 'tooling_level': 'low', 'obligations': ['通知收集', '风险上报', '健康登记'], 'notes': '群体管理刚需，执行链条明确'},
        {'id': 'R-SELF-01', 'type': 'self', 'from': '自己', 'to': '体重与饮食管理', 'obligation_strength': 3, 'group_size': '1', 'frequency': 'daily', 'spread_mechanism': 'self', 'spread_score': 'personal', 'population_estimate': 300000000, 'population_label': '3亿', 'tooling_level': 'medium', 'obligations': ['记录餐食', '管理热量', '追踪体重'], 'notes': '自律型需求大，但传播性较弱'},
        {'id': 'R-SELF-03', 'type': 'self', 'from': '自己', 'to': '学习进度', 'obligation_strength': 3, 'group_size': '1', 'frequency': 'daily', 'spread_mechanism': 'self', 'spread_score': 'personal', 'population_estimate': 200000000, 'population_label': '2亿', 'tooling_level': 'medium', 'obligations': ['记录任务', '总结错题', '生成计划'], 'notes': '个体学习管理长期刚需'},
        {'id': 'R-CONT-01', 'type': 'contract', 'from': '小时工/兼职', 'to': '自我利益保护', 'obligation_strength': 4, 'group_size': '1', 'frequency': 'daily', 'spread_mechanism': 'peer_group', 'spread_score': 'word_of_mouth', 'population_estimate': 200000000, 'population_label': '2亿', 'tooling_level': 'low', 'obligations': ['记录工时', '核算收入', '留存凭证'], 'notes': '真实痛点强，已有验证模型'},
        {'id': 'R-CONT-05', 'type': 'contract', 'from': '培训机构', 'to': '付费学员', 'obligation_strength': 4, 'group_size': '10-50', 'frequency': 'weekly', 'spread_mechanism': 'class_group', 'spread_score': 'shareable_result', 'population_estimate': 30000000, 'population_label': '3000万', 'tooling_level': 'low', 'obligations': ['续费提醒', '进度反馈', '学习报告'], 'notes': '机构愿意为留存付费'},
        {'id': 'R-MUT-03', 'type': 'mutual', 'from': '病友', 'to': '病友', 'obligation_strength': 3, 'group_size': '20-500', 'frequency': 'weekly', 'spread_mechanism': 'interest_group', 'spread_score': 'shareable_result', 'population_estimate': 400000000, 'population_label': '4亿', 'tooling_level': 'low', 'obligations': ['共享经验', '汇总记录', '预警复发'], 'notes': '天然社群传播，但付费链路更弱'},
        {'id': 'R-MUT-05', 'type': 'mutual', 'from': '同班家长', 'to': '家长', 'obligation_strength': 3, 'group_size': '30-50', 'frequency': 'weekly', 'spread_mechanism': 'class_group', 'spread_score': 'must_use_in_group', 'population_estimate': 40000000, 'population_label': '4000万', 'tooling_level': 'medium', 'obligations': ['群内协调', '材料收集', '活动组织'], 'notes': '协同场景多，传播极强'},
    ],
    'actions': [
        {'id': 'A-EVALUATE-HEALTH', 'category': 'evaluate', 'name': '判健康', 'description': '对饮食、用药、健康行为给出判断', 'ai_potential': 5, 'page_type': 'form-to-result', 'fit_domains': ['D-HEALTH']},
        {'id': 'A-TRACK-HEALTH', 'category': 'track', 'name': '追踪健康', 'description': '连续记录并发现趋势异常', 'ai_potential': 5, 'page_type': 'record-history', 'fit_domains': ['D-HEALTH']},
        {'id': 'A-EVALUATE-CORRECTNESS', 'category': 'evaluate', 'name': '判对错', 'description': '识别作业、试卷、练习中的正确性与知识点归因', 'ai_potential': 5, 'page_type': 'form-to-result', 'fit_domains': ['D-STUDY', 'D-SKILL']},
        {'id': 'A-DISTRIBUTE-RESULT', 'category': 'distribute', 'name': '发结果', 'description': '向用户分发个性化结果、报告和进步总结', 'ai_potential': 4, 'page_type': 'dashboard', 'fit_domains': ['D-HEALTH', 'D-STUDY', 'D-SKILL', 'D-MONEY', 'D-EVENT']},
        {'id': 'A-TRACK-FINANCE', 'category': 'track', 'name': '追踪财务', 'description': '记录工时、收入、账目并自动核算', 'ai_potential': 3, 'page_type': 'record-history', 'fit_domains': ['D-MONEY']},
        {'id': 'A-VERIFY-COMPLIANCE', 'category': 'verify', 'name': '核验合规', 'description': '判断是否按要求执行', 'ai_potential': 4, 'page_type': 'form-to-result', 'fit_domains': ['D-HEALTH', 'D-SAFETY', 'D-STUDY', 'D-EVENT']},
        {'id': 'A-EVALUATE-QUALITY', 'category': 'evaluate', 'name': '判质量', 'description': '对技能、作品、动作进行质量评估', 'ai_potential': 5, 'page_type': 'form-to-result', 'fit_domains': ['D-SKILL', 'D-CONTENT']},
        {'id': 'A-COLLECT-FEEDBACK', 'category': 'collect', 'name': '收反馈', 'description': '收集评价、意见、情况反馈', 'ai_potential': 4, 'page_type': 'form-to-result', 'fit_domains': ['D-EVENT', 'D-HEALTH', 'D-RELATION']},
        {'id': 'A-COORDINATE-SCHEDULE', 'category': 'coordinate', 'name': '排期协调', 'description': '协调多人时间和任务分配', 'ai_potential': 3, 'page_type': 'dashboard', 'fit_domains': ['D-TIME', 'D-EVENT']},
    ],
    'domains': [
        {'id': 'D-HEALTH', 'name': '健康', 'subdomains': ['饮食', '用药', '体检', '体征', '康复', '孕产']},
        {'id': 'D-STUDY', 'name': '学业', 'subdomains': ['作业', '考试', '错题', '知识点', '复盘']},
        {'id': 'D-SKILL', 'name': '技能', 'subdomains': ['乐器', '口语', '书法', '写作', '健身', '绘画']},
        {'id': 'D-MONEY', 'name': '金钱', 'subdomains': ['工时', '工资', '记账', '报销', '续费']},
        {'id': 'D-SAFETY', 'name': '安全', 'subdomains': ['打卡', '巡检', '报备', '预警']},
        {'id': 'D-CONTENT', 'name': '内容', 'subdomains': ['作品', '视频', '照片', '笔记']},
        {'id': 'D-EVENT', 'name': '活动', 'subdomains': ['通知', '签到', '报名', '组织']},
        {'id': 'D-TIME', 'name': '时间', 'subdomains': ['排班', '预约', '提醒', '复诊']},
        {'id': 'D-RELATION', 'name': '关系', 'subdomains': ['互助', '分工', '纪念', '协作']},
    ],
    'ai_levels': {
        'levels': [
            {'id': 'L1', 'name': '替代重复劳动', 'score': 0, 'price_ceiling': 9.9},
            {'id': 'L2', 'name': '替代技能工作', 'score': 10, 'price_ceiling': 39.9},
            {'id': 'L3', 'name': '替代专家判断', 'score': 20, 'price_ceiling': 99},
        ],
        'capabilities': [
            {'id': 'AI-UNDERSTAND', 'name': '理解非结构化输入', 'min_level': 'L2'},
            {'id': 'AI-EVALUATE', 'name': '质量评判', 'min_level': 'L2'},
            {'id': 'AI-GENERATE', 'name': '个性化生成', 'min_level': 'L2'},
            {'id': 'AI-PATTERN', 'name': '模式识别', 'min_level': 'L2'},
            {'id': 'AI-REASON', 'name': '知识推理', 'min_level': 'L3'},
            {'id': 'AI-TRANSFORM', 'name': '格式转换', 'min_level': 'L1'},
        ],
    },
}



RELATION_DOMAIN_ALLOW = {
    'R-CARE-01': {'D-HEALTH', 'D-TIME'},
    'R-CARE-03': {'D-STUDY', 'D-SKILL', 'D-TIME'},
    'R-CARE-05': {'D-HEALTH', 'D-TIME'},
    'R-CARE-06': {'D-HEALTH', 'D-TIME'},
    'R-CARE-07': {'D-HEALTH', 'D-TIME'},
    'R-AUTH-03': {'D-STUDY', 'D-SKILL', 'D-EVENT'},
    'R-AUTH-04': {'D-SKILL', 'D-HEALTH'},
    'R-AUTH-06': {'D-EVENT', 'D-SAFETY', 'D-TIME'},
    'R-SELF-01': {'D-HEALTH'},
    'R-SELF-03': {'D-STUDY', 'D-SKILL', 'D-TIME'},
    'R-CONT-01': {'D-MONEY', 'D-TIME'},
    'R-CONT-05': {'D-STUDY', 'D-SKILL', 'D-MONEY'},
    'R-MUT-03': {'D-HEALTH', 'D-RELATION', 'D-TIME'},
    'R-MUT-05': {'D-EVENT', 'D-RELATION', 'D-TIME', 'D-STUDY'},
}

SUBDOMAIN_COMPATIBILITY = {
    ('care-diet', 'R-CARE-03'): {'饮食'},
    ('care-diet', 'R-CARE-07'): {'饮食', '孕产'},
    ('care-diet', 'R-CARE-01'): {'饮食', '体检', '体征'},
    ('care-diet', 'R-CARE-05'): {'饮食', '用药', '体征'},
    ('care-diet', 'R-CARE-06'): {'康复', '体征'},
    ('mutual-risk', 'R-CARE-03'): set(),
    ('mutual-risk', 'R-CARE-07'): {'孕产', '体征'},
    ('mutual-risk', 'R-CARE-01'): {'体征', '康复', '用药'},
    ('mutual-risk', 'R-CARE-05'): {'用药', '体征', '康复'},
    ('mutual-risk', 'R-CARE-06'): {'康复', '体征'},
    ('mutual-risk', 'R-MUT-03'): {'康复', '体征', '用药'},
    ('skill-report', 'R-AUTH-03'): {'乐器', '口语', '书法', '写作', '绘画'},
    ('skill-quality', 'R-AUTH-04'): {'健身'},
    ('skill-quality', 'R-SELF-03'): {'口语', '写作', '绘画', '书法'},
    ('study-homework', 'R-CARE-03'): {'作业', '考试', '错题', '知识点'},
    ('study-plan', 'R-CARE-03'): {'复盘', '知识点', '错题'},
    ('study-plan', 'R-AUTH-03'): {'复盘', '知识点', '错题'},
    ('finance-proof', 'R-CONT-01'): {'工时', '工资', '记账'},
    ('feedback-collector', 'R-AUTH-06'): {'通知', '组织'},
    ('feedback-collector', 'R-MUT-05'): {'通知', '组织', '报名'},
    ('schedule-helper', 'R-CARE-01'): {'复诊', '提醒', '预约'},
    ('schedule-helper', 'R-CARE-06'): {'复诊', '提醒', '预约'},
    ('schedule-helper', 'R-AUTH-06'): {'排班', '提醒'},
    ('schedule-helper', 'R-MUT-05'): {'排班', '提醒', '组织'},
}

def template_base_id(template_id: str) -> str:
    for base in BASE_TEMPLATES:
        if template_id == base['id'] or template_id.startswith(f"{base['id']}-"):
            return base['id']
    return template_id

BASE_TEMPLATES = [
    {'id': 'care-diet', 'title': '拍餐食，AI结合病史给出吃法建议', 'relation_types': ['care', 'self'], 'action_id': 'A-EVALUATE-HEALTH', 'domain_id': 'D-HEALTH', 'subdomain': '饮食', 'ai_level': 'L3', 'capability': 'AI-REASON', 'trigger': '每餐前后', 'frequency_label': '每天 3 次', 'user_primary': '慢病患者、异地子女、控糖控脂人群', 'user_secondary': '需要照护父母的家庭成员', 'payment_who': '患者本人或子女', 'payment_why': '替代低频、昂贵的营养咨询，形成每餐决策助手', 'free_tier': '每日 1 次分析免费', 'vip_tier': '无限分析 + 周报 + 家庭协作', 'competition': '薄荷健康、糖护士等偏记录工具', 'gap': '缺少基于个人病史与饮食场景的即时判断', 'moat': '病史+餐食图片+长期反馈构成个体化数据壁垒', 'risks': ['医疗建议合规风险', '食物识别准确率要求高']},
    {'id': 'care-medication', 'title': '拍药盒/病历，AI提醒并解释是否按医嘱执行', 'relation_types': ['care'], 'action_id': 'A-TRACK-HEALTH', 'domain_id': 'D-HEALTH', 'subdomain': '用药', 'ai_level': 'L2', 'capability': 'AI-UNDERSTAND', 'trigger': '每日用药时', 'frequency_label': '每天 2-3 次', 'user_primary': '异地照护父母的成年子女、慢病家属', 'user_secondary': '独居老人', 'payment_who': '成年子女或家属', 'payment_why': '减少漏服、错服风险，降低沟通成本', 'free_tier': '单成员基础提醒免费', 'vip_tier': '多成员协同 + 异常提醒 + 月报', 'competition': '普通提醒类 App', 'gap': '缺乏拍照即录入、家属联动与医嘱解释能力', 'moat': '围绕家庭照护协作形成长期留存', 'risks': ['老人操作门槛', 'OCR 与药物识别准确性']},
    {'id': 'care-report', 'title': '拍检查结果，AI自动生成给家属看的健康摘要', 'relation_types': ['care', 'authority'], 'action_id': 'A-DISTRIBUTE-RESULT', 'domain_id': 'D-HEALTH', 'subdomain': '体检', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '拿到检查结果后', 'frequency_label': '每月 1 次', 'user_primary': '家属、社区管理者、健康管理人员', 'user_secondary': '被照护者本人', 'payment_who': '家属或组织者', 'payment_why': '把复杂健康数据转化为可执行行动', 'free_tier': '基础摘要免费', 'vip_tier': '对比趋势 + 复诊提醒', 'competition': '医院原始报告、人工解读', 'gap': '缺少面向家庭场景的持续健康摘要产品', 'moat': '长期健康事件与解释记录', 'risks': ['对敏感结果需谨慎表达', '需要稳定 OCR']},
    {'id': 'study-homework', 'title': '拍作业，AI逐题批改并生成同类巩固题', 'relation_types': ['care', 'self'], 'action_id': 'A-EVALUATE-CORRECTNESS', 'domain_id': 'D-STUDY', 'subdomain': '作业', 'ai_level': 'L2', 'capability': 'AI-EVALUATE', 'trigger': '完成练习后', 'frequency_label': '每天 1-2 次', 'user_primary': '学生家长、自学者', 'user_secondary': '课后托管老师', 'payment_who': '家长或学生本人', 'payment_why': '节省辅导时间，提高练习反馈密度', 'free_tier': '每日 1 页免费', 'vip_tier': '无限批改 + 错题本 + 周报', 'competition': '作业帮、学而思等', 'gap': '更聚焦个体知识点闭环和家长陪伴场景', 'moat': '长期错题轨迹与知识点画像', 'risks': ['手写识别稳定性', '与成熟竞品竞争激烈']},
    {'id': 'study-plan', 'title': 'AI根据错题与进度生成下一周学习计划', 'relation_types': ['care', 'self', 'authority'], 'action_id': 'A-DISTRIBUTE-RESULT', 'domain_id': 'D-STUDY', 'subdomain': '复盘', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '每周复盘时', 'frequency_label': '每周 1 次', 'user_primary': '家长、学生、老师', 'user_secondary': '托管机构', 'payment_who': '家长或机构', 'payment_why': '减少计划制定成本，提高执行率', 'free_tier': '基础计划免费', 'vip_tier': '个性化计划 + 执行追踪', 'competition': '手工计划表', 'gap': '没有基于错题和节奏自动出周计划的轻量工具', 'moat': '学习路径数据累积', 'risks': ['计划模板过于泛化会降低价值']},
    {'id': 'skill-report', 'title': 'AI生成学员进步报告并自动发给家长', 'relation_types': ['authority', 'contract'], 'action_id': 'A-DISTRIBUTE-RESULT', 'domain_id': 'D-SKILL', 'subdomain': '乐器', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '每周课程后', 'frequency_label': '每周 1-2 次', 'user_primary': '老师、机构、教练', 'user_secondary': '学员家长', 'payment_who': '老师或机构', 'payment_why': '提升服务感知与续费率', 'free_tier': '5 个学员内免费', 'vip_tier': '多班级管理 + 家长分发 + 续费提醒', 'competition': '表单+人工总结', 'gap': '没有低成本、可批量生成个性化报告的小程序', 'moat': '老师评价标准与学员成长档案沉淀', 'risks': ['需绑定具体评估数据', '老师付费教育成本']},
    {'id': 'skill-quality', 'title': '上传作品或动作片段，AI评估质量并给出改进建议', 'relation_types': ['authority', 'self'], 'action_id': 'A-EVALUATE-QUALITY', 'domain_id': 'D-SKILL', 'subdomain': '健身', 'ai_level': 'L2', 'capability': 'AI-EVALUATE', 'trigger': '每次训练或练习后', 'frequency_label': '每周 2-4 次', 'user_primary': '教练、学生、自学者', 'user_secondary': '机构主理人', 'payment_who': '用户本人或机构', 'payment_why': '提高动作/作品质量，减少纯人工点评成本', 'free_tier': '每周 2 次免费', 'vip_tier': '无限分析 + 进步记录', 'competition': '人工点评、视频课程', 'gap': '缺少轻量化 AI 点评工具', 'moat': '点评历史与个体成长轨迹', 'risks': ['视频/图像处理成本高']},
    {'id': 'finance-proof', 'title': '记录工时与收入，AI自动核算应得工资并生成追款凭证', 'relation_types': ['contract'], 'action_id': 'A-TRACK-FINANCE', 'domain_id': 'D-MONEY', 'subdomain': '工时', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '每次上下班后', 'frequency_label': '每天 1-2 次', 'user_primary': '小时工、兼职、灵活就业者', 'user_secondary': '工友群', 'payment_who': '劳动者本人', 'payment_why': '避免被少算工时，提高讨薪成功率', 'free_tier': '基础记账免费', 'vip_tier': '凭证导出 + 法律提醒 + 月结报告', 'competition': '记工本等工具', 'gap': '没有 AI 帮你解释异常、组织证据、生成对账单', 'moat': '工时数据 + 证据链沉淀', 'risks': ['法律表述需谨慎', '需要简单到一线工友会用']},
    {'id': 'mutual-risk', 'title': '共同记录症状与诱因，AI识别高风险模式并提醒复查', 'relation_types': ['mutual', 'care'], 'action_id': 'A-VERIFY-COMPLIANCE', 'domain_id': 'D-HEALTH', 'subdomain': '康复', 'ai_level': 'L3', 'capability': 'AI-PATTERN', 'trigger': '每周复盘时', 'frequency_label': '每周 1 次', 'user_primary': '病友群管理员、患者本人、照护家属', 'user_secondary': '家属', 'payment_who': '患者本人或家属', 'payment_why': '降低复发风险，获得趋势提醒', 'free_tier': '基础记录免费', 'vip_tier': '群组趋势预警 + 个体风险提醒', 'competition': '微信群聊天、普通记录表', 'gap': '缺少从群体记录中提炼个人风险模式的工具', 'moat': '病程数据与群体模式识别', 'risks': ['数据真实性参差不齐', '医疗风险提示需慎重措辞']},
    {'id': 'feedback-collector', 'title': '收集群内反馈，AI自动总结重点并输出执行建议', 'relation_types': ['authority', 'mutual', 'contract'], 'action_id': 'A-COLLECT-FEEDBACK', 'domain_id': 'D-EVENT', 'subdomain': '通知', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '每次活动或通知后', 'frequency_label': '每周 1-2 次', 'user_primary': '班委、社区干部、机构老师', 'user_secondary': '群成员', 'payment_who': '组织者', 'payment_why': '减少手工整理反馈时间', 'free_tier': '基础总结免费', 'vip_tier': '自动分类 + 行动建议 + 导出', 'competition': '群聊 + Excel', 'gap': '没有把反馈直接转成待办的轻量工具', 'moat': '组织者历史反馈数据', 'risks': ['L2 价值需要表达清楚']},
    {'id': 'schedule-helper', 'title': '多人排期信息收集后，AI自动给出最优排班和提醒', 'relation_types': ['mutual', 'authority', 'care'], 'action_id': 'A-COORDINATE-SCHEDULE', 'domain_id': 'D-TIME', 'subdomain': '排班', 'ai_level': 'L2', 'capability': 'AI-GENERATE', 'trigger': '每次组织活动或分工前', 'frequency_label': '每周 1 次', 'user_primary': '家属协作人、班委、社区干部、老师', 'user_secondary': '参与成员', 'payment_who': '组织者', 'payment_why': '减少沟通和反复确认成本', 'free_tier': '基础排期免费', 'vip_tier': '智能提醒 + 历史排期建议', 'competition': '接龙表单、群内投票', 'gap': '缺少适合微信群场景的排期协调助手', 'moat': '历史协作模式数据', 'risks': ['AI 差异需依赖历史数据']},
    {'id': 'generic-notion', 'title': 'AI 自动生成阶段报告并支持分享到群内', 'relation_types': ['care', 'authority', 'mutual'], 'action_id': 'A-DISTRIBUTE-RESULT', 'domain_id': 'D-CONTENT', 'subdomain': '笔记', 'ai_level': 'L1', 'capability': 'AI-TRANSFORM', 'trigger': '每周总结时', 'frequency_label': '每周 1 次', 'user_primary': '任意需要汇报的人', 'user_secondary': '群成员', 'payment_who': '组织者', 'payment_why': '省时间', 'free_tier': '基础模板免费', 'vip_tier': '高级模板', 'competition': '飞书文档', 'gap': '差异化弱', 'moat': '几乎无', 'risks': ['AI 价值过低', '红海竞争严重'], 'red_ocean': True},
]

SUBDOMAIN_VARIANTS = {
    'D-HEALTH': ['饮食', '用药', '体检', '体征', '康复', '孕产'],
    'D-STUDY': ['作业', '考试', '错题', '知识点', '复盘'],
    'D-SKILL': ['乐器', '口语', '书法', '写作', '健身', '绘画'],
    'D-MONEY': ['工时', '工资', '记账', '报销', '续费'],
    'D-EVENT': ['通知', '签到', '报名', '组织'],
    'D-TIME': ['排班', '预约', '提醒', '复诊'],
}


def ensure_default_files() -> None:
    for directory in [DIMENSIONS_DIR, GENERATED_DIR, CANDIDATES_DIR, REJECTED_DIR, BATCHES_DIR, EXPORTS_DIR, OBSIDIAN_DIR]:
        directory.mkdir(parents=True, exist_ok=True)
    for key, data in DEFAULT_DATA.items():
        path = DIMENSIONS_DIR / f'{key}.json'
        if not path.exists():
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def load_json(name: str) -> Any:
    return json.loads((DIMENSIONS_DIR / f'{name}.json').read_text(encoding='utf-8'))


def slugify(text: str) -> str:
    text = re.sub(r'[^\w\u4e00-\u9fff-]+', '-', text).strip('-')
    return text or 'item'


def parse_frequency(value: str) -> Tuple[int, str]:
    if 'daily' in value or '每天' in value:
        return 10, '每天'
    if 'weekly' in value or '每周' in value:
        return 8, '每周'
    if 'monthly' in value or '每月' in value:
        return 4, '每月'
    return 2, value


def choose_price(ai_level: str, relation_type: str) -> float:
    if ai_level == 'L3':
        return 29.9 if relation_type in {'care', 'self', 'mutual'} else 49.0
    if relation_type in {'authority', 'contract'}:
        return 39.0
    return 19.9


def score_card(relation: Dict[str, Any], action: Dict[str, Any], template: Dict[str, Any]) -> Dict[str, int]:
    frequency_score, _ = parse_frequency(relation['frequency'])
    population = relation['population_estimate']
    market_score = 10 if population >= 10_000_000 else 6 if population >= 1_000_000 else 0
    ai_score_map = {'L1': 3, 'L2': 12, 'L3': 15}
    ai_level = template['ai_level']
    user_payment = 15 if relation['type'] in {'care', 'authority'} else 12 if relation['type'] == 'contract' else 10
    pain = 15 if relation['obligation_strength'] >= 5 else 12 if relation['obligation_strength'] >= 4 else 8
    drive = 15 if relation['type'] in {'care', 'authority'} else 10
    solo = 8 if ai_level == 'L3' else 9 if ai_level == 'L2' else 6
    executable = 9 if action['category'] in {'evaluate', 'track', 'distribute', 'verify', 'collect'} else 7
    total = solo + ai_score_map[ai_level] + frequency_score + user_payment + executable + market_score + pain + drive
    total -= TOOLING_PENALTY.get(relation.get('tooling_level', 'medium'), 2)
    if template.get('red_ocean'):
        total -= 8
    if '每月' in template['frequency_label']:
        total -= 3
    return {
        'solo_feasible': max(solo, 0),
        'ai_breakthrough': max(ai_score_map[ai_level], 0),
        'high_frequency': max(frequency_score, 0),
        'clear_user_payment': max(user_payment, 0),
        'specific_executable': max(executable, 0),
        'large_market': max(market_score, 0),
        'real_pain': max(pain, 0),
        'human_drive': max(drive, 0),
        'total': max(total, 0),
    }


def priority_score(total: int, relation: Dict[str, Any], ai_level: str) -> float:
    ai_score = {'L1': 0, 'L2': 10, 'L3': 20}[ai_level]
    return round(total * 0.4 + relation['obligation_strength'] * 6 + ai_score + SPREAD_SCORES[relation['spread_score']], 1)


def infer_rejections(relation: Dict[str, Any], template: Dict[str, Any], scores: Dict[str, int]) -> List[str]:
    reasons: List[str] = []
    if relation['population_estimate'] < 1_000_000:
        reasons.append('population_below_threshold')
    freq_score, _ = parse_frequency(relation['frequency'])
    if freq_score < 8:
        reasons.append('low_frequency_warning')
    if template['ai_level'] == 'L1':
        reasons.append('ai_level_below_threshold')
    if template.get('red_ocean'):
        reasons.append('red_ocean')
    if scores['total'] < 70:
        reasons.append('score_below_threshold')
    return reasons


def expand_templates() -> List[Dict[str, Any]]:
    templates: List[Dict[str, Any]] = []
    for base in BASE_TEMPLATES:
        domain_id = base['domain_id']
        variants = SUBDOMAIN_VARIANTS.get(domain_id, [base['subdomain']])
        if base['subdomain'] in variants:
            templates.append(base)
        for sub in variants:
            if sub == base['subdomain']:
                continue
            variant = deepcopy(base)
            variant['id'] = f"{base['id']}-{slugify(sub)}"
            variant['subdomain'] = sub
            if domain_id == 'D-HEALTH':
                variant['title'] = base['title'].replace('餐食', sub).replace('病史', f'{sub}相关记录') if '餐食' in base['title'] else f"围绕{sub}记录，{base['title']}"
            elif domain_id == 'D-STUDY':
                variant['title'] = f"围绕{sub}场景，{base['title']}"
            elif domain_id == 'D-SKILL':
                variant['title'] = f"围绕{sub}场景，{base['title']}"
            elif domain_id == 'D-MONEY':
                variant['title'] = f"围绕{sub}管理，{base['title']}"
            elif domain_id == 'D-EVENT':
                variant['title'] = f"围绕{sub}流程，{base['title']}"
            elif domain_id == 'D-TIME':
                variant['title'] = f"围绕{sub}场景，{base['title']}"
            templates.append(variant)
    return templates


TEMPLATE_LIBRARY = expand_templates()


def make_template_variants(relation: Dict[str, Any]) -> List[Dict[str, Any]]:
    variants: List[Dict[str, Any]] = []
    allowed_domains = RELATION_DOMAIN_ALLOW.get(relation['id'])
    for template in TEMPLATE_LIBRARY:
        if relation['type'] not in template.get('relation_types', []):
            continue
        if relation['type'] == 'self' and template['domain_id'] not in {'D-HEALTH', 'D-STUDY', 'D-SKILL'}:
            continue
        if relation['type'] == 'contract' and template['domain_id'] not in {'D-MONEY', 'D-SKILL', 'D-EVENT'}:
            continue
        if relation['type'] == 'mutual' and template['domain_id'] not in {'D-HEALTH', 'D-TIME', 'D-EVENT', 'D-RELATION'}:
            continue
        if allowed_domains and template['domain_id'] not in allowed_domains:
            continue
        base_id = template_base_id(template['id'])
        allowed_subdomains = SUBDOMAIN_COMPATIBILITY.get((base_id, relation['id']))
        if allowed_subdomains and template['subdomain'] not in allowed_subdomains:
            continue
        variants.append(deepcopy(template))
    return variants


def build_card(seq: int, relation: Dict[str, Any], action: Dict[str, Any], domain: Dict[str, Any], template: Dict[str, Any], ai_levels: Dict[str, Any], batch_id: str) -> Dict[str, Any]:
    scores = score_card(relation, action, template)
    rejection_reasons = infer_rejections(relation, template, scores)
    status = 'candidate' if not rejection_reasons else 'rejected'
    level_detail = next(item for item in ai_levels['levels'] if item['id'] == template['ai_level'])
    spread_text = {'must_use_in_group': '群内协作天然传播，可形成一人带多人', 'shareable_result': '结果卡片可分享带来传播', 'word_of_mouth': '家庭群/病友群口碑传播', 'personal': '个人使用为主，可通过成果分享传播'}[relation['spread_score']]
    card_id = f"IDEA-{datetime.now().year}-{seq:04d}"
    return {
        'id': card_id,
        'batch_id': batch_id,
        'created': datetime.now().strftime('%Y-%m-%d'),
        'status': status,
        'dedupe_key': f"{relation['id']}|{action['id']}|{domain['id']}|{template['subdomain']}",
        'relation': {'id': relation['id'], 'from': relation['from'], 'to': relation['to'], 'type': relation['type']},
        'action': {'id': action['id'], 'name': action['name']},
        'domain': {'id': domain['id'], 'name': domain['name'], 'sub': template['subdomain']},
        'ai': {'level': template['ai_level'], 'level_name': level_detail['name'], 'capability': template['capability'], 'what_it_does': template['title'], 'what_it_replaces': level_detail['name']},
        'one_liner': f"{relation['from']}面向{relation['to']}：{template['title']}",
        'user_action': '上传图片/记录 → AI分析 → 查看结果',
        'trigger': template['trigger'],
        'frequency': template['frequency_label'],
        'user': {'primary': template['user_primary'], 'secondary': template['user_secondary'], 'population': relation['population_label']},
        'payment': {'who_pays': template['payment_who'], 'why': template['payment_why'], 'price': f"{choose_price(template['ai_level'], relation['type']):.1f}元/月", 'free_tier': template['free_tier'], 'vip_tier': template['vip_tier']},
        'spread': {'mechanism': relation['spread_mechanism'], 'description': spread_text, 'viral_action': '生成结果卡片或周报后分享', 'one_brings_many': spread_text},
        'scores': scores,
        'priority_score': priority_score(scores['total'], relation, template['ai_level']),
        'competition': {'existing': template['competition'], 'gap': template['gap'], 'moat': template['moat']},
        'risks': template['risks'],
        'page_types': [action.get('page_type', 'dashboard'), 'dashboard'],
        'notes': relation['notes'],
        'rejection_reasons': rejection_reasons,
        'template_id': template['id'],
    }


def dedupe_cards(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    rejected: List[Dict[str, Any]] = []
    rank = {'L1': 1, 'L2': 2, 'L3': 3}
    for card in cards:
        key = card['dedupe_key']
        if key not in best:
            best[key] = card
            continue
        chosen = best[key]
        current_rank = (rank[card['ai']['level']], card['scores']['total'], card['priority_score'])
        chosen_rank = (rank[chosen['ai']['level']], chosen['scores']['total'], chosen['priority_score'])
        if current_rank > chosen_rank:
            chosen['status'] = 'rejected'
            chosen.setdefault('rejection_reasons', []).append('deduped_by_higher_ai_variant')
            rejected.append(chosen)
            best[key] = card
        else:
            card['status'] = 'rejected'
            card.setdefault('rejection_reasons', []).append('deduped_by_higher_ai_variant')
            rejected.append(card)
    return list(best.values()) + rejected


def persist_card(card: Dict[str, Any]) -> Path:
    folder = CANDIDATES_DIR if card['status'] == 'candidate' else REJECTED_DIR
    path = folder / f"{card['id']}-{slugify(card['one_liner'])}.json"
    path.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding='utf-8')
    return path


def export_csv(batch_id: str, cards: List[Dict[str, Any]]) -> Path:
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    path = EXPORTS_DIR / f'{batch_id}.csv'
    with path.open('w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['id', 'status', 'one_liner', 'relation', 'domain', 'ai_level', 'total_score', 'priority_score', 'price', 'rejection_reasons'])
        writer.writeheader()
        for card in cards:
            writer.writerow({'id': card['id'], 'status': card['status'], 'one_liner': card['one_liner'], 'relation': f"{card['relation']['from']}->{card['relation']['to']}", 'domain': f"{card['domain']['name']}/{card['domain']['sub']}", 'ai_level': card['ai']['level'], 'total_score': card['scores']['total'], 'priority_score': card['priority_score'], 'price': card['payment']['price'], 'rejection_reasons': '|'.join(card.get('rejection_reasons', []))})
    return path


def render_batch_markdown(batch: Dict[str, Any], cards: List[Dict[str, Any]]) -> str:
    lines = [f"# {batch['batch_id']} {batch['name']}", '', f"> 生成时间：{batch['created']} | 关系节点：{batch['relation_filter'] or '全部'} | 候选：{batch['ideas_passed']} | 淘汰：{batch['ideas_rejected']}", '', '## 候选', '']
    for card in [c for c in cards if c['status'] == 'candidate']:
        lines.extend([f"**[{card['id']}] [{card['scores']['total']}] ★ {card['one_liner']}**", f"关系：{card['relation']['from']}→{card['relation']['to']} | 动作：{card['action']['name']} | 领域：{card['domain']['name']}-{card['domain']['sub']} | AI：{card['ai']['level']}", f"用户：{card['user']['primary']} | 付费：{card['payment']['price']} | 人群：{card['user']['population']}", f"传播：{card['spread']['description']} | 优先级：{card['priority_score']}", ''])
    rejected = [c for c in cards if c['status'] == 'rejected']
    if rejected:
        lines.extend(['## 淘汰', ''])
        for card in rejected:
            lines.append(f"- [{card['id']}] {card['one_liner']} | 原因：{', '.join(card.get('rejection_reasons', [])) or 'unknown'}")
    return '\n'.join(lines)


def render_batch_registry() -> None:
    records = []
    for path in sorted(GENERATED_DIR.glob('BATCH-*.json'), reverse=True):
        payload = json.loads(path.read_text(encoding='utf-8'))
        records.append(payload['batch'])
    (GENERATED_DIR / 'index.json').write_text(json.dumps({'updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'), 'batches': records}, ensure_ascii=False, indent=2), encoding='utf-8')


def render_obsidian(batch: Dict[str, Any], cards: List[Dict[str, Any]]) -> None:
    candidate_cards = [c for c in cards if c['status'] == 'candidate']
    rejected_cards = [c for c in cards if c['status'] == 'rejected']
    dashboard = ['---', 'title: 选题生成器看板', 'status: active', '---', '', '# 选题生成器看板', '', '返回：[[03 Projects/小程序工厂/README.md]]', '', '## 入口导航', '', '- PRD：[[03 Projects/小程序工厂/选题库/PRD-选题生成器.md]]', f"- 当前批次：[[03 Projects/小程序工厂/选题库/batches/{batch['batch_id']}.md]]", '- Web 界面：`[[03 Projects/小程序工厂/ui-web/index.html]]`', '- 候选目录：[[03 Projects/小程序工厂/选题库/candidates]]', '- 淘汰目录：[[03 Projects/小程序工厂/选题库/rejected]]', '', '## 批次摘要', '', f"- 批次：`{batch['batch_id']}`", f"- 候选数：{len(candidate_cards)}", f"- 淘汰数：{len(rejected_cards)}", '', '## 候选看板', '']
    for card in candidate_cards:
        dashboard.append(f"- [[03 Projects/小程序工厂/obsidian/{card['id']}-{slugify(card['one_liner'])}.md]]")
    dashboard.extend(['', '## 淘汰看板', ''])
    for card in rejected_cards:
        dashboard.append(f"- [[03 Projects/小程序工厂/obsidian/{card['id']}-{slugify(card['one_liner'])}.md]]")
    (OBSIDIAN_DIR / 'README-选题生成器看板.md').write_text('\n'.join(dashboard), encoding='utf-8')
    for card in cards:
        content = ['---', f"title: {card['one_liner']}", f"status: {card['status']}", '---', '', f"# {card['one_liner']}", '', '返回：[[03 Projects/小程序工厂/obsidian/README-选题生成器看板.md]]', '', '## 四维度定位', f"- 关系：{card['relation']['from']} → {card['relation']['to']} ({card['relation']['type']})", f"- 动作：{card['action']['name']}", f"- 领域：{card['domain']['name']} / {card['domain']['sub']}", f"- AI：{card['ai']['level']} / {card['ai']['capability']}", '', '## 评分', f"- 总分：{card['scores']['total']}", f"- 优先级：{card['priority_score']}", '', '## 风险 / 淘汰原因']
        content.extend([f"- {item}" for item in card.get('risks', [])])
        for reason in card.get('rejection_reasons', []):
            content.append(f"- 淘汰原因：{reason}")
        (OBSIDIAN_DIR / f"{card['id']}-{slugify(card['one_liner'])}.md").write_text('\n'.join(content), encoding='utf-8')


def generate(args: argparse.Namespace) -> int:
    ensure_default_files()
    relations = load_json('relations')
    actions = {item['id']: item for item in load_json('actions')}
    domains = {item['id']: item for item in load_json('domains')}
    ai_levels = load_json('ai_levels')
    selected_relations = [r for r in relations if not args.relation or r['id'] == args.relation]
    multiplier = max(args.multiplier, 1)
    quality_mode = getattr(args, 'quality_mode', 'focused')
    cards: List[Dict[str, Any]] = []
    seq = 1
    batch_id = args.batch_id or f"BATCH-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    for relation in selected_relations:
        relation_templates = make_template_variants(relation)
        if quality_mode == 'focused':
            relation_templates = relation_templates
        for _ in range(multiplier):
            for template in relation_templates:
                action = actions[template['action_id']]
                domain = domains[template['domain_id']]
                cards.append(build_card(seq, relation, action, domain, template, ai_levels, batch_id))
                seq += 1
    cards = dedupe_cards(cards)
    for card in cards:
        persist_card(card)
    cards.sort(key=lambda item: (item['status'] != 'candidate', -item['priority_score'], -item['scores']['total']))
    batch = {'batch_id': batch_id, 'created': datetime.now().strftime('%Y-%m-%d'), 'name': args.name or '自动生成批次', 'relation_filter': args.relation, 'ideas_generated': len(cards), 'ideas_passed': len([c for c in cards if c['status'] == 'candidate']), 'ideas_rejected': len([c for c in cards if c['status'] == 'rejected']), 'ideas': [c['id'] for c in cards], 'export_csv': str(export_csv(batch_id, cards).relative_to(ROOT))}
    payload = {'batch': batch, 'cards': cards}
    (GENERATED_DIR / f'{batch_id}.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    (BATCHES_DIR / f'{batch_id}.md').write_text(render_batch_markdown(batch, cards), encoding='utf-8')
    render_batch_registry()
    render_obsidian(batch, cards)
    print(json.dumps(batch, ensure_ascii=False, indent=2))
    return 0


def list_dimensions(_: argparse.Namespace) -> int:
    ensure_default_files()
    print(json.dumps({'relations': load_json('relations'), 'actions': load_json('actions'), 'domains': load_json('domains'), 'ai_levels': load_json('ai_levels')}, ensure_ascii=False, indent=2))
    return 0


def list_batches(_: argparse.Namespace) -> int:
    ensure_default_files()
    render_batch_registry()
    print((GENERATED_DIR / 'index.json').read_text(encoding='utf-8'))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='选题生成器')
    subparsers = parser.add_subparsers(dest='command', required=True)
    p_gen = subparsers.add_parser('generate', help='生成选题批次')
    p_gen.add_argument('--relation', help='按 relation id 过滤')
    p_gen.add_argument('--batch-id', help='自定义批次 ID')
    p_gen.add_argument('--name', help='批次名称')
    p_gen.add_argument('--multiplier', type=int, default=1, help='模板扩展倍率，用于生成更大批次')
    p_gen.add_argument('--quality-mode', default='focused', choices=['focused', 'expanded'], help='focused=收敛优先，expanded=数量优先')
    p_gen.set_defaults(func=generate)
    p_list = subparsers.add_parser('list-dimensions', help='查看维度')
    p_list.set_defaults(func=list_dimensions)
    p_batches = subparsers.add_parser('list-batches', help='查看批次')
    p_batches.set_defaults(func=list_batches)
    args = parser.parse_args()
    return args.func(args)


if __name__ == '__main__':
    raise SystemExit(main())
