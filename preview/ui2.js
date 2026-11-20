// ===== หน้าตาใหม่ (ตัวอย่าง) — โหลดต่อจาก app.js แล้วแทนที่ฟังก์ชันหน้าจอ =====
let CF={mine:false,hl:false,up:false};
const myU=()=>isCo()?ME:S.me.unit;
const wide=()=>innerWidth>=900;
const mName=ym=>{const[y,m]=ym.split('-').map(Number);return TM[m-1]+' '+(y+543)};
const sd=s=>{const d=parse(s);return `${TDS[d.getUTCDay()]}. ${d.getUTCDate()} ${TMS[d.getUTCMonth()]}`};
const wkStart=d=>addD(d,-((dow(d)+6)%7));
const uTag=(id,sm)=>id&&U[id]?`<span class="u2${sm?' sm':''}" style="background:${U[id].c}">${id}.</span>`:'';

// สถานะเอกสารของงานดับไฟ เป็นคำธรรมดา
function stOf(e){const a=attInfo(e);
  if(e.start>TODAY)return a.inv.length?{t:'✓ เชิญแล้ว',c:'ok'}:{t:'ขาดหนังสือเชิญ',c:'bad'};
  if(a.done)return {t:'✓ ครบ',c:'ok'};
  return {t:`ค่าแรง ${a.cov.length}/${a.need.length}`,c:'warn'}}
const stTag=e=>{const s=stOf(e);return `<span class="st2 ${s.c}">${s.t}</span>`};

// ---------- งานที่ต้องทำของหน่วย ----------
function todos(u){const out=[];const c=CFG&&S.active?CFG():null;
  if(c&&c.status==='open'&&!allDone()&&curUnit()===u&&rank()>=2)
    out.push({lv:'hot',ic:'✋',t:'ถึงคิวหน่วยคุณเลือกวันดับไฟ',s:`เดือน ${mName(S.active)} · เลือกได้ ${QT(c,u)} วัน${c.deadline?' · ปิดรับ '+sd(c.deadline):''}`,b:`<button class="btn pri" onclick="go('book')">เลือกวัน</button>`});
  // คำขอสลับวันแสดงในการ์ด "ขอเปลี่ยนแผน" ด้านบนอยู่แล้ว
  EV.filter(e=>e.type==='O'&&e.unit===u&&e.start>TODAY&&e.start<=addD(TODAY,45)&&!attInfo(e).inv.length).sort((a,b)=>a.start<b.start?-1:1)
    .forEach(e=>out.push({lv:'bad',ic:'✉️',t:'แนบหนังสือเชิญ',s:`ดับไฟ ${sd(e.start)} · ${esc(e.title)}`,b:`<label class="btn pri">แนบไฟล์<input type="file" multiple hidden onchange="attUp('${e.id}','inv',this,'${e.start}')"></label>`}));
  EV.filter(e=>e.type==='O'&&e.unit===u&&e.start<=TODAY&&e.start>=addD(TODAY,-60)&&!attInfo(e).done).sort((a,b)=>a.start<b.start?-1:1)
    .forEach(e=>{const a=attInfo(e);out.push({lv:'warn',ic:'💰',t:'ส่งค่าแรงให้หน่วยที่มาช่วย',s:`งาน ${sd(e.start)} · ส่งแล้ว ${a.cov.length}/${a.need.length} หน่วย`,b:`<button class="btn pri" onclick="dayClick('${e.start}')">แนบไฟล์</button>`})});
  if(isCo()){const w=HLR().filter(r=>r.st==='wait_admin').length;if(w)out.push({lv:'hot',ic:'👑',t:`คำขอเปลี่ยนแผนรออนุมัติ ${w} รายการ`,s:'ผ่านการยินยอมของหน่วยคู่สลับแล้ว',b:`<button class="btn pri" onclick="document.querySelector('main').scrollTop=0">ดูด้านบน</button>`});
    const p=(S.users||[]).filter(x=>x.status==='pending').length;if(p)out.push({lv:'hot',ic:'👤',t:`ผู้ใช้ใหม่รออนุมัติ ${p} คน`,s:'กำหนดสิทธิ์ในหน้าแอดมิน',b:`<button class="btn pri" onclick="go('set')">ไปอนุมัติ</button>`})}
  return out}
