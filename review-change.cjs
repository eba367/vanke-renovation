'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const stages = ['待开始','初选','比价中','已定型','已下单','已到货','已安装','已验收'];
const fields = ['model','stage','budget','quoted','paid','fit','size','owner','planned','source','spec','risk','notes'];
const optionalFields = ['model','min','max','reason','notes'];
function assert(ok, message) { if (!ok) throw new Error(message); }
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function validate(data, payload) {
  assert(plain(payload) && payload.kind === 'renovation_change_v1', '修改单格式错误');
  assert(typeof payload.optional === 'boolean', '项目类型错误');
  assert(typeof payload.id === 'string' && /^[A-Z][0-9]{2}$/.test(payload.id), '项目编号错误');
  const items = payload.optional ? data.optional : data.items;
  const item = items.find(x => x.id === payload.id);
  assert(item, '项目不存在');
  assert(plain(payload.changes) && plain(payload.base), '缺少修改内容或原值');
  const keys = Object.keys(payload.changes);
  const allowed = payload.optional ? optionalFields : fields;
  assert(keys.length > 0 && keys.length <= allowed.length, '修改字段数量错误');
  assert(Object.keys(payload.base).length === keys.length, '原值字段不匹配');
  for (const key of keys) {
    assert(allowed.includes(key) && Object.hasOwn(payload.base, key), '不允许修改此字段');
    assert(JSON.stringify(item[key] ?? '') === JSON.stringify(payload.base[key]), '原值已变化，请基于网页最新数据重新提交');
    const value = payload.changes[key];
    if (['budget','quoted','paid','min','max'].includes(key)) {
      assert(Number.isSafeInteger(value) && value >= 0 && value <= 10000000, '金额须为合理范围内的非负整数');
    } else {
      assert(typeof value === 'string' && value.length <= (['notes','reason','spec','risk'].includes(key) ? 4000 : 2048), '文本格式或长度错误');
      assert(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), '文本含控制字符');
      if (key === 'stage') assert(stages.includes(value), '阶段错误');
      if (key === 'fit') assert(['未测量','待核实','已适配','不适配'].includes(value), '适配状态错误');
      if (key === 'planned') assert(!value || /^20\d\d-(0[1-9]|1[0-2])$/.test(value), '月份格式错误');
      if (key === 'source' && value) {
        let url; try { url = new URL(value); } catch { throw new Error('来源链接错误'); }
        assert(['https:','http:'].includes(url.protocol) && !url.username && !url.password, '来源链接只允许无凭据的网页地址');
      }
    }
  }
  const next = {...item, ...payload.changes};
  if (payload.optional) assert(next.min <= next.max, '最低价不能大于最高价');
  return {item, changes: payload.changes};
}
function readPayload(body) {
  assert(typeof body === 'string' && body.length <= 30000, '修改单过长或为空');
  const blocks = [...body.matchAll(/^```json\s*\n([\s\S]*?)^```\s*$/gm)];
  assert(blocks.length === 1, '修改单需要且只能包含一个 JSON 数据块');
  return JSON.parse(blocks[0][1]);
}
function isReviewer(permission) { return ['admin','maintain','write'].includes(permission); }
async function run() {
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  assert(event.action === 'labeled' && event.label?.name === '采纳更新' && !event.issue?.pull_request, '不是有效审核事件');
  const repo = process.env.GITHUB_REPOSITORY;
  const headers = {'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
  async function api(path, method='GET', body) {
    const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {method,headers, ...(body ? {body:JSON.stringify(body)} : {})});
    assert(response.ok, `GitHub 接口失败 (${response.status})`);
    return response.status === 204 ? null : response.json();
  }
  const reviewer = event.sender.login;
  const permissions = await api(`collaborators/${encodeURIComponent(reviewer)}/permission`);
  assert(isReviewer(permissions.permission), '审核人没有仓库写入权限');
  const current = await api(`issues/${event.issue.number}`);
  assert(current.state === 'open' && current.labels.some(x => x.name === '采纳更新'), '修改单已关闭或撤回审核');
  assert(current.body === event.issue.body && current.updated_at === event.issue.updated_at, '审核后修改单发生变化，请移除标签并重新审核');
  const data = JSON.parse(fs.readFileSync('renovation.json', 'utf8'));
  const key = String(event.issue.number);
  const digest = crypto.createHash('sha256').update(current.body).digest('hex');
  data.appliedReviews ??= {};
  if (data.appliedReviews[key] === digest) return;
  assert(!Object.hasOwn(data.appliedReviews, key), '此修改单已采纳，请创建新建议');
  const validated = validate(data, readPayload(current.body));
  // Re-read immediately before writing. Issue text is data and is never executed.
  const final = await api(`issues/${event.issue.number}`);
  assert(final.body === current.body && final.updated_at === current.updated_at && final.labels.some(x=>x.name === '采纳更新'), '审核状态已改变');
  Object.assign(validated.item, validated.changes, {updated:new Date().toISOString()});
  data.updated = new Date().toISOString();
  data.appliedReviews[key] = digest;
  fs.writeFileSync('renovation.json', JSON.stringify(data,null,2)+'\n');
  fs.writeFileSync('review-result.json', JSON.stringify({issue:current.number, reviewer, digest}));
}
module.exports = {validate, readPayload, isReviewer};
if (require.main === module) run().catch(error => { console.error(error.message); process.exitCode=1; });
