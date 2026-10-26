(() => {
'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>[...root.querySelectorAll(s)];
const h = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validRepo = value => /^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(value);
const safeUrl = value => {try{const u=new URL(String(value));return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''}catch{return ''}};
const money = n => '¥'+(Number(n)||0).toLocaleString('zh-CN',{maximumFractionDigits:0});
const pct = n => Math.max(0,Math.min(100,Math.round(n)));
const stages=['待开始','初选','比价中','已定型','已下单','已到货','已安装','已验收'];
const levels={'待开始':0,'初选':1,'比价中':2,'已定型':3,'已下单':4,'已到货':5,'已安装':6,'已验收':7,'预留':0};
const sections=[{id:'construction',name:'硬装 · 软装',icon:'◩',desc:'墙面、天花、衣帽间、窗帘、地毯等'},{id:'furniture',name:'家具 · 灯具',icon:'⌂',desc:'沙发单椅、岩板餐桌、床垫、儿童镜板及照明'},{id:'appliances',name:'家电 · 卫浴',icon:'▤',desc:'洗护、冰箱、烟机、电视、净水器和卫浴'}];
const photoSrc = key => `${key}.webp`;
const photos=[['sofa','沙发 & 单椅'],['dining','岩板餐桌'],['pegboard-a','洞洞板 & 镜'],['pegboard-b','儿童收纳'],['mood-living','起居灵感'],['mood-dining','餐厅灵感'],['closet','衣帽间']];
const previews={'F01':'sofa','F02':'sofa','F03':'dining','F14':'pegboard-a','H06':'closet'};
let live=structuredClone(window.INITIAL_RENOVATION_DATA||{}),localMods={},activeTab='overview',filterStage='all',filterText='',selectedId='',repo='';
const groupFor = it => it.category==='家电卫浴'?'appliances':(it.category==='家具'||it.id==='S01')?'furniture':(it.category==='硬装'||it.category==='软装')?'construction':'other';
const getItems =()=> (live.items||[]).map(it=>({...it,...(localMods[it.id]||{})}));
const normalItems=()=>getItems().filter(x=>groupFor(x)!=='other');
const itemsIn=s=>normalItems().filter(it=>groupFor(it)===s);
const total=(items,key)=>items.reduce((sum,x)=>sum+(Number(x[key])||0),0);
const stageScore = it => (levels[it.stage]||0)/7;
const stageProgress = items => items.length?Math.round(items.reduce((s,it)=>s+stageScore(it),0)/items.length*100):0;
const completed=items=>items.filter(it=>it.stage==='已验收').length;
function rememberRepo(){
 
 if(location.hostname.endsWith('.github.io')) {
   const owner=location.hostname.slice(0,-'.github.io'.length),parts=location.pathname.split('/').filter(Boolean);
   return `${owner}/${parts[0]||owner+'.github.io'}`;
 }
 try{const saved=localStorage.getItem('renovation_repo');if(validRepo(saved))return saved}catch(_){}
 return validRepo(live.repository)?live.repository:'';
}
function getStoredPreview(){try{return JSON.parse(localStorage.getItem('renovation_preview_changes')||'{}')}catch{return {}}}
function setStoredPreview(){try{localStorage.setItem('renovation_preview_changes',JSON.stringify(localMods))}catch{}}
function budgetMetrics(){
 const all=getItems(),reserve=all.find(x=>x.id==='O02')?.budget||0,planned=total(all,'budget');
 return {limit:live.budget||150000,planned,unallocated:(live.budget||150000)-planned,reserve,paid:total(all,'paid'),quoted:total(all,'quoted')};
}
function progressBar(v,color){return `<div class="mini-progress"><i style="width:${pct(v)}%;background:${color||'var(--orange)'}"></i></div>`}
function tinyMetric(label,num){return `<div><span class="smallcap">${h(label)}</span><strong>${h(num)}</strong></div>`}
function renderOverview(){
 const all=normalItems(),m=budgetMetrics(),pr=stageProgress(all);
 const statusCount=all.filter(i=>levels[i.stage]>=4).length;
 const sp=live.milestones||[];
 return `<section class="hero"><div class="card dark"><div class="smallcap">TOTAL BUDGET / 装修预算</div><div class="big-num"><small>¥</small>${m.limit.toLocaleString('zh-CN')}</div><div class="budget-bar"><span style="width:${m.planned/m.limit*100}%;background:#ca9368"></span></div><div class="stats-inline">${tinyMetric('已规划（含预备金）',money(m.planned))}${tinyMetric('已付款',money(m.paid))}${tinyMetric('未分配',money(m.unallocated))}</div></div>
 <div class="card ring-card"><div><div class="smallcap">ITEM PROGRESS / 采购推进</div><div style="margin:12px 0 6px;font-weight:700">${completed(all)} / ${all.length} 项已验收</div><p class="minor">${statusCount} 项已下单及之后阶段</p><p class="minor">按各项采购阶段粗略估算<br>不等同于实际施工完工率</p></div><div class="progress-ring" style="--angle:${pr}%"><div class="ring-inner"><strong>${pr}%</strong><span>阶段推进度</span></div></div></div></section>
 <div class="section-head"><div><div class="eyebrow">THREE TRACKS / 三条进度主线</div><h2>每一笔预算，都有去向</h2></div></div>
 <section class="columns3">${sections.map(sec=>{const v=itemsIn(sec.id),p=stageProgress(v);return `<div class="card module" data-open="${sec.id}" role="button" tabindex="0"><div class="module-top"><span class="module-icon">${sec.icon}</span><span class="pill">${completed(v)}/${v.length} 验收</span></div><h3>${sec.name}</h3><div class="count">${sec.desc}</div><div class="amt">${money(total(v,'budget'))}</div>${progressBar(p)}<div class="module-foot"><span>阶段推进 ${p}%</span><span>进入查看 →</span></div></div>`}).join('')}</section>
 <section class="two-column" style="margin-top:15px"><div class="card"><div class="section-head" style="margin-top:0"><div><div class="eyebrow">MILESTONES / 施工时序</div><h2>距离开工，先做什么</h2></div></div>${sp.slice(0,5).map(ms=>`<div class="timeline-card" style="border-top:1px solid var(--line);padding:11px 0"><div class="row"><h3>${h(ms.name)}</h3><span class="date-chip">${h(ms.start.slice(5))} - ${h(ms.end.slice(5))}</span></div><p>${h(ms.actions)}</p></div>`).join('')}<div class="float-guide">2027年1月预计开工，2月6日为春节。重要木作宜在2026年12月完成设计，2027年1月现场复尺，春节后集中安装。</div></div>
 <div class="card"><div class="eyebrow">DECISION NOTES / 需要优先拍板</div><h2 style="font-size:20px">最容易拖慢工期的5件事</h2><div class="risk-list">${[['洗烘空间','双机并排或官方认可叠放方案'],['厨卫尺寸','烟机、马桶坑距、水槽下净空'],['实物家具','沙发单椅与餐桌正式报价'],['儿童镜板','安全限位与墙体固定方案'],['墙面基层','裂纹处理、艺术漆面积与工艺']].map(([x,y])=>`<div class="risk-line"><b>${x}</b><span>${y}</span></div>`).join('')}</div><p class="minor" style="margin-top:12px">需要让家人补充资料？进入对应条目，点击“提出修改”。</p></div></section>
 <div class="section-head"><div><div class="eyebrow">INSPIRATION / 实拍参考</div><h2>我们的中古风选型</h2></div></div><section class="photo-grid">${photos.map(([x,t])=>`<div class="photo-tile"><img src="${photoSrc(x)}" alt="${t}" loading="eager"/><span>${t}</span></div>`).join('')}</section>
 <div class="section-head"><div><div class="eyebrow">FAMILY COLLABORATION / 家庭协作</div><h2>意见提交与审核</h2></div></div><section class="card"><p style="line-height:1.8;margin-top:0">每件商品都能填写 <b>候选型号、预算/报价、机身或家具尺寸、材质功能、适配结果、负责人、采购阶段与家人意见</b>。填写建议后，在 GitHub 创建修改单；由管理员审核后更新共享数据。</p><div class="row" style="flex-wrap:wrap;justify-content:flex-start"><button class="btn primary" id="quickSettings">设置协作仓库</button>${repo?`<a class="btn ghost" href="https://github.com/${h(repo)}/issues" target="_blank" rel="noopener noreferrer">查看家人提交 ↗</a>`:''}</div><p class="warning">网页不存储家庭住址、联系电话、门锁密码及孩子姓名。GitHub Pages 默认是公开网页，勿录入不适合公开的信息。</p></section>`;
}
function renderItem(it){
 const p=stageScore(it)*100,fit=it.fit||'未测量';
 return `<article class="card item-card" data-id="${h(it.id)}">${previews[it.id]?`<img src="${photoSrc(previews[it.id])}" alt="${h(it.name)}参考图" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:9px;margin-bottom:12px"/>`:``}<div class="idline"><span>${h(it.id)} · ${h(it.group||it.category)}</span><span class="pill ${levels[it.stage]>=6?'ok':''}">${h(it.stage||'待开始')}</span></div><h3>${h(it.name)}</h3><div class="model">${h(it.model||'型号待确认')}</div><div class="item-prices"><div><small>预算目标</small><br/><b>${money(it.budget)}</b></div><div style="text-align:right"><small>最新报价</small><br/><strong>${Number(it.quoted)>0?money(it.quoted):'待询价'}</strong></div></div><div class="item-facts"><div><span>尺寸 / 规格</span><b>${h(it.size||'待测量')}</b></div><div><span>现场适配</span><b style="color:${fit==='不适配'?'#aa4a31':fit==='已适配'?'#527d55':'#8b7567'}">${h(fit)}</b></div><div><span>负责人</span><b>${h(it.owner||'待分配')}</b></div><div><span>计划采购/施工</span><b>${h(it.planned||'待排期')}</b></div></div><div class="item-detail"><strong>材质 / 功能：</strong>${h(it.spec||'待确认')}</div><div class="item-risk"><strong>⚑ 避坑提醒：</strong>${h(it.risk||'无')}</div>${it.notes?`<p class="item-detail"><strong>家人意见：</strong>${h(it.notes)}</p>`:''}${progressBar(p)}<div class="item-actions"><button class="btn primary" data-edit="${h(it.id)}">✎ 提交 / 修改</button>${safeUrl(it.source)?`<a class="link-plain" target="_blank" rel="noopener noreferrer" href="${h(safeUrl(it.source))}">查看型号来源 ↗</a>`:'<span class="minor">可补充购买链接</span>'}</div>${localMods[it.id]?'<div class="pill danger" style="margin-top:10px;display:inline-block">此条含本机预览修改，尚未同步</div>':''}</article>`;
}
function renderSection(id){
 const sec=sections.find(x=>x.id===id),base=itemsIn(id),progress=stageProgress(base),filtered=base.filter(x=>(filterStage==='all'||x.stage===filterStage)&&([x.name,x.model,x.size,x.owner,x.group,x.spec].join(' ').toLowerCase().includes(filterText.toLowerCase()))),op=(live.optional||[]).filter(x=>id==='appliances'?x.category==='家电卫浴':id==='furniture'?x.category==='家具'||x.name.includes('灯'):x.category==='硬装'||x.category==='软装');
 return `<div class="section-head"><div><div class="eyebrow">${id.toUpperCase()} / ${h(sec.desc)}</div><h2>${sec.name}进度</h2><p>型号与施工范围仍在初选阶段；预算价不代表锁价。</p></div></div><section class="card"><div class="row"><div><div class="smallcap">本模块规划金额</div><div class="big-num" style="font-size:34px">${money(total(base,'budget'))}</div></div><div style="text-align:right"><div class="smallcap">已验收 / 总条目</div><div style="font-size:22px;font-weight:750;margin:7px 0">${completed(base)} / ${base.length}</div></div></div>${progressBar(progress)}<div class="smallcap">采购与施工阶段推进约 ${progress}% · 已付款 ${money(total(base,'paid'))} · 已登记报价合计 ${money(total(base,'quoted'))}</div></section>
 <div class="toolbar"><input class="field-input" id="searchItems" value="${h(filterText)}" placeholder="搜索品类 / 型号 / 尺寸"/><select class="field-select" id="stageFilter"><option value="all">全部阶段</option>${stages.map(s=>`<option value="${s}" ${filterStage===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="filter-note">当前显示 ${filtered.length} 条。点击卡片里的“提交 / 修改”，由家人提出报价、参数或阶段更新。</div>
 <section class="items">${filtered.map(renderItem).join('')||'<div class="card empty">暂无匹配项目</div>'}</section>
 <div class="section-head"><div><div class="eyebrow">OPTIONAL / 不计入基础预算</div><h2>建议购买清单</h2></div></div><section class="optional-list">${op.map(x=>`<div class="optional-item"><h4>${h(x.name)} <span class="pill">可选</span></h4><strong>${money(x.min)} - ${money(x.max)}</strong><p>${h(x.model||'型号待定')}</p><p>${h(x.reason||'')}</p><button class="btn ghost compact" data-optional="${h(x.id)}">✎ 提交候选意见</button></div>`).join('')||'<p class="minor">本模块暂无独立建议项。</p>'}</section>`;
}
function render(){
 $$('.nav-item').forEach(b=>{const a=b.dataset.tab===activeTab;b.classList.toggle('active',a);b.setAttribute('aria-selected',String(a))});
 $('#main').innerHTML=activeTab==='overview'?renderOverview():renderSection(activeTab);
 $('#footerVersion').textContent=`${live.version||'V6'} · 数据${live.updated||''}`;
}
function openTab(tab){activeTab=tab;filterText='';filterStage='all';render();window.scrollTo({top:0,behavior:'smooth'});}
function field(name,label,value='',type='text',full=false,extra=''){
 const area=type==='textarea';return `<label class="field ${full?'full':''}"><span>${h(label)}</span>${area?`<textarea name="${name}" ${extra}>${h(value)}</textarea>`:`<input type="${type}" name="${name}" value="${h(value)}" ${extra}/>`}</label>`;
}
function selectField(name,label,value,options){return `<label class="field"><span>${label}</span><select name="${name}">${options.map(o=>`<option value="${h(o)}" ${o===value?'selected':''}>${h(o)}</option>`).join('')}</select></label>`}
function openEdit(id,optional=false){
 selectedId=id;const it=optional?(live.optional||[]).find(x=>x.id===id):getItems().find(x=>x.id===id);if(!it)return;
 const title=optional?`新增候选意见 · ${it.name}`:`修改建议 · ${it.name}`;
 $('#dialogTitle').textContent=title;
 let fields='';
 if(optional){fields=field('model','推荐品牌 / 具体型号',it.model||'')+field('min','建议最低价（元）',it.min||0,'number',false,'min="0"')+field('max','建议最高价（元）',it.max||0,'number',false,'min="0"')+field('reason','购买理由 / 安装条件',it.reason||'','textarea',true)+field('notes','家人意见（可以补充链接）','','textarea',true)}
 else {fields=field('model','候选品牌 / 型号',it.model||'')+selectField('stage','采购 / 安装阶段',it.stage||'待开始',stages)+field('budget','目标预算（元）',it.budget||0,'number',false,'min="0"')+field('quoted','商家报价（元）',it.quoted||0,'number',false,'min="0"')+field('paid','已支付金额（元）',it.paid||0,'number',false,'min="0"')+selectField('fit','尺寸 / 功能是否适配',it.fit||'未测量',['未测量','待核实','已适配','不适配'])+field('size','机身尺寸 / 家具规格',it.size||'')+field('owner','负责人',it.owner||'')+field('planned','计划月份 YYYY-MM',it.planned||'')+field('source','商品链接 / 参考来源',it.source||'','url',true)+field('spec','材料、功能与选购标准',it.spec||'','textarea',true)+field('risk','安装避坑 / 待确认事项',it.risk||'','textarea',true)+field('notes','家人意见 / 实测记录',it.notes||'','textarea',true)}
 $('#editFields').innerHTML=fields+field('submittedBy','提交人称呼','','text',true);
 $('#editDialog').dataset.optional=optional?'true':'false';$('#editDialog').showModal();
}
function collectChange(){
 const optional=$('#editDialog').dataset.optional==='true',base=(optional?live.optional:live.items).find(x=>x.id===selectedId),inputs=new FormData($('#editForm')),changes={};
 const fields=optional?['model','min','max','reason','notes']:['model','stage','budget','quoted','paid','fit','size','owner','planned','source','spec','risk','notes'];
 for(const k of fields){let v=String(inputs.get(k)||'').trim();if(['budget','quoted','paid','min','max'].includes(k))v=Math.max(0,Math.round(Number(v)||0));if(String(base[k]??'')!==String(v))changes[k]=v;}
 const previous=Object.fromEntries(Object.keys(changes).map(k=>[k,base[k]??'']));
 return {kind:'renovation_change_v1',id:selectedId,optional,changes,base:previous,submittedBy:String(inputs.get('submittedBy')||'').trim()||'家人',comment:String(inputs.get('notes')||'').trim()};
}
function issueText(change){const payload=JSON.stringify(change,null,2);return `## 家庭装修项目修改建议\n\n项目编号：${change.id}\n提交人：${change.submittedBy}\n\n请管理员核实报价、尺寸、适配与阶段；同意后添加「采纳更新」标签。\n\n\`\`\`json\n${payload}\n\`\`\`\n`}
function submitChange(){
 if(!$('#editForm').reportValidity())return;const req=collectChange();if(Object.keys(req.changes).length===0){alert('还没有修改任何字段。请填写新的报价、状态或意见。');return;}
 if(!validRepo(repo)){$('#editDialog').close();$('#repoInput').value='';$('#settingsDialog').showModal();alert('请先设置 GitHub 仓库 OWNER/REPO。您也可以先本地试改。');return;}
 const title=`[装修建议] ${req.id} ${getItems().find(x=>x.id===req.id)?.name||(live.optional||[]).find(x=>x.id===req.id)?.name||''}`;
 const url=`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(issueText(req))}`;
 window.open(url,'_blank','noopener,noreferrer');$('#editDialog').close();
}
function previewChange(){if(!$('#editForm').reportValidity())return;const req=collectChange();if(Object.keys(req.changes).length===0){alert('还没有需要预览的更改。');return;}
 if(req.optional){alert('建议购买项请使用 GitHub 提交审核，离线预览只支持基础采购项目。');return;}
 localMods[req.id]={...(localMods[req.id]||{}),...req.changes};setStoredPreview();$('#editDialog').close();render();alert('本机预览已应用。此修改只保存在当前浏览器，未同步给任何家人。');
}
async function refresh(){
 try{const res=await fetch(`renovation.json?v=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw Error('读取失败');const fresh=await res.json();if(!Array.isArray(fresh.items)||!Array.isArray(fresh.optional))throw Error('数据格式错误');live=fresh;$('#syncState').textContent=`已读取共享数据 · ${live.updated||'最新'}`}
 catch(e){$('#syncState').textContent=`离线预览数据 · ${live.updated||''}`}
 repo=rememberRepo();render();
}
window.addEventListener('click',ev=>{
 const tab=ev.target.closest('[data-tab]');if(tab){openTab(tab.dataset.tab);return;}
 const mod=ev.target.closest('[data-open]');if(mod){openTab(mod.dataset.open);return;}
 const edit=ev.target.closest('[data-edit]');if(edit){openEdit(edit.dataset.edit,false);return;}
 const opt=ev.target.closest('[data-optional]');if(opt){openEdit(opt.dataset.optional,true);return;}
 if(ev.target.matches('#quickSettings,#settingsBtn')){$('#repoInput').value=repo;$('#settingsDialog').showModal()}
 if(ev.target.matches('#refreshBtn'))refresh();
});
$$('[data-close]').forEach(el=>el.addEventListener('click',()=>$('#'+el.dataset.close).close()));
$('#clearPreview').addEventListener('click',()=>{localMods={};setStoredPreview();$('#settingsDialog').close();render();alert('已清除仅本机可见的试改；网页仍以共享数据为准。')});
$('#saveRepo').addEventListener('click',()=>{
 const v=$('#repoInput').value.trim();if(location.hostname.endsWith('.github.io')){alert('在线网站已自动绑定当前仓库。');return;}if(v&&!validRepo(v)){alert('格式应为 GitHub用户名/仓库名，例如 family/renovation-board');return;}
 repo=v;try{localStorage.setItem('renovation_repo',repo)}catch{}$('#settingsDialog').close();render();
});
$('#sendChange').addEventListener('click',submitChange);
$('#previewChange').addEventListener('click',previewChange);
window.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[data-open]')){ev.preventDefault();openTab(ev.target.dataset.open)}});
window.addEventListener('input',ev=>{if(ev.target.id==='searchItems'){filterText=ev.target.value;const selection=ev.target.selectionStart;render();const input=$('#searchItems');input?.focus();if(input)input.setSelectionRange(selection,selection)}});
window.addEventListener('change',ev=>{if(ev.target.id==='stageFilter'){filterStage=ev.target.value;render()}});
localMods=getStoredPreview();repo=rememberRepo();refresh();
setInterval(()=>{if(!document.hidden&&!$('#editDialog').open&&!$('#settingsDialog').open)refresh()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('#editDialog').open)refresh()});
})();