const todoHtml=l=>l.length?l.map(x=>`<div class="td ${x.lv}"><div class="ic">${x.ic}</div><div class="tx"><b>${x.t}</b><div>${x.s}</div></div>${x.b}</div>`).join('')
  :`<div class="td ok"><div class="ic">✅</div><div class="tx"><b>ไม่มีงานค้าง</b><div>เอกสารของหน่วยคุณครบแล้ว</div></div></div>`;

// ---------- หน้าแรก ----------
function vHome(){const u=myU();const T=todos(u);const lim=addD(TODAY,14);
  const help=EV.filter(e=>e.type==='O'&&e.unit!==u&&e.start>=TODAY&&e.start<=lim&&attNeed(e).includes(u)).sort((a,b)=>a.start<b.start?-1:1);
  const mine=EV.filter(e=>e.type==='O'&&e.unit===u&&e.start>=TODAY).sort((a,b)=>a.start<b.start?-1:1).slice(0,4);
  const ws=wkStart(TODAY),we=addD(ws,6);const hl=EV.filter(e=>e.type==='L'&&e.end>=ws&&e.start<=we).sort((a,b)=>a.start<b.start?-1:1);
  const row=(e,right)=>`<div class="lr" onclick="dayClick('${e.start}')"><div class="dt"><small>${TDS[dow(e.start)]}.</small><b>${+e.start.slice(8)}</b><small>${TMS[+e.start.slice(5,7)-1]}</small></div>${uTag(e.unit)}<div class="sp tt">${esc(e.title)}</div>${right}</div>`;
  document.getElementById('view').innerHTML=`
  <div class="hello"><div><small>${U[u]?.name||''}</small><b>สวัสดีครับ คุณ${esc(S.me.name)}</b></div><span>${thDate(TODAY)}</span></div>
  <div class="card c2"><div class="h2 ${T.length?'red':''}">${T.length?`ต้องทำ ${T.length} เรื่อง`:'งานที่ต้องทำ'}</div>${todoHtml(T)}</div>
  ${help.length?`<div class="card c2"><div class="h2">หน่วยคุณไปช่วยงาน (2 สัปดาห์นี้)</div>${help.map(e=>{const a=attInfo(e);return row(e,a.inv.length?`<a class="lk" href="${fView(a.inv[0].fileId)}" target="_blank" onclick="event.stopPropagation()">หนังสือเชิญ ›</a>`:`<span class="st2 mute">รอหนังสือเชิญ</span>`)}).join('')}</div>`:''}
  <div class="card c2"><div class="h2">งานดับไฟของหน่วยคุณ</div>${mine.length?mine.map(e=>row(e,stTag(e))).join(''):'<div class="note" style="padding:6px 2px">ยังไม่มีงานที่จะถึง</div>'}</div>
  ${hl.length?`<div class="card c2"><div class="h2">⚡ กบ.06 สัปดาห์นี้</div><div class="note" style="font-size:14px;line-height:1.7">${hlSum(hl)}</div></div>`:''}
  <div class="qk"><button onclick="go('cal')"><span>📅</span>ปฏิทินทั้งเดือน</button><button onclick="hlPick()"><span>🔁</span>ขอเปลี่ยนแผน</button></div>`;
}
function hlSum(list){return list.map(e=>{const r=e.start===e.end?sd(e.start):`${sd(e.start)}–${sd(e.end)}`;return `<div>• ${r} → ${esc(e.title)}</div>`}).join('')}

// ---------- ปฏิทิน (หน้าแรก เหมือนเดิม + แถบต้องทำ) ----------
let CV='grid',TDALL=false;
function setCM(m){CM=m;vCal()}
function cfT(k){CF[k]=!CF[k];vCal()}
const keep=e=>{if(e.type==='O')return !CF.mine||e.unit===myU();return 'HTM'.includes(e.type)||(e.type==='L'&&CF.hl)};
const rk={H:0,O:1,T:2,M:3,L:4};
const dotOf=e=>`<i class="sd ${stOf(e).c}"></i>`;
function vCal(){const u=myU();const days=monthDays(CM);const T=todos(u);const mob=!wide();
  let h=hlCard();
  if(T.length)h+=`<div class="card c2 tdc"><div class="h2 red">⚠ ต้องทำ ${T.length} เรื่อง</div>${todoHtml(TDALL||mob===false?T:T.slice(0,3))}${mob&&!TDALL&&T.length>3?`<button class="btn" style="width:100%;justify-content:center;margin-bottom:8px" onclick="TDALL=true;vCal()">ดูอีก ${T.length-3} เรื่อง ▾</button>`:''}</div>`;
  h+=`<div class="card">${monthNav(CM,'setCM')}
   <div class="chips"><button class="${CF.mine?'':'on'}" onclick="CF.mine=false;vCal()">ทุกหน่วย</button><button class="${CF.mine?'on':''}" onclick="CF.mine=true;vCal()">เฉพาะหน่วยฉัน</button>
   <button class="tg2 ${CF.hl?'on':''}" onclick="cfT('hl')">${CF.hl?'✓ ':'+ '}กบ.06</button><button class="tg2 ${CF.up?'on':''}" onclick="cfT('up')">${CF.up?'✓ ':'+ '}แผนหน่วย</button>
   ${mob?`<span class="sp"></span><button class="${CV==='grid'?'on':''}" onclick="CV='grid';vCal()">ตาราง</button><button class="${CV==='list'?'on':''}" onclick="CV='list';vCal()">รายการ</button>`:''}</div>
   <div class="lg2"><span><i class="sd ok"></i>เอกสารครบ</span><span><i class="sd bad"></i>ขาดหนังสือเชิญ</span><span><i class="sd warn"></i>ค่าแรงยังไม่ครบ</span></div></div>`;
  if(mob&&CV==='list'){h+=calList(days,u)}
  else{const cell=d=>{const ev=evOn(d).filter(keep).sort((a,b)=>rk[a.type]-rk[b.type]);const w=[0,6].includes(dow(d));const ups=CF.up?upOn(d):[];
      return `<div class="d d2 ${w?'we':''} ${ev.some(e=>e.type==='H')?'hol':''} ${d===TODAY?'today':''}" onclick="dayClick('${d}')"><div class="num">${+d.slice(8)}</div>${ev.map(e=>
        e.type==='O'?(mob?`<div class="eo m" style="background:${U[e.unit]?.c}">${dotOf(e)}${e.unit}.</div>`:`<div class="eo" style="background:${U[e.unit]?.c}"><b>${e.unit}.</b> ${esc(e.title)}</div>${stTag(e)}`):
        e.type==='H'?`<div class="eh">${mob?'หยุด':esc(e.title)}</div>`:e.type==='L'?`<div class="el">⚡${mob?'06':' '+esc(e.title)}</div>`:`<div class="em">${e.type==='T'?'🎓':'🗓'}${mob?'':' '+esc(e.title)}</div>`).join('')}
        ${ups.map(x=>`<div class="eu" style="border-color:${U[x.unit]?.c}">${x.unit}.${mob?'':' '+esc(x.title)}</div>`).join('')}</div>`};
    h+=calGrid(CM,cell)}
  document.getElementById('view').innerHTML=h+`<p class="note">แตะวันที่เพื่อดูรายละเอียด แนบหนังสือเชิญ/ค่าแรง และแนบรูปหน้างาน</p>`;
}
function calList(days,u){let h='';let any=false;
  [...new Set(days.map(wkStart))].forEach(ws=>{const dd=days.filter(d=>d>=ws&&d<=addD(ws,6));
    const hl=EV.filter(e=>e.type==='L'&&e.end>=dd[0]&&e.start<=dd[dd.length-1]).sort((a,b)=>a.start<b.start?-1:1);let rows='';
    dd.forEach(d=>{const ev=evOn(d).filter(e=>keep(e)&&e.type!=='L').sort((a,b)=>rk[a.type]-rk[b.type]);const ups=CF.up?upOn(d):[];if(!ev.length&&!ups.length)return;any=true;
      rows+=`<div class="lr ${d===TODAY?'now':''}" onclick="dayClick('${d}')"><div class="dt"><small>${TDS[dow(d)]}.</small><b>${+d.slice(8)}</b>${d===TODAY?'<small class="tdy">วันนี้</small>':''}</div><div class="sp">${ev.map(e=>
        e.type==='O'?`<div class="li">${uTag(e.unit,1)}<span class="sp tt">${esc(e.title)}</span>${stTag(e)}</div>`:`<div class="li"><span class="${e.type==='H'?'eh':'em'}">${e.type==='H'?'🔴 ':e.type==='T'?'🎓 ':'🗓 '}${esc(e.title)}</span></div>`).join('')}
        ${ups.map(x=>`<div class="li"><span class="eu" style="border-color:${U[x.unit]?.c}">แผน ${x.unit}. ${esc(x.title)}</span></div>`).join('')}</div></div>`});
    if(!rows)return;
    h+=`<div class="wk"><div class="wkh">${sd(dd[0])} – ${sd(dd[dd.length-1])}</div>${hl.length?`<div class="wkl">⚡ กบ.06 ${CF.hl?hlSum(hl):`${hl.length} รายการ <a href="#" onclick="cfT('hl');return false">ดู</a>`}</div>`:''}${rows}</div>`});
  return any?h:`<div class="card note">ไม่มีงานในเดือนนี้</div>`}

// ---------- รายละเอียดวัน ----------
function step(n,ok,t,sub,body,right){return `<div class="stp ${ok===true?'ok':ok===false?'bad':''}"><div class="sh"><i>${ok===true?'✓':n}</i><div class="sp"><b>${t}</b><div class="note">${sub}</div></div>${right||''}</div>${body||''}</div>`}
function oCard(e,d){const a=attInfo(e);const own=true;const host=isCo()||S.me.unit===e.unit;const mine=(e.unit===S.me.unit&&rank()>=2)||isPlanner();const sk=(S.skips&&S.skips[e.id])||[];
  const s1=step(1,a.inv.length?true:(e.start>TODAY?false:null),'หนังสือเชิญ / โทรสาร',a.inv.length?`แนบแล้ว ${a.inv.length} ไฟล์`:(host?'ยังไม่แนบ · หน่วยอื่นรอดาวน์โหลด':`รอ ${e.unit}. แนบ`),
    a.inv.map(f=>attRow(f,d)).join(''),`<label class="btn ${a.inv.length?'':'pri'}">${a.inv.length?'+ เพิ่ม':'แนบไฟล์'}<input type="file" multiple hidden onchange="attUp('${e.id}','inv',this,'${d}')"></label>`);
  const pre=e.start>TODAY;
  const chips=`<div class="hchips">${UNITS.filter(x=>x.id!==e.unit).map(x=>{const off=sk.includes(x.id),ok=a.cov.includes(x.id);return `<span class="hc ${off?'off':ok?'ok':'wait'}">${off?'—':ok?'✓':''}${x.id}.${host?`<button title="${off?'คืนหน่วยนี้':'ไม่ได้มาช่วย'}" onclick="attSkip('${e.id}','${x.id}',${!off},'${d}')">${off?'↺':'✕'}</button>`:''}</span>`}).join('')}</div>`;
  const up=a.all?`<label class="btn">+ เพิ่ม<input type="file" multiple hidden onchange="attUp('${e.id}','wage',this,'${d}','all')"></label>`:
    `<div class="wup"><select id="wTo_${e.id}"><option value="all">ไฟล์เดียวรวมทุกหน่วย</option>${a.need.filter(id=>!a.cov.includes(id)).map(id=>`<option value="${id}">ของ ${U[id].name}</option>`).join('')}</select><label class="btn ${pre?'':'pri'}">แนบไฟล์<input type="file" multiple hidden onchange="attUp('${e.id}','wage',this,'${d}')"></label></div>`;
  const s2=step(2,a.done?true:(pre?null:false),'ค่าแรงหน่วยที่มาช่วย',pre?`หลังเสร็จงาน · ${a.need.length} หน่วย`:`ส่งแล้ว ${a.cov.length}/${a.need.length} หน่วย${sk.length?' · ไม่ได้มา '+sk.length:''}`,
    (pre?'':chips)+a.wage.map(f=>attRow(f,d)).join('')+(a.done&&!a.all?'':up)+(host&&pre?`<details class="mini"><summary>ตัดหน่วยที่ไม่ได้มาช่วย</summary>${chips}</details>`:''));
  return `<div class="dz"><div class="dzh">${uTag(e.unit)} <b>ดับไฟระดมทีม</b><div class="tt2">${esc(e.title)}</div>${e.crew?`<div class="note">ทีม/อุปกรณ์: ${esc(e.crew)}${e.hl?' · ⚡ ขอ กบ.06 ช่วย':''}</div>`:''}</div>
   ${s1}${s2}${thumbs(e.photos,'ev',e.id,mine||isCo(),d)}
   <div class="ft">${mine?`<label>📷 แนบรูป<input type="file" accept="image/*" multiple hidden onchange="addPhoto('${e.id}',this,'${d}')"></label>`:''}${(()=>{const hb=hlBtn(e,d);const b=hb.match(/<button[\s\S]*?<\/button>/);return b?b[0].replace('class="btn"','class="lnk"'):hb?'<span class="note">'+hb.replace(/<[^>]+>/g,'')+'</span>':''})()}
   ${(mine||isCo())?`<details class="mini"><summary>⋯ อื่นๆ</summary><div class="row" style="margin-top:6px">${mine?`<button class="btn" onclick="editEv('${e.id}')">✏️ แก้รายละเอียด</button>`:''}${isCo()?`<button class="btn" style="color:#b91c1c" onclick="delEv('${e.id}')">🗑 ลบงานนี้</button>`:''}</div></details>`:''}</div></div>`}
function dayClick(d){
  if(TAB==='book')return bookClick(d);
  const ev=evOn(d).filter(e=>'OHTML'.includes(e.type)).sort((a,b)=>rk[a.type]-rk[b.type]);
  let h=`<div class="row"><h3 class="sp" style="margin:0">${thDate(d)}</h3><button class="btn ghost" onclick="closeSheet()">✕</button></div>`;
  if(!ev.length&&!upOn(d).length)h+=`<p class="note">ไม่มีงานในวันนี้</p>`;
  ev.forEach(e=>{if(e.type==='O')h+=oCard(e,d);
    else{const lab={H:['🔴','วันหยุด'],T:['🎓','อบรมทักษะ'],M:['🗓','ประชุม'],L:['⚡','กบ.06']}[e.type];
      h+=`<div class="dz sm"><div class="row"><span>${lab[0]}</span><b>${lab[1]}</b><span class="sp">${e.type==='L'?'ไป ':''}${esc(e.title)}</span>${e.start!==e.end?`<span class="note">${sd(e.start)}–${sd(e.end)}</span>`:''}</div>${e.type==='L'?hlBtn(e,d):''}${isPlanner()?`<div class="row" style="margin-top:4px"><button class="btn ghost" style="font-size:13px" onclick="delEv('${e.id}')">🗑 ลบ</button></div>`:''}</div>`}});
  upOn(d).forEach(x=>{h+=`<div class="dz sm" style="border:1px dashed ${U[x.unit]?.c||'#999'};cursor:pointer" onclick="upEdit('${x.id}')"><div class="row">${uTag(x.unit,1)}<b>แผนหน่วย</b><span class="sp">${esc(x.title)}</span><span class="note">${esc(x.kind)}</span></div></div>`});
  const add=[];if(canUp(S.me.unit))add.push(`<button class="btn" onclick="closeSheet();UPM='${d.slice(0,7)}';upEdit('','${d}')">+ งานในแผนหน่วย ${esc(S.me.unit)}.</button>`);
  if(isPlanner())add.push(...[['T','วันอบรม'],['M','วันประชุม'],['H','วันหยุด'],['L','กบ.06 ไปนอกพื้นที่'],['W','งานนอกแผน']].map(([k,t])=>`<button class="btn" onclick="adminAdd('${d}','${k}')">+ ${t}</button>`));
  if(add.length)h+=`<details class="mini" style="margin-top:6px"><summary>+ เพิ่มงานในวันนี้</summary><div class="row" style="margin-top:6px;flex-wrap:wrap">${add.join('')}</div></details>`;
  openSheet(h);
}

// ---------- เมนู (เหมือนเดิม) ----------
TAB='cal';
function renderNav(){
  const tabs=[['cal','📅','ปฏิทิน'],['up','📋','แผนหน่วย'],['book','✋','เลือกวัน'],['ana','📈','วิเคราะห์'],['rpt','🖨','รายงาน']];
  if(isPlanner())tabs.push(['set','⚙️',isCo()?'แอดมิน':'กำหนดเงื่อนไข']);
  if(TAB!=='hlp'&&!tabs.find(t=>t[0]===TAB))TAB='cal';const n=todos(myU()).length;
  document.getElementById('nav').innerHTML=tabs.map(([k,i,t])=>`<button class="${TAB===k?'on':''}" onclick="go('${k}')"><span class="ic">${i}</span>${t}${k==='cal'&&n?`<em class="dot">${n}</em>`:''}</button>`).join('');
}
function render(){if(!S||S.me.status!=='approved')return;renderNav();oaBar();({cal:vCal,up:vUp,book:vBook,rpt:vRpt,set:vSet,ana:vAna,hlp:vHlp})[TAB]()}
