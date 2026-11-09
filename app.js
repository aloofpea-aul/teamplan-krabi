/* แผนงานระดมทีม กฟจ.กระบี่ — หน้าเว็บ (GitHub Pages) */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyLaH9mPalvH2dlsyf2KxyBLOj1pACs_h2MtMc1zT9_EicbwhuzTXbhVUz7fqTotms/exec';
const LIFF_ID = '2012434791-fhYw5iOH';

const UNITS=[
 {id:'ผกส',name:'ผกส.กฟจ.กบ.',c:'#7c3aed'},
 {id:'ผปบ',name:'ผปบ.กฟจ.กบ.',c:'#0f766e'},
 {id:'อล',name:'ผปร.กฟส.อล.',c:'#2563eb'},
 {id:'คท',name:'ผปร.กฟส.คท.',c:'#ea580c'},
 {id:'หคง',name:'ผปร.กฟส.หคง.',c:'#16a34a'},
 {id:'กลต',name:'ผปร.กฟส.กลต.',c:'#0891b2'},
 {id:'ขพ',name:'ผปร.กฟส.ขพ.',c:'#c026d3'},
];
const U=Object.fromEntries(UNITS.map(u=>[u.id,u]));
const FIXED=2;
const ROLES={admin:'👑 แอดมินระบบ',coadmin:'🛡 โคแอดมิน',planner:'ผู้กำหนด',picker:'ผู้เลือกวัน',lead:'ผู้ลงแผนหน่วย',viewer:'ดูอย่างเดียว'};
const RANK={viewer:1,lead:1.5,picker:2,planner:3,coadmin:4,admin:5};
const TM=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TMS=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TD=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const TDS=['อา','จ','อ','พ','พฤ','ศ','ส'];
const thaiNum=s=>String(s).replace(/[0-9]/g,d=>'๐๑๒๓๔๕๖๗๘๙'[d]);
const pad=n=>String(n).padStart(2,'0');
const ds=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
const parse=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(Date.UTC(a,b-1,c))};
const fmt=dt=>ds(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
const dow=s=>parse(s).getUTCDay();
const addD=(s,n)=>{const d=parse(s);d.setUTCDate(d.getUTCDate()+n);return fmt(d)};
const thDate=s=>{const d=parse(s);return `${TD[d.getUTCDay()]} ${d.getUTCDate()} ${TMS[d.getUTCMonth()]} ${String(d.getUTCFullYear()+543).slice(2)}`};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const TODAY=(()=>{const d=new Date(Date.now()+7*3600e3);return d.toISOString().slice(0,10)})();
const nextMonth=ym=>{const[y,m]=ym.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${pad(m+1)}`};
const prevMonth=ym=>{const[y,m]=ym.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${pad(m-1)}`};
const photoUrl=id=>`https://drive.google.com/thumbnail?id=${id}&sz=w800`;

// ---------- state ----------
let S=null;          // ข้อมูลจากเซิร์ฟเวอร์
let EV=[];let ME='';let TAB='cal';let CM=TODAY.slice(0,7);let RPT=TODAY.slice(0,7);let RVIEW='sum';
let PICK=[];let SWP={mine:'',theirs:''};let SHOWX=false;let DRAFT=null;
let TOKEN=(()=>{try{return localStorage.getItem('tp_token')||''}catch(e){return''}})();
const rank=()=>RANK[S?.me?.role]||0;
const isCo=()=>rank()>=4;
const isPlanner=()=>isCo()||(S?.me?.role==='planner'&&['ผกส','ผปบ'].includes(S.me.unit));
const ACT=()=>S.active;const CFG=()=>S.rounds[S.active];
const LOG=()=>(S.picks||[]).filter(p=>p.month===S.active);

// ---------- API ----------
async function api(action,data={},quiet){
  if(!quiet)busy(true);
  try{
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action,token:TOKEN,...data})});
    const j=await r.json();
    if(!j.ok){
      if(j.error==='AUTH'){logout();throw new Error('กรุณาเข้าสู่ระบบใหม่')}
      throw new Error(j.error);
    }
    return j;
  }finally{if(!quiet)busy(false)}
}
async function reload(quiet){
  const j=await api('state',{},quiet);S=j;EV=j.events||[];
  try{localStorage.setItem('tp_cache',JSON.stringify(j))}catch(e){}
  if(!ME||!isCo())ME=S.me.unit;
  boot();
}
async function act(action,data,okMsg){
  try{await api(action,data);toast(okMsg||'บันทึกแล้ว');await reload(true)}catch(e){toast('⚠ '+e.message,4000)}
}
function busy(on){document.getElementById('busy').style.display=on?'flex':'none'}
function toast(t,ms=2400){const el=document.getElementById('toast');el.textContent=t;el.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.display='none',ms)}

// ---------- login (LINE) ----------
function logout(){TOKEN='';try{localStorage.removeItem('tp_token');localStorage.removeItem('tp_cache')}catch(e){}showLogin()}
function showLogin(msg){document.getElementById('login').style.display='flex';document.getElementById('loginMsg').innerHTML=msg||''}
const IS_PWA=(()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}})();
let PAIR_T=null;
function pairStart(){
  // แอปบนหน้าจอโฮม: ให้ไปล็อกอินในแอป LINE แล้วกลับมารับโทเคน (iPhone จะไม่ส่งการล็อกอินกลับเข้าแอปเอง)
  const code=Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'[b%55]).join('');
  try{localStorage.setItem('tp_pair',code)}catch(e){}
  window.open('https://liff.line.me/'+LIFF_ID+'?pair='+code,'_blank');
  showLogin('⏳ กำลังรอเข้าสู่ระบบใน LINE…<br><span style="color:#6b6274">กด "อนุญาต" ใน LINE แล้วกลับมาที่แอปนี้ ระบบจะเข้าให้เอง</span>');
  pairPoll();
}
async function pairPoll(){
  clearTimeout(PAIR_T);let code='';try{code=localStorage.getItem('tp_pair')||''}catch(e){}
  if(!code||TOKEN)return;
  try{const j=await api('pairCheck',{code},true);
    if(j.token){TOKEN=j.token;try{localStorage.setItem('tp_token',TOKEN);localStorage.removeItem('tp_pair')}catch(e){}
      document.getElementById('login').style.display='none';await reload();return}}catch(e){}
  PAIR_T=setTimeout(pairPoll,2500);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!TOKEN)pairPoll()});
async function pairFinish(code){
  // หน้านี้เปิดอยู่ในแอป LINE เพื่อยืนยันตัวตนให้แอปบนหน้าจอโฮม
  document.getElementById('login').style.display='flex';
  const msg=document.getElementById('loginMsg');
  try{
    if(!liff.isLoggedIn()){liff.login({redirectUri:location.href});return}
    await api('pairLogin',{idToken:liff.getIDToken(),code},true);
    document.querySelector('#login button').style.display='none';
    msg.style.color='#16a34a';msg.innerHTML='<b style="font-size:18px">✅ เข้าสู่ระบบสำเร็จ</b><br>กลับไปที่แอป "ระดมทีม" บนหน้าจอโฮมได้เลย';
    setTimeout(()=>{try{liff.closeWindow()}catch(e){}},2500);
  }catch(e){msg.textContent='⚠ '+e.message}
}
async function lineLogin(){
  try{
    if(IS_PWA){pairStart();return}
    if(!liff.isLoggedIn()){liff.login({redirectUri:location.origin+location.pathname});return}
    const idToken=liff.getIDToken();if(!idToken)throw new Error('ไม่ได้รับข้อมูลจาก LINE');
    const j=await api('login',{idToken});TOKEN=j.token;try{localStorage.setItem('tp_token',TOKEN)}catch(e){}
    document.getElementById('login').style.display='none';await reload();
  }catch(e){showLogin('⚠ '+esc(e.message))}
}
async function start(){
  const qs=new URLSearchParams(location.search);
  let pair=qs.get('pair')||new URLSearchParams((qs.get('liff.state')||'').replace(/^[^?]*\?/,'')).get('pair');
  if(pair){try{await liff.init({liffId:LIFF_ID})}catch(e){}
    pair=new URLSearchParams(location.search).get('pair')||pair;return pairFinish(pair)}
  if(IS_PWA&&!TOKEN){showLogin();pairPoll();try{await liff.init({liffId:LIFF_ID})}catch(e){}return}
  if(TOKEN){
    try{const c=JSON.parse(localStorage.getItem('tp_cache')||'null');if(c){S=c;EV=c.events||[];ME=S.me.unit;boot()}}catch(e){}
    reload(!!S).catch(e=>toast('⚠ '+e.message,4000));
  }else showLogin();
  try{await liff.init({liffId:LIFF_ID});
    if(!TOKEN&&liff.isLoggedIn())lineLogin();
  }catch(e){if(!TOKEN)showLogin('⚠ LINE: '+esc(e.message))}
}

// ---------- shell ----------
function boot(){
  document.getElementById('login').style.display='none';
  const p=document.getElementById('pending');
  if(S.me.status!=='approved'){p.style.display='flex';document.getElementById('pendName').textContent=S.me.name;return}
  p.style.display='none';
  const who=document.getElementById('who');
  if(isCo()){
    who.innerHTML=`<span>${esc(S.me.name)} · ${ROLES[S.me.role]} · ทำในนาม</span><select id="whoSel">${UNITS.map(u=>`<option value="${u.id}" ${u.id===ME?'selected':''}>${u.name}</option>`).join('')}</select>`;
    document.getElementById('whoSel').onchange=e=>{ME=e.target.value;PICK=[];SWP={mine:'',theirs:''};render()};
  }else who.innerHTML=`<span>${esc(S.me.name)} · ${S.me.unit?U[S.me.unit].name:'-'} · ${ROLES[S.me.role]||''}</span>`;
  render();
}
function renderNav(){
  const tabs=[['cal','📅','ปฏิทิน'],['up','📋','แผนหน่วย'],['book','✋','เลือกวัน'],['ana','📈','วิเคราะห์'],['rpt','🖨','รายงาน']];
  if(isPlanner())tabs.push(['set','⚙️',isCo()?'แอดมิน':'กำหนดเงื่อนไข']);
  if(!tabs.find(t=>t[0]===TAB))TAB='cal';
  document.getElementById('nav').innerHTML=tabs.map(([k,i,t])=>`<button class="${TAB===k?'on':''}" onclick="go('${k}')"><span class="ic">${i}</span>${t}</button>`).join('');
}
function go(t){TAB=t;render();document.querySelector('main').scrollTop=0}
function render(){if(!S||S.me.status!=='approved')return;renderNav();({cal:vCal,up:vUp,book:vBook,rpt:vRpt,set:vSet,ana:vAna})[TAB]()}

// ---------- helpers ----------
function evOn(date){return EV.filter(e=>date>=e.start&&date<=e.end)}
function monthDays(ym){const[y,m]=ym.split('-').map(Number);const n=new Date(Date.UTC(y,m,0)).getUTCDate();return Array.from({length:n},(_,i)=>ds(y,m,i+1))}
function lockReason(date,cfg=CFG()){
  const d=dow(date);const ev=evOn(date);
  if(!cfg.allowWeekend&&(d===0||d===6))return'เสาร์-อาทิตย์';
  if(ev.some(e=>e.type==='H'))return'วันหยุด';
  if(cfg.lockTraining&&ev.some(e=>e.type==='T'))return'วันอบรม';
  if(cfg.lockMeeting&&ev.some(e=>e.type==='M'))return'วันประชุม';
  const o=ev.filter(e=>e.type==='O');
  if(o.length)return'จองแล้ว: '+o.map(e=>e.unit+'.').join(',');
  return'';
}
function hlBusy(date){return evOn(date).filter(e=>e.type==='L')}
function hlUsed(unit,ym){return EV.filter(e=>e.type==='O'&&e.unit===unit&&e.start.startsWith(ym)&&e.hl).length}
function hlUnit(t){
  if(/ผกส/.test(t))return'ผกส';if(/ผปบ/.test(t))return'ผปบ';
  const m={อล:/อล\.|อ่าวลึก/,คท:/คท\.|คลองท่อม/,หคง:/หคง\.|เหนือคลอง/,กลต:/กลต\.|เกาะลันตา/,ขพ:/ขพ\.|เขาพนม/};
  for(const k in m)if(m[k].test(t))return k;return'นอก';
}
function shrink(file){return new Promise(res=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1280/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.78))};im.src=r.result};r.readAsDataURL(file)})}
async function filesToData(inp){const out=[];for(const f of [...(inp?.files||[])])out.push(await shrink(f));return out}

// ---------- calendar grid ----------
function calGrid(ym,cellFn){
  const days=monthDays(ym);const first=dow(days[0]);
  let h=TDS.map((t,i)=>`<div class="hd">${innerWidth>700?TD[i]:t}</div>`).join('');
  for(let i=0;i<first;i++)h+=`<div class="d out"></div>`;
  days.forEach(d=>h+=cellFn(d));
  const tail=(7-(first+days.length)%7)%7;for(let i=0;i<tail;i++)h+=`<div class="d out"></div>`;
  return `<div class="cal">${h}</div>`;
}
function evHtml(e){
  if(e.type==='H')return `<div class="ev H">${esc(e.title)}</div>`;
  if(e.type==='L')return `<div class="ev L">🔧 กบ.06 → ${esc(e.title)}</div>`;
  if(e.type==='O'){const u=U[e.unit]||{c:'#666'};
    return `<div class="ev" style="border-color:${u.c};background:${u.c}14">${e.photos.length?'<span class="cam">📷'+e.photos.length+'</span>':''}<b style="color:#d00">ดับไฟ</b> <b style="color:${u.c}">${esc(e.unit)}.</b><span class="long"> ${esc(e.title)}</span>${e.hl?' <span class="long">⚡ฮอตไลน์</span>':''}</div>`}
  const lab={T:'🎓 ',M:'🗓 ',W:'',P:'⏳ '}[e.type]||'';
  return `<div class="ev ${e.type}">${lab}${e.unit&&e.type!=='T'&&e.type!=='M'?'<b>'+esc(e.unit)+'.</b> ':''}<span class="long">${esc(e.title)}</span>${innerWidth<=700?esc(e.type==='T'?'อบรม':e.type==='M'?'ประชุม':e.type==='P'?'เตรียม':'งาน'):''}</div>`;
}
function dayCell(d,extraCls='',extra=''){
  const ev=evOn(d).filter(e=>SHOWX||!'WP'.includes(e.type));const hol=ev.some(e=>e.type==='H');const w=[0,6].includes(dow(d));
  const order={H:0,O:1,W:2,P:3,T:4,M:5,L:6};
  const sorted=[...ev].sort((a,b)=>order[a.type]-order[b.type]);
  const hl=ev.find(e=>e.type==='L');
  const ups=SHOWUP&&S?upOn(d):[];
  return `<div class="d ${w?'we':''} ${hol?'hol':''} ${d===TODAY?'today':''} ${extraCls}" onclick="dayClick('${d}')"><div class="num">${+d.slice(8)}</div>${sorted.map(evHtml).join('')}${ups.map(x=>upChip(x,d)).join('')}${hl?'<span class="hlDot">⚡06</span>':''}${extra}</div>`;
}
function monthNav(cur,setter){
  const [y,m]=cur.split('-').map(Number);
  return `<div class="row"><button class="btn" onclick="${setter}('${prevMonth(cur)}')">‹</button><div class="mtitle">${TM[m-1]} ${y+543}</div><button class="btn" onclick="${setter}('${nextMonth(cur)}')">›</button></div>`;
}
const legend=()=>`<div class="legend">${UNITS.map(u=>`<span><i style="background:${u.c}"></i>${u.id}.</span>`).join('')}<span><i style="background:var(--hol)"></i>วันหยุด PEA</span><span><i style="background:var(--tr)"></i>อบรมทักษะ</span><span><i style="background:var(--mt)"></i>ประชุม</span><span><i style="background:var(--hl)"></i>ฮอตไลน์ กบ.06</span><span><i style="background:transparent;border:1px dashed #6b6274"></i>แผนหน่วย (เส้นประ)</span></div>`;

// ---------- view: calendar ----------
function setCM(m){CM=m;vCal()}
function vCal(){
  document.getElementById('view').innerHTML=`
  <div class="card">${monthNav(CM,'setCM')}${legend()}
  <label class="note" style="margin-top:8px;display:flex;gap:8px;align-items:flex-start;cursor:pointer"><input type="checkbox" style="flex:none;width:18px;height:18px;margin:2px 0 0" ${SHOWX?'checked':''} onchange="SHOWX=this.checked;vCal()"><span>แสดงงานนอกแผนระดมทีม (งานที่แต่ละหน่วยจัดเอง — ไม่นับในระบบ)</span></label>
  <div class="row" style="margin-top:6px"><label class="note" style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" style="flex:none;width:18px;height:18px;margin:0" ${SHOWUP?'checked':''} onchange="SHOWUP=this.checked;vCal()"><span>แสดงแผนหน่วย${seeAllUp()?'':' '+esc(S.me.unit)+'.'}</span></label>
  ${seeAllUp()&&SHOWUP?`<select onchange="UPU=this.value;vCal()"><option value="">ทุกหน่วย</option>${UNITS.map(u=>`<option value="${u.id}" ${u.id===UPU?'selected':''}>${u.name}</option>`).join('')}</select>`:''}</div></div>
  ${calGrid(CM,d=>dayCell(d))}
  <p class="note">แตะวันที่เพื่อดูรายละเอียด และแนบรูปหน้างาน</p>`;
}
function dayClick(d){
  if(TAB==='book')return bookClick(d);
  const ev=evOn(d).filter(e=>SHOWX||!'WP'.includes(e.type));
  let h=`<div class="row"><h3 class="sp">${thDate(d)}</h3><button class="btn ghost" onclick="closeSheet()">✕</button></div>`;
  if(!ev.length&&!upOn(d).length)h+=`<p class="note">ไม่มีรายการ — ตามภาระหน้าที่</p>`;
  ev.forEach(e=>{
    const u=U[e.unit];const mine=(e.type==='O'&&e.unit===S.me.unit&&rank()>=2)||isPlanner();
    const canDel=e.type==='O'?isCo():isPlanner();
    const typ={H:'วันหยุด',O:'ดับไฟระดมทีม',W:'งานนอกแผน',P:'เตรียมงาน',T:'อบรมทักษะ',M:'ประชุม',L:'ฮอตไลน์ กบ.06'}[e.type];
    h+=`<div class="card" style="border:1px solid var(--line)">
      <div class="row"><span class="chip" style="background:${u?u.c:({H:'#dc2626',T:'#7c3aed',M:'#2563eb',L:'#b45309'}[e.type]||'#6b7280')}">${typ}</span>${u?'<b>'+u.name+'</b>':''}${e.start!==e.end?`<span class="note">${thDate(e.start)} – ${thDate(e.end)}</span>`:''}</div>
      <div style="margin-top:6px;font-size:15px">${e.type==='L'?'กบ.06 ไป ':''}${esc(e.title)}</div>
      ${e.crew?`<div class="note">ทีม/อุปกรณ์: ${esc(e.crew)}</div>`:''}
      ${e.hl?`<div class="note">⚡ ฮอตไลน์ กบ.06 ช่วยงาน</div>`:''}
      ${e.photos.length?`<div class="thumbs" style="margin-top:6px">${e.photos.map(p=>`<a href="https://drive.google.com/file/d/${p}/view" target="_blank"><img src="${photoUrl(p)}" loading="lazy"></a>`).join('')}</div>`:''}
      <div class="row" style="margin-top:8px">
      ${(e.type==='O'||e.type==='W')&&mine?`<label class="btn">📷 แนบรูป<input type="file" accept="image/*" multiple hidden onchange="addPhoto('${e.id}',this,'${d}')"></label>`:''}
      ${e.type==='O'&&mine?`<button class="btn" onclick="editEv('${e.id}')">✏️ แก้รายละเอียด</button>`:''}
      ${canDel?`<button class="btn" onclick="delEv('${e.id}')">🗑 ลบ</button>`:''}</div>
    </div>`;
  });
  const ups=upOn(d);
  ups.forEach(x=>{const cf=upConflict(x,d);h+=`<div class="card" style="border:1px dashed ${U[x.unit]?.c||'#999'};cursor:pointer" onclick="upEdit('${x.id}')"><div class="row"><span class="chip" style="background:#E1F5EE;color:#085041">แผนหน่วย ${esc(x.unit)}.</span><span class="note">${esc(x.kind)} · ${esc(x.status)}</span></div><div style="margin-top:6px">${esc(x.title)}</div>${x.crew?`<div class="note">ทีม: ${esc(x.crew)}</div>`:''}${cf?`<div class="note" style="color:#993C1D">⚠ ชนวันระดมทีม ${esc(cf.unit)}. ที่ขอ ${esc(cf.crew)}</div>`:''}</div>`});
  if(canUp(S.me.unit))h+=`<div class="row" style="margin-bottom:8px"><button class="btn" onclick="closeSheet();UPM='${d.slice(0,7)}';upEdit('','${d}')">+ งานในแผนหน่วย ${esc(S.me.unit)}.</button></div>`;
  if(isPlanner())h+=`<div class="row"><button class="btn" onclick="adminAdd('${d}','T')">+ วันอบรม</button><button class="btn" onclick="adminAdd('${d}','M')">+ วันประชุม</button><button class="btn" onclick="adminAdd('${d}','H')">+ วันหยุด</button><button class="btn" onclick="adminAdd('${d}','L')">+ กบ.06 ไปนอกพื้นที่</button><button class="btn" onclick="adminAdd('${d}','W')">+ งานนอกแผน</button></div>`;
  openSheet(h);
}
async function addPhoto(id,inp,d){const photos=await filesToData(inp);if(!photos.length)return;closeSheet();await act('addPhoto',{id,photos},'แนบรูปแล้ว '+photos.length+' รูป');}
function editEv(id){const e=EV.find(x=>x.id===id);
  openSheet(`<h3>แก้รายละเอียด ${thDate(e.start)}</h3><div class="f"><label>งาน / สถานที่</label><input id="eT" value="${esc(e.title)}"></div><div class="f"><label>ทีม / อุปกรณ์</label><input id="eC" value="${esc(e.crew)}"></div>
  <div class="row"><button class="btn" onclick="closeSheet()">ยกเลิก</button><span class="sp"></span><button class="btn pri" onclick="closeSheet();act('editEvent',{id:'${id}',title:document.getElementById('eT').value,crew:document.getElementById('eC').value})">บันทึก</button></div>`)}
function delEv(id){const e=EV.find(x=>x.id===id);
  openSheet(`<h3>ลบรายการนี้?</h3><p>${thDate(e.start)} — ${esc(e.unit?e.unit+'. ':'')}${esc(e.title)}</p><div class="row"><button class="btn" onclick="closeSheet()">ยกเลิก</button><span class="sp"></span><button class="btn" style="background:#dc2626;color:#fff" onclick="closeSheet();act('delEvent',{id:'${id}'},'ลบแล้ว')">ลบ</button></div>`)}
function adminAdd(d,type){
  const lab={T:'หัวข้ออบรม (เช่น อบรมทบทวนทักษะ คิว กฟส.อล.)',M:'หัวข้อประชุม',H:'ชื่อวันหยุด',L:'กบ.06 ไปที่ (เช่น กฟส.ป่าตอง)',W:'งานนอกแผน (เช่น ติดตั้ง SF6 กบ.309)'}[type];
  openSheet(`<h3>เพิ่มรายการ ${thDate(d)}</h3><div class="f"><label>${lab}</label><input id="aT"></div>
  ${type==='W'?`<div class="f"><label>หน่วยงาน</label><select id="aU">${UNITS.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select></div>`:''}
  <div class="f"><label>ถึงวันที่ (ถ้าหลายวัน)</label><input id="aE" type="date" value="${d}"></div>
  <div class="row"><button class="btn" onclick="closeSheet()">ยกเลิก</button><span class="sp"></span><button class="btn pri" onclick="adminSave('${d}','${type}')">บันทึก</button></div>`);
}
function adminSave(d,type){const t=document.getElementById('aT').value.trim();if(!t)return;const e=document.getElementById('aE').value||d;
  closeSheet();act('addEvent',{ev:{start:d,end:e<d?d:e,type,title:t,unit:document.getElementById('aU')?.value||''}})}
function openSheet(h){document.getElementById('sheet').innerHTML=h;document.getElementById('mask').classList.add('on')}
function closeSheet(){document.getElementById('mask').classList.remove('on')}

// ---------- view: booking ----------
function RO(c){return c.ro&&c.ro.length===c.order.length?c.ro:c.order}
function QT(c,id){const v=c.perRound[id];return v===undefined||v===null||v===''?1:+v}
function curUnit(){const c=CFG();return RO(c)[c.turn.idx]}
function allDone(){const c=CFG();return c.turn.round>c.rounds}
function vBook(){
  const v=document.getElementById('view');
  const c=S.active&&CFG();
  if(!c||c.status==='setup'){v.innerHTML=`<div class="card"><b>ยังไม่เปิดรอบเลือกวัน</b><p class="note">ผกส./ผปบ. จะเปิดรอบเลือกวันของเดือนถัดไป แล้วระบบจะแจ้งให้ทราบ</p>${isPlanner()?'<button class="btn pri" onclick="go(\'set\')">ไปตั้งค่ารอบ</button>':''}</div>`;if(!c||!(ADM&&isCo())){if(c&&isCo())v.innerHTML+=admCard();return}}
  const ym=S.active;const [y,m]=ym.split('-').map(Number);
  const done=c.status!=='open';const cu=done?'':curUnit();
  const canPick=rank()>=2;const myTurn=!done&&cu===ME&&canPick&&(ME===S.me.unit||isCo());const quota=QT(c,cu);
  const log=LOG();
  let q='';
  for(let r=1;r<=c.rounds;r++){
    q+=`<div class="note" style="margin:6px 0 4px">รอบที่ ${r}</div><div class="queue">`;
    const ord=(!done&&c.turn.round===r)?RO(c):c.order;
    ord.forEach((id,i)=>{const u=U[id];
      const lg=log.find(l=>l.unit===id&&l.round===r);
      const now=!done&&c.turn.round===r&&c.turn.idx===i;
      const zero=QT(c,id)<=0;const st=lg?'✔ '+lg.dates.map(x=>+x.slice(8)).join(', ')+' '+TMS[m-1]:now?'⏳ กำลังเลือก':zero?'— ข้าม (0 วัน)':'รอคิว';
      q+=`<div class="q ${now?'now':''} ${lg?'done':''}" ${zero&&!lg?'style="opacity:.45"':''}><div class="n">ลำดับ ${i+1}${i<FIXED?' 🔒':''} · ได้ ${QT(c,id)} วัน</div><b style="color:${u.c}">${u.name}</b><div class="st">${st}</div></div>`;
    });q+='</div>';
  }
  q+=`<div class="note" style="margin:6px 0 4px">ขั้นสุดท้าย</div><div class="queue"><div class="q ${c.status==='swap'?'now':''}"><b>🔁 ขอแลกวันกันได้</b><div class="st">${c.status==='swap'?'เปิดแล้ว':c.status==='published'?'ปิดแล้ว':'เปิดเมื่อครบทุกรอบ'}</div></div><div class="q ${c.status==='published'?'now':''}"><b>📢 ประกาศแผน</b><div class="st">${c.status==='published'?'ประกาศแล้ว':'โดย ผกส./ผปบ.'}</div></div></div>`;
  let ban;
  if(c.status==='published')ban=`<div class="banner turn">📢 ประกาศแผนเดือนนี้แล้ว</div>`;
  else if(done)ban=`<div class="banner turn">✅ ทุกหน่วยเลือกครบแล้ว — ขอแลกวันกับหน่วยอื่นได้ (อีกฝ่ายต้องกดยอมรับ)</div>`;
  else if(myTurn)ban=`<div class="banner turn">ถึงคิว ${U[ME].name} แล้ว — ต้องเลือกให้ครบ ${quota} วัน (รอบที่ ${c.turn.round}) · เลือกแล้ว ${PICK.length}/${quota}<br><span style="font-weight:400;font-size:13px">หน่วยถัดไปจะเลือกได้เมื่อคุณยืนยันแล้ว · ยังไม่พร้อม? ยกคิวให้หน่วยถัดไปก่อนได้</span><div style="margin-top:8px"><button class="btn" onclick="yieldTurn()">⏭ ให้หน่วยถัดไปเลือกก่อน</button></div></div>`;
  else ban=`<div class="banner wait">รอ <b style="color:${U[cu].c}">${U[cu].name}</b> เลือก (รอบที่ ${c.turn.round})${canPick?'':' · คุณมีสิทธิ์ดูอย่างเดียว'}</div>`;
  const hlLeft=(c.hlQuota[ME]||0)-hlUsed(ME,ym);
  v.innerHTML=`
  <div class="card">
    <div class="row"><b style="font-size:16px">เลือกวันดับไฟระดมทีม เดือน${TM[m-1]} ${y+543}</b><span class="sp"></span>${c.deadline?`<span class="note">ปิดรับ ${thDate(c.deadline)}</span>`:''}<button class="btn" onclick="reload().catch(e=>toast(e.message))">🔄</button></div>
    ${q}
  </div>
  ${admCard()}
  ${ADM&&isCo()?'':ban}
  ${c.status==='swap'&&!ADM?swapPanel():''}
  <div class="card"><div class="row"><b>ปฏิทิน ${TM[m-1]} ${y+543}</b><span class="sp"></span><span class="note">🟩 เลือกได้ · ▨ ล็อก · 🟨 ที่กำลังเลือก</span></div>
  <div class="note" style="margin-top:4px">สิทธิ์ฮอตไลน์ กบ.06 ของ ${ME}. เดือนนี้: เหลือ ${Math.max(0,hlLeft)} / ${c.hlQuota[ME]||0} วัน (ขอพร้อมกับตอนเลือกวัน)</div></div>
  ${calGrid(ym,d=>{
    const why=lockReason(d,c);const sel=PICK.find(p=>p.date===d)||SWP.mine===d||SWP.theirs===d;
    const booked=why.startsWith('จองแล้ว');
    const cls=sel?'sel':why?(done&&booked?'':'lk'):((myTurn||(ADM&&isCo()))?'av':'');
    return dayCell(d,cls,why&&!sel&&!(done&&booked)?`<div class="why">🔒 ${esc(why)}</div>`:'');
  })}
  ${myTurn&&upMobPending(ME).length?`<div class="card"><b>📋 งานในแผนหน่วย ${ME}. ที่ขอระดมทีม (ยังไม่ได้วัน)</b>${upMobPending(ME).map(x=>`<div class="note" style="margin-top:4px">• ${esc(x.title)} — อยากได้ประมาณ ${thDate(x.start)}${x.crew?' · '+esc(x.crew):''}</div>`).join('')}<div class="note" style="margin-top:6px">แตะวันว่างในปฏิทิน แล้วเลือกงานจากรายการนี้ได้เลย</div></div>`:''}
  ${myTurn&&!ADM?`<div class="card" style="margin-top:12px">
    ${PICK.length?PICK.map((p,i)=>`<div class="row" style="border-bottom:1px solid var(--line);padding:6px 0"><b>${thDate(p.date)}</b><span>${esc(p.title)}</span><span class="note">${esc(p.crew)}</span>${p.hl?'⚡ฮอตไลน์':''}${p.photos.length?' 📷'+p.photos.length:''}<span class="sp"></span><button class="btn" onclick="PICK.splice(${i},1);vBook()">ลบ</button></div>`).join(''):'<span class="note">แตะวันสีเขียวเพื่อเลือก</span>'}
    <div class="row" style="margin-top:10px"><span class="sp"></span><button class="btn ok" ${PICK.length===quota?'':'disabled'} onclick="confirmPick()">ยืนยัน ${PICK.length}/${quota} วัน → ส่งคิวถัดไป</button></div>
  </div>`:''}`;
}
let ADM=false;
function admCard(){return isCo()?`<div class="card" style="border:2px solid ${ADM?'#d97706':'transparent'}"><label class="row"><input type="checkbox" ${ADM?'checked':''} onchange="ADM=this.checked;PICK=[];vBook()"> <b>👑 ลงวันแทนหน่วยงาน (แอดมิน/โคแอดมิน) — ไม่ต้องรอคิว</b></label>
  ${ADM?`<div class="seg" style="margin-top:8px;flex-wrap:wrap">${UNITS.map(u=>`<button class="${ME===u.id?'on':''}" onclick="ME='${u.id}';const w=document.getElementById('whoSel');if(w)w.value=ME;vBook()">${u.name.replace(/^ผปร\.กฟส\.|\.กฟจ\.กบ\./g,'')}</button>`).join('')}</div>
  <div class="note" style="margin-top:6px">แตะวันว่างในปฏิทิน → กรอกงาน → บันทึกทันทีในนาม <b style="color:${U[ME].c}">${U[ME].name}</b> · ไม่ใช้คิว ไม่ตัดจำนวนวันของรอบ ไม่เลื่อนคิว · หน่วยนั้นได้แจ้งเตือน LINE</div>`:''}</div>`:''}
function bookClick(d){
  const c=CFG();const adm=ADM&&isCo();
  if(!adm&&c.status==='swap')return swapClick(d);
  if(!adm&&c.status!=='open')return;
  const cu=curUnit();if(!adm&&(cu!==ME||rank()<2)){const why=lockReason(d,c);toast(why?('🔒 '+why):'ยังไม่ถึงคิวของคุณ');return}
  if(PICK.find(p=>p.date===d)){PICK=PICK.filter(p=>p.date!==d);return vBook()}
  const why=lockReason(d,c);if(why)return toast('🔒 เลือกไม่ได้: '+why);
  const quota=QT(c,ME);if(!adm&&PICK.length>=quota)return toast('รอบนี้เลือกได้ '+quota+' วัน');
  const hlLeft=(c.hlQuota[ME]||0)-hlUsed(ME,S.active)-PICK.filter(p=>p.hl).length;
  const hb=hlBusy(d);const hlOk=(adm||hlLeft>0)&&!hb.length;
  const pend=upMobPending(ME);
  openSheet(`<div class="row"><h3 class="sp">จองดับไฟ ${thDate(d)}</h3><button class="btn ghost" onclick="closeSheet()">✕</button></div>
  ${pend.length?`<div class="f"><label>เลือกจากแผนหน่วย (งานที่ขอระดมทีม)</label><select id="bU" onchange="const x=UP().find(z=>z.id===this.value);document.getElementById('bT').value=x?x.title:'';if(x&&x.crew){const s=document.getElementById('bC');if(![...s.options].some(o=>o.text===x.crew))s.add(new Option(x.crew));s.value=x.crew}"><option value="">— พิมพ์งานใหม่ —</option>${pend.map(x=>`<option value="${x.id}">${esc(x.title)} (${+x.start.slice(8)} ${TMS[+x.start.slice(5,7)-1]})</option>`).join('')}</select></div>`:''}
  <div class="f"><label>งาน / สถานที่</label><input id="bT" placeholder="เช่น ปป.บ้านบากัน, ย้ายแนว..."></div>
  <div class="f"><label>ฟีดเดอร์ / ช่วงเวลาดับไฟ</label><input id="bF" placeholder="เช่น F3 08.30–16.00 น."></div>
  <div class="f"><label>ขอทีม / อุปกรณ์</label><select id="bC"><option>ทุกทีม+กระเช้าติดเครน</option><option>ทุกทีม+กระเช้าติดรถ</option><option>ทุกทีม+กระเช้า</option><option>กระเช้า07 ทุกสาขา</option><option>ทีมซ่อมย่อย+กระเช้า07</option><option>ทุกทีม</option></select></div>
  <label class="row" style="margin-bottom:10px;${hlOk?'':'opacity:.5'}"><input type="checkbox" id="bH" ${hlOk?'':'disabled'}> ⚡ ขอฮอตไลน์ กบ.06 ช่วยงาน <span class="note">${hb.length?'(วันนี้ กบ.06 ไป '+esc(hb[0].title)+')':hlLeft>0?'(เหลือสิทธิ์ '+hlLeft+' วัน)':'(สิทธิ์เดือนนี้หมดแล้ว)'}</span></label>
  <div class="f"><label>แนบรูป / แผนผังหน้างาน</label><input type="file" id="bP" accept="image/*" multiple></div>
  <div class="row"><button class="btn" onclick="closeSheet()">ยกเลิก</button><span class="sp"></span><button class="btn pri" onclick="${adm?'adminSavePick':'savePick'}('${d}')">${adm?'👑 บันทึกให้ '+ME+'.':'เลือกวันนี้'}</button></div>`);
}
async function savePick(d){
  const t=document.getElementById('bT').value.trim()||'(ยังไม่ระบุงาน)';const f=document.getElementById('bF').value.trim();
  const p={date:d,title:t+(f?' '+f:''),crew:document.getElementById('bC').value,hl:document.getElementById('bH').checked,photos:await filesToData(document.getElementById('bP')),upId:document.getElementById('bU')?.value||''};
  PICK.push(p);closeSheet();vBook();
}
async function adminSavePick(d){
  const t=document.getElementById('bT').value.trim()||'(ยังไม่ระบุงาน)';const f=document.getElementById('bF').value.trim();
  const it={date:d,title:t+(f?' '+f:''),crew:document.getElementById('bC').value,hl:document.getElementById('bH').checked,photos:await filesToData(document.getElementById('bP')),upId:document.getElementById('bU')?.value||''};
  closeSheet();try{await api('adminPick',{unit:ME,item:it});toast('บันทึกให้ '+U[ME].name+' แล้ว');await reload(true)}catch(e){toast('⚠ '+e.message,4500)}
}
async function confirmPick(){
  const items=PICK;
  try{await api('pick',{unit:ME,items});PICK=[];toast('ยืนยันแล้ว — ส่งคิวถัดไป');await reload(true)}
  catch(e){toast('⚠ '+e.message,4500);await reload(true)}
}
// ---------- แลกวัน ----------
function swapPanel(){
  const sw=(S.swaps||[]).filter(s=>s.month===S.active);const pend=sw.filter(s=>s.st==='รอ');
  const inbox=pend.filter(s=>s.to===ME);const sent=pend.filter(s=>s.from===ME);const can=rank()>=2;
  const tOut=SWP.theirs&&EV.find(e=>e.type==='O'&&e.start===SWP.theirs);
  return `<div class="card"><b>🔁 ขอแลกวัน</b>
  ${can?`<p class="note" style="margin:4px 0 8px">1) แตะวันของ ${ME}. ที่จะให้ไป 2) แตะวันของหน่วยอื่นที่อยากได้ 3) ส่งคำขอ — อีกฝ่ายกดยอมรับแล้วระบบจะสลับวันให้</p>
  <div class="row"><span>วันของฉัน: <b>${SWP.mine?thDate(SWP.mine):'—'}</b></span><span>⇄</span><span>วันที่ขอ: <b>${tOut?thDate(SWP.theirs)+' ('+tOut.unit+'.)':'—'}</b></span><span class="sp"></span><button class="btn pri" ${SWP.mine&&SWP.theirs?'':'disabled'} onclick="sendSwap()">ส่งคำขอแลก</button></div>`:''}
  ${inbox.length&&can?`<div style="margin-top:10px"><b>คำขอถึง ${ME}.</b>${inbox.map(s=>`<div class="row" style="border-top:1px solid var(--line);padding:6px 0"><span><b style="color:${U[s.from].c}">${s.from}.</b> ขอแลก ${thDate(s.a)} ⇄ ${thDate(s.b)} ของคุณ</span><span class="sp"></span><button class="btn" onclick="act('swapAns',{id:'${s.id}',ok:false},'ปฏิเสธแล้ว')">ปฏิเสธ</button><button class="btn ok" onclick="act('swapAns',{id:'${s.id}',ok:true},'แลกวันสำเร็จ')">ยอมรับ</button></div>`).join('')}</div>`:''}
  ${sent.length?`<div class="note" style="margin-top:8px">ส่งแล้วรออีกฝ่าย: ${sent.map(s=>thDate(s.a)+' ⇄ '+thDate(s.b)+' ('+s.to+'.)').join(', ')}</div>`:''}
  ${sw.filter(s=>s.st!=='รอ').length?`<div class="note" style="margin-top:8px">ประวัติ: ${sw.filter(s=>s.st!=='รอ').map(s=>`${s.from}.⇄${s.to}. ${+s.a.slice(8)}↔${+s.b.slice(8)} ${s.st}`).join(' · ')}</div>`:''}
  </div>`;
}
function swapClick(d){
  if(rank()<2)return;
  const o=EV.find(e=>e.type==='O'&&e.start===d);if(!o)return toast('แตะได้เฉพาะวันที่มีการจองดับไฟ');
  if(o.unit===ME)SWP.mine=SWP.mine===d?'':d;else SWP.theirs=SWP.theirs===d?'':d;vBook();
}
function sendSwap(){const a=SWP.mine,b=SWP.theirs;SWP={mine:'',theirs:''};act('swapReq',{unit:ME,a,b},'ส่งคำขอแล้ว')}

// ---------- view: settings ----------
function defaultRound(){return{rounds:2,perRound:{ผกส:2,ผปบ:1,อล:1,คท:1,หคง:1,กลต:1,ขพ:1},hlQuota:{ผกส:2,ผปบ:2,อล:1,คท:1,หคง:1,กลต:1,ขพ:1},order:UNITS.map(u=>u.id),allowWeekend:false,lockTraining:true,lockMeeting:true,deadline:''}}
let SETM='';
// ลำดับ กฟส. เรียงวน: เริ่มที่หน่วยไหน ก็ไล่ต่อไปตามวง (ผกส./ผปบ. ล็อก 1-2 เสมอ)
const BASE=()=>UNITS.slice(FIXED).map(u=>u.id);
function rotOrder(start){const b=BASE();const i=Math.max(0,b.indexOf(start));return UNITS.slice(0,FIXED).map(u=>u.id).concat(b.slice(i),b.slice(0,i))}
function nextStart(ym){const prev=Object.keys(S.rounds).filter(k=>k<ym).sort().pop();if(!prev)return BASE()[0];const b=BASE();const s0=S.rounds[prev].order[FIXED];return b[(b.indexOf(s0)+1)%b.length]}
function orderLocked(saved){if(!saved||saved.status==='setup')return false;if(saved.status!=='open')return true;return !(saved.turn.round===1&&saved.turn.idx<=FIXED)}
function vSet(){
  const months=Object.keys(S.rounds).sort();
  if(!SETM)SETM=S.active||nextMonth(TODAY.slice(0,7));
  const saved=S.rounds[SETM];
  if(!DRAFT||DRAFT._m!==SETM){DRAFT=Object.assign(defaultRound(),JSON.parse(JSON.stringify(saved||{})),{_m:SETM});DRAFT.order=rotOrder(saved?saved.order[FIXED]:nextStart(SETM))}
  const olock=orderLocked(saved);const odiff=saved&&saved.order.join()!==DRAFT.order.join();
  const c=DRAFT;const st=saved?.status||'ยังไม่สร้าง';const started=(S.picks||[]).some(p=>p.month===SETM);
  const [y,m]=SETM.split('-').map(Number);
  const stLabel={setup:'กำลังตั้งค่า',open:'เปิดให้เลือกวัน',swap:'ช่วงขอแลกวัน',published:'ประกาศแล้ว'}[st]||st;
  document.getElementById('view').innerHTML=`
  <div class="banner adm">${S.me.role==='admin'?'👑 คุณเป็นแอดมินระบบ — เห็นและแก้ได้ทุกอย่าง รวมถึงแต่งตั้งโคแอดมิน':'ตั้งเงื่อนไขการเลือกวันของแต่ละเดือน'}</div>
  <div class="card"><div class="row"><b>เดือน</b>
   <button class="btn" onclick="SETM=prevMonth(SETM);vSet()">‹</button><b>${TM[m-1]} ${y+543}</b><button class="btn" onclick="SETM=nextMonth(SETM);vSet()">›</button>
   <span class="chip" style="background:#74045f">${stLabel}</span>${S.active===SETM?'<span class="chip" style="background:#16a34a">เดือนที่ใช้งาน</span>':''}
   <span class="sp"></span>
   <button class="btn" onclick="saveRound()">💾 บันทึก</button>
   ${(!saved||st==='setup')?`<button class="btn ok" onclick="saveRound('open')">▶ เปิดให้เลือกวัน</button>`:''}
   ${st==='swap'?`<button class="btn pri" onclick="saveRound('published')">📢 ประกาศแผน</button>`:''}
   ${st==='published'?`<button class="btn" onclick="saveRound('swap')">↩ เปิดแลกวันอีกครั้ง</button>`:''}
  </div><p class="note">เปิดให้เลือกวันแล้วเดือนนี้จะเป็น “เดือนที่ใช้งาน” · เปิดได้ทีละเดือน</p></div>
  <div class="grid2">
  <div class="card"><b>ลำดับสิทธิ์และจำนวนวัน</b>
    <div class="f" style="margin-top:8px"><label>จำนวนรอบ</label><div class="seg">${[1,2,3].map(n=>`<button class="${c.rounds===n?'on':''}" onclick="DRAFT.rounds=${n};vSet()">${n} รอบ</button>`).join('')}</div></div>
    <div class="f"><label>วันปิดรับการเลือก</label><input type="date" value="${c.deadline||''}" onchange="DRAFT.deadline=this.value"></div>
    <div class="f"><label>กฟส. ที่ได้เลือกก่อนเดือนนี้ (ลำดับที่ 3) — ที่เหลือเรียงวนต่อกันไป</label><div class="seg">${BASE().map(id=>`<button class="${c.order[FIXED]===id?'on':''}" ${olock?'disabled':''} onclick="DRAFT.order=rotOrder('${id}');vSet()">${U[id].name.replace('ผปร.กฟส.','')}</button>`).join('')}</div>
    <div class="note" style="margin-top:4px">วงลำดับ: ${BASE().map(id=>U[id].name.replace('ผปร.กฟส.','')).join(' → ')} → (วนกลับ)${!saved?` · เดือนใหม่เลื่อนผู้เริ่มให้อัตโนมัติจากเดือนก่อน`:''}${odiff?` · <b style="color:#c2410c">ลำดับเดิมไม่ได้เรียงวน — กด 💾 บันทึก เพื่อปรับ</b>`:''}${olock?' · 🔒 มีหน่วย กฟส. เลือกวันแล้ว เปลี่ยนลำดับไม่ได้':''}</div></div>
    <table><tr><th>ลำดับ</th><th class="c">เลือกได้/รอบ</th><th class="c">ฮอตไลน์/เดือน</th></tr>
    ${c.order.map((id,i)=>{const u=U[id];return`<tr><td style="white-space:nowrap">${i<FIXED?'🔒':'🔁'} ${i+1}. <b style="color:${u.c}">${u.name}</b></td>
      <td class="c"><div class="seg">${[0,1,2,3].map(n=>`<button class="${QT(c,id)===n?'on':''}" onclick="DRAFT.perRound['${id}']=${n};vSet()">${n}</button>`).join('')}</div></td>
      <td class="c"><div class="seg">${[0,1,2,3].map(n=>`<button class="${c.hlQuota[id]===n?'on':''}" onclick="DRAFT.hlQuota['${id}']=${n};vSet()">${n}</button>`).join('')}</div></td></tr>`}).join('')}
    </table>
    <p class="note">ผกส. และ ผปบ. เลือกก่อนเสมอ · ลำดับ กฟส. เรียงวน เลือกได้แค่หน่วยที่เริ่ม · ทุกรอบในเดือนเรียงลำดับเดิม · หน่วยที่ถึงคิวยกคิวให้หน่วยถัดไปได้ (เฉพาะรอบนั้น)</p>
  </div>
  <div class="card"><b>วันที่ล็อก (เลือกไม่ได้)</b>
    ${[['allowWeekend','เปิดให้เลือกเสาร์-อาทิตย์ได้'],['lockTraining','ล็อกวันอบรมทักษะ'],['lockMeeting','ล็อกวันประชุม']].map(([k,t])=>`<label class="row" style="margin:8px 0"><input type="checkbox" ${c[k]?'checked':''} onchange="DRAFT.${k}=this.checked"> ${t}</label>`).join('')}
    <p class="note">วันหยุด PEA ล็อกอัตโนมัติ · วันที่หน่วยอื่นเลือกแล้วล็อกทันที (ระดมทีมวันละ 1 งาน)<br>เพิ่ม/แก้ วันหยุด วันอบรม วันประชุม และวันที่ กบ.06 ไปนอกพื้นที่ ได้โดยแตะวันในหน้าปฏิทิน — ควรใส่ให้ครบก่อนกด “เปิดให้เลือกวัน”</p>
  </div></div>
  ${S.users?usersCard():''}
  <div class="card"><b>ประวัติการแก้ไขโดยผู้ดูแล</b><table style="margin-top:6px">${(S.audit||[]).slice(0,25).map(a=>`<tr><td class="note" style="white-space:nowrap">${esc(String(a.at).slice(0,16).replace('T',' '))}</td><td>${esc(a.by)}</td><td>${esc(a.action)}</td><td class="note">${esc(a.detail)}</td></tr>`).join('')||'<tr><td class="note">ยังไม่มี</td></tr>'}</table></div>`;
}
function moveOrder(i,d){const o=DRAFT.order;const j=i+d;if(j<FIXED||j>=o.length)return;[o[i],o[j]]=[o[j],o[i]];vSet()}
let YQ=0;async function yieldTurn(){const c=CFG();const ro=RO(c);let j=c.turn.idx+1;while(j<ro.length&&QT(c,ro[j])<=0)j++;
  if(j>=ro.length)return toast('เป็นหน่วยสุดท้ายของรอบนี้แล้ว');
  if(Date.now()-YQ>4000){YQ=Date.now();return toast('แตะอีกครั้งเพื่อยืนยัน: ให้ '+U[ro[j]].name+' เลือกก่อน')}
  YQ=0;PICK=[];await act('yield',{unit:ME},'ยกคิวให้ '+U[ro[j]].name+' แล้ว')}
async function saveRound(status){
  const cfg=Object.assign({},DRAFT);delete cfg._m;delete cfg.turn;delete cfg.status;delete cfg.ro;
  await act('saveRound',{month:SETM,cfg,status,makeActive:status==='open'},status==='open'?'เปิดให้เลือกวันแล้ว':status==='published'?'ประกาศแผนแล้ว':'บันทึกแล้ว');DRAFT=null;
}
function usersCard(){
  const co=isCo();const adm=S.me.role==='admin';
  const users=[...S.users].sort((a,b)=>(a.status==='pending'?-1:0)-(b.status==='pending'?-1:0));
  return `<div class="card" style="overflow:auto"><div class="row"><b>สิทธิ์ผู้ใช้ (ล็อกอินด้วย LINE)</b><span class="sp"></span><span class="note">คนใหม่เปิดลิงก์ → ล็อกอิน LINE → ขึ้น “รออนุมัติ” ที่นี่</span></div>
  <table style="margin-top:6px"><tr><th>ชื่อ LINE</th><th>หน่วยงาน</th><th>สิทธิ์</th><th>สถานะ</th><th></th></tr>
  ${users.map(x=>{const lock=!co||(x.role==='admin'&&!adm);const k=x.lineId;
   return `<tr><td>${x.pic?`<img src="${esc(x.pic)}" style="width:26px;height:26px;border-radius:50%;vertical-align:middle;margin-right:6px">`:''}${esc(x.name)}</td>
   <td><select id="u_${k}" ${lock?'disabled':''}><option value="">— เลือก —</option>${UNITS.map(u=>`<option value="${u.id}" ${x.unit===u.id?'selected':''}>${u.name}</option>`).join('')}</select></td>
   <td><select id="r_${k}" ${lock?'disabled':''}>${['','admin','coadmin','planner','picker','lead','viewer'].map(r=>`<option value="${r}" ${x.role===r?'selected':''} ${(r==='admin'||r==='coadmin')&&!adm?'disabled':''}>${ROLES[r]||'— เลือก —'}</option>`).join('')}</select></td>
   <td><select id="s_${k}" ${lock?'disabled':''}>${[['pending','รออนุมัติ'],['approved','อนุมัติ'],['blocked','ระงับ']].map(([v,t])=>`<option value="${v}" ${x.status===v?'selected':''}>${t}</option>`).join('')}</select></td>
   <td>${lock?'':`<button class="btn ${x.status==='pending'?'ok':''}" onclick="saveUser('${k}')">${x.status==='pending'?'อนุมัติ':'บันทึก'}</button>`}</td></tr>`}).join('')}
  </table>
  <p class="note">👑 แอดมินระบบ = ทุกอย่าง + แต่งตั้ง/ถอดโคแอดมิน + โอนสิทธิ์ · 🛡 โคแอดมิน = อนุมัติผู้ใช้ ตั้งรอบ แก้ไขแทนหน่วยอื่น (ลงประวัติ) · ผู้กำหนด (ผกส./ผปบ.) = ตั้งรอบ ประกาศแผน แก้วันหยุด/อบรม/ประชุม · ผู้เลือกวัน = เลือก/แลกวันของหน่วยตัวเอง · ดูอย่างเดียว = ดูปฏิทินและรายงาน</p></div>`;
}
function saveUser(k){
  const unit=document.getElementById('u_'+k).value,role=document.getElementById('r_'+k).value;let status=document.getElementById('s_'+k).value;
  if(!unit||!role)return toast('เลือกหน่วยงานและสิทธิ์ก่อน');
  if(status==='pending')status='approved';
  act('setUser',{lineId:k,unit,role,status},'บันทึกสิทธิ์แล้ว');
}

// ---------- view: analysis ----------
let AY=TODAY.slice(0,4);
function vAna(){
  const yr=AY;const months=Array.from({length:12},(_,i)=>`${yr}-${pad(i+1)}`);
  const OUT=EV.filter(e=>e.type==='O'&&e.start.startsWith(yr));
  const doneM=months.filter(m=>OUT.some(e=>e.start.startsWith(m)));
  const order=UNITS.map(u=>u.id);
  const v=document.getElementById('view');
  const yNav=`<div class="row"><button class="btn" onclick="AY=String(+AY-1);vAna()">‹</button><b style="font-size:16px">วิเคราะห์แผนระดมทีม ปี ${+yr+543}</b><button class="btn" onclick="AY=String(+AY+1);vAna()">›</button></div>`;
  if(!OUT.length){v.innerHTML=`<div class="card">${yNav}<p class="note">ยังไม่มีข้อมูลปีนี้</p></div>`;return}
  const cnt=(u,m)=>OUT.filter(e=>e.unit===u&&e.start.startsWith(m)).length;
  const mx=Math.max(1,...order.flatMap(u=>doneM.map(m=>cnt(u,m))));
  const heat=`<table><tr><th>หน่วย</th>${doneM.map(m=>`<th class="c">${TMS[+m.slice(5)-1]}</th>`).join('')}<th class="c">รวม</th><th class="c">เฉลี่ย/ด.</th></tr>
   ${order.map(id=>{const u=U[id];const row=doneM.map(m=>cnt(id,m));const s=row.reduce((a,b)=>a+b,0);
    return `<tr><td><b style="color:${u.c}">${id}.</b></td>${row.map(v=>`<td class="c" style="background:${u.c}${Math.round(v/mx*200+(v?30:0)).toString(16).padStart(2,'0')};color:${v/mx>.6?'#fff':'inherit'}">${v||''}</td>`).join('')}<td class="c"><b>${s}</b></td><td class="c">${(s/doneM.length).toFixed(1)}</td></tr>`}).join('')}</table>`;
  const wd=[1,2,3,4,5].map(d=>OUT.filter(e=>dow(e.start)===d).length);const wmx=Math.max(1,...wd);
  const wdH=wd.map((v,i)=>`<div class="row" style="margin:3px 0"><span style="width:70px">${TD[i+1]}</span><div class="bar" style="width:${v/wmx*220}px"></div><span>${v}</span></div>`).join('');
  const L=EV.filter(e=>e.type==='L'&&e.start.startsWith(yr));
  const days=e=>{let n=0,d=e.start;while(d<=e.end){if(![0,6].includes(dow(d)))n++;d=addD(d,1)}return n};
  const hl={};L.forEach(e=>{const k=hlUnit(e.title);hl[k]=(hl[k]||0)+days(e)});
  const keys=[...order,'นอก'];const hmx=Math.max(1,...keys.map(k=>hl[k]||0));const htot=Math.max(1,keys.reduce((s,k)=>s+(hl[k]||0),0));
  const hlH=keys.map(k=>`<div class="row" style="margin:3px 0"><span style="width:90px">${k==='นอก'?'นอกพื้นที่/สถานี':k+'.'}</span><div class="bar" style="width:${(hl[k]||0)/hmx*200}px;background:${U[k]?U[k].c:'#b45309'}"></div><span>${hl[k]||0} วัน (${Math.round((hl[k]||0)/htot*100)}%)</span></div>`).join('');
  const eq={'กระเช้าติดเครน':0,'กระเช้าติดรถ':0,'กระเช้า (ไม่ระบุ)':0,'กระเช้า07/ทีมซ่อมย่อย':0,'อื่น ๆ':0};
  OUT.forEach(e=>{const c=e.crew;if(/ติดเครน/.test(c))eq['กระเช้าติดเครน']++;else if(/ติดรถ/.test(c))eq['กระเช้าติดรถ']++;else if(/07|ซ่อมย่อย/.test(c))eq['กระเช้า07/ทีมซ่อมย่อย']++;else if(/กระเช้า/.test(c))eq['กระเช้า (ไม่ระบุ)']++;else eq['อื่น ๆ']++});
  const emx=Math.max(1,...Object.values(eq));
  const eqH=Object.entries(eq).map(([k,v])=>`<div class="row" style="margin:3px 0"><span style="width:150px">${k}</span><div class="bar" style="width:${v/emx*160}px;background:#475569"></div><span>${v}</span></div>`).join('');
  const gap=order.map(id=>{const d=OUT.filter(e=>e.unit===id).map(e=>parse(e.start)).sort((a,b)=>a-b);
    const g=d.slice(1).map((x,i)=>(x-d[i])/864e5);return{id,avg:g.length?g.reduce((a,b)=>a+b,0)/g.length:0,min:g.length?Math.min(...g):0}});
  const capacity=doneM.reduce((s,m)=>s+monthDays(m).filter(d=>![0,6].includes(dow(d))&&!evOn(d).some(e=>e.type==='H')).length,0);
  const avg=order.slice(FIXED).map(id=>({id,a:OUT.filter(e=>e.unit===id).length/doneM.length})).sort((a,b)=>b.a-a.a);
  const peak=wd.indexOf(Math.max(...wd));const low=wd.indexOf(Math.min(...wd));
  const ins=[
   `ในกลุ่ม กฟส. <b>${avg[0].id}.</b> ได้วันระดมทีมมากสุด เฉลี่ย ${avg[0].a.toFixed(1)} วัน/เดือน · <b>${avg[avg.length-1].id}.</b> น้อยสุด ${avg[avg.length-1].a.toFixed(1)} วัน/เดือน`,
   `วัน<b>${TD[peak+1]}</b>ถูกจองมากสุด (${wd[peak]} ครั้ง) วัน<b>${TD[low+1]}</b>น้อยสุด (${wd[low]})`,
   `กบ.06 อยู่นอกพื้นที่/สถานี ${hl['นอก']||0} วันทำการ (${Math.round((hl['นอก']||0)/htot*100)}%)`,
   `ใช้วันทำการไปกับระดมทีม ${OUT.length} จาก ${capacity} วัน (${Math.round(OUT.length/Math.max(1,capacity)*100)}%)`,
   `งานที่ใช้กระเช้าติดเครน ${eq['กระเช้าติดเครน']} ครั้ง`,
  ];
  v.innerHTML=`
  <div class="card">${yNav}<div class="note">ข้อมูล ${doneM.length} เดือน · ดับไฟระดมทีม ${OUT.length} ครั้ง · ไม่นับงานนอกแผน</div></div>
  <div class="card"><b>💡 ข้อสังเกต</b><ul style="margin:6px 0 0;padding-left:20px;line-height:1.7">${ins.map(x=>`<li>${x}</li>`).join('')}</ul></div>
  <div class="card" style="overflow:auto"><b>จำนวนวันดับไฟระดมทีม แยกหน่วย × เดือน</b><div style="margin-top:6px">${heat}</div></div>
  <div class="grid2">
   <div class="card"><b>วันในสัปดาห์ที่ถูกเลือก</b><div style="margin-top:6px">${wdH}</div></div>
   <div class="card"><b>ฮอตไลน์ กบ.06 ไปช่วยใคร (วันทำการ)</b><div style="margin-top:6px">${hlH}</div></div>
   <div class="card"><b>อุปกรณ์ที่ขอ</b><div style="margin-top:6px">${eqH}</div></div>
   <div class="card"><b>ระยะห่างระหว่างงานของแต่ละหน่วย</b><table style="margin-top:6px"><tr><th>หน่วย</th><th class="c">เฉลี่ย (วัน)</th><th class="c">ใกล้สุด (วัน)</th></tr>${gap.map(g=>`<tr><td><b style="color:${U[g.id].c}">${g.id}.</b></td><td class="c">${g.avg.toFixed(0)}</td><td class="c" style="${g.min&&g.min<4?'color:#d00;font-weight:700':''}">${g.min}</td></tr>`).join('')}</table><p class="note">ใกล้สุดน้อยกว่า 4 วัน (สีแดง) = ทีมออกงานถี่</p></div>
  </div>`;
}

// ---------- view: report ----------
function setRPT(m){RPT=m;vRpt()}
function vRpt(){
  const ym=RPT;const [y,m]=ym.split('-').map(Number);
  let body='';
  if(RVIEW==='sum'){
    const ev=EV.filter(e=>e.start.startsWith(ym));
    const rows=UNITS.map(u=>{const o=ev.filter(e=>e.type==='O'&&e.unit===u.id);
      const hl=ev.filter(e=>e.type==='L'&&hlUnit(e.title)===u.id).length;
      return{u,o:o.length,hl,ph:o.reduce((s,e)=>s+e.photos.length,0)}});
    const mx=Math.max(1,...rows.map(r=>r.o));
    body=`<div class="card"><b>สรุป ${TM[m-1]} ${y+543}</b>
    <table style="margin-top:6px"><tr><th>หน่วยงาน</th><th>ดับไฟระดมทีม</th><th class="c">ฮอตไลน์ (ครั้ง)</th><th class="c">รูป</th></tr>
    ${rows.map(r=>`<tr><td><b style="color:${r.u.c}">${r.u.name}</b></td><td><div class="row"><div class="bar" style="width:${r.o/mx*90}px;background:${r.u.c}"></div>${r.o}</div></td><td class="c">${r.hl}</td><td class="c">${r.ph}</td></tr>`).join('')}
    </table></div>
    <div class="card"><b>รายการทั้งเดือน</b><table style="margin-top:6px"><tr><th>วันที่</th><th>หน่วยงาน</th><th>งาน</th><th>ทีม/อุปกรณ์</th></tr>
    ${ev.filter(e=>e.type==='O').sort((a,b)=>a.start<b.start?-1:1).map(e=>`<tr><td>${thDate(e.start)}</td><td><b style="color:${U[e.unit]?.c}">${e.unit}.</b></td><td>${esc(e.title)}${e.hl?' ⚡':''}</td><td>${esc(e.crew)}</td></tr>`).join('')}</table></div>`;
  }else if(RVIEW==='unit')body=upPrint(ym);else body=docView(ym);
  document.getElementById('view').innerHTML=`
  <div class="card noprint">${monthNav(RPT,'setRPT')}
  <div class="row" style="margin-top:8px;justify-content:center"><div class="seg"><button class="${RVIEW==='sum'?'on':''}" onclick="RVIEW='sum';vRpt()">สรุป</button><button class="${RVIEW==='paper'?'on':''}" onclick="RVIEW='paper';vRpt()">ขออนุมัติแผน</button><button class="${RVIEW==='unit'?'on':''}" onclick="RVIEW='unit';vRpt()">แผนหน่วย</button></div>
  ${RVIEW!=='sum'?'<button class="btn pri" onclick="window.print()">🖨 พิมพ์ / บันทึก PDF</button>':''}</div></div>
  ${body}`;
  if(RVIEW!=='sum'){fitDoc();try{document.fonts.ready.then(fitDoc)}catch(e){}}
}
// ---------- แผนหน่วย (งานภายในของแต่ละหน่วย) ----------
const UP_KINDS=['ปรับปรุงระบบ / ย้ายแนว','PM / ซ่อมบำรุง','ตัดต้นไม้','ตรวจระบบ (Patrol)','อบรม / ประชุมภายใน','อื่น ๆ'];
const UP_ST={'แผน':['var(--surface-1)','#6b6274'],'ทำแล้ว':['#EAF3DE','#27500A'],'เลื่อน':['#FAEEDA','#633806'],'ยกเลิก':['#FCEBEB','#791F1F']};
let SHOWUP=true;let UPM=TODAY.slice(0,7);let UPU='';
const UP=()=>(S&&S.unitPlans)||[];
const canUp=unit=>(unit===S.me.unit&&rank()>=1.5)||isCo();
const seeAllUp=()=>isPlanner();
function upOn(d){return UP().filter(x=>d>=x.start&&d<=x.end&&!x.outId&&(seeAllUp()?(!UPU||UPU===x.unit):x.unit===S.me.unit))}
function upConflict(x,d){
  if(x.status==='ทำแล้ว'||x.status==='ยกเลิก')return null;
  const nm=U[x.unit];return EV.find(e=>e.type==='O'&&e.unit!==x.unit&&e.start===d&&/ทุกทีม|ทุกสาขา|ทุก กฟส/.test(e.crew||'')&&!new RegExp('ยกเว้น[^\\n]*'+x.unit).test(e.crew||''))||null;
}
function upChip(x,d){
  const u=U[x.unit]||{c:'#666'};const cf=upConflict(x,d);
  return `<div class="ev up" style="border-color:${cf?'#D85A30':u.c};color:${cf?'#993C1D':u.c}">${cf?'⚠ ':''}${seeAllUp()&&!UPU?'<b>'+esc(x.unit)+'.</b> ':''}<span class="long">${esc(x.title)}</span>${innerWidth<=700?'แผนหน่วย':''}</div>`;
}
function upMine(){return seeAllUp()?(UPU||S.me.unit||UNITS[0].id):S.me.unit}
function setUPM(m){UPM=m;vUp()}
function vUp(){
  const unit=upMine();const [y,m]=UPM.split('-').map(Number);
  const list=UP().filter(x=>x.unit===unit&&x.start<=monthDays(UPM).slice(-1)[0]&&x.end>=UPM+'-01').sort((a,b)=>a.start<b.start?-1:1);
  const cnt=k=>list.filter(x=>x.status===k).length;const mob=list.filter(x=>x.mob);
  const can=canUp(unit);
  document.getElementById('view').innerHTML=`
  <div class="card">${monthNav(UPM,'setUPM')}
   <div class="row" style="margin-top:8px"><b style="color:${U[unit]?.c}">แผนหน่วย ${U[unit]?.name||unit}</b><span class="sp"></span>
   ${seeAllUp()?`<select onchange="UPU=this.value;vUp()">${UNITS.map(u=>`<option value="${u.id}" ${u.id===unit?'selected':''}>${u.name}</option>`).join('')}</select>`:''}</div>
   <div class="note" style="margin-top:4px">${list.length} งาน · ขอระดมทีม ${mob.length} · ทำแล้ว ${cnt('ทำแล้ว')} · เลื่อน ${cnt('เลื่อน')} · ยกเลิก ${cnt('ยกเลิก')}</div>
   ${can?`<button class="btn pri" style="margin-top:8px" onclick="upEdit('',null)">+ เพิ่มงานในแผนหน่วย</button>`:'<div class="note" style="margin-top:6px">ดูอย่างเดียว</div>'}</div>
  <div class="card" style="padding:0">${list.length?list.map(x=>{const st=UP_ST[x.status]||UP_ST['แผน'];const o=x.outId&&EV.find(e=>e.id===x.outId);const cf=!x.outId&&upConflict(x,x.start);
    return `<div class="row" style="padding:10px 12px;border-bottom:1px solid var(--line);flex-wrap:nowrap;cursor:pointer" onclick="upEdit('${x.id}')">
    <div style="min-width:54px;font-weight:600">${TDS[dow(x.start)]} ${+x.start.slice(8)}${x.end!==x.start?'–'+(+x.end.slice(8)):''}</div>
    <div style="flex:1;min-width:0"><div style="white-space:normal">${esc(x.title)}</div><div class="note">${esc(x.kind)}${x.crew?' · '+esc(x.crew):''}${x.photos.length?' · 📷'+x.photos.length:''}</div>
    ${cf?`<div class="note" style="color:#993C1D">⚠ ชนวันระดมทีม ${esc(cf.unit)}. (${esc(cf.crew)})</div>`:''}</div>
    <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
    <span class="chip" style="background:${st[0]};color:${st[1]}">${esc(x.status)}</span>
    ${o?`<span class="chip" style="background:#EEEDFE;color:#3C3489">ระดมทีม ${+o.start.slice(8)} ${TMS[+o.start.slice(5,7)-1]}</span>`:x.mob?'<span class="chip" style="background:#FAEEDA;color:#633806">รอเลือกวัน</span>':''}</div></div>`}).join(''):'<p class="note" style="padding:12px">ยังไม่มีงานในเดือนนี้</p>'}</div>
  <p class="note">งานที่เปิด “ขอเป็นงานระดมทีม” จะขึ้นให้เลือกตอนถึงคิวเลือกวันของหน่วย · ได้วันแล้วจะผูกกับแผนรวมอัตโนมัติ</p>`;
}
function upEdit(id,dDefault){
  const x=id?UP().find(z=>z.id===id):{start:dDefault||(UPM===TODAY.slice(0,7)?TODAY:UPM+'-01'),end:'',kind:UP_KINDS[0],title:'',crew:'',status:'แผน',mob:false,note:'',photos:[],unit:upMine()};
  if(!x)return;const can=canUp(x.unit);const linked=!!x.outId;const o=linked&&EV.find(e=>e.id===x.outId);const dis=can?'':'disabled';
  openSheet(`<div class="row"><h3 class="sp">${id?'งานในแผนหน่วย':'เพิ่มงานในแผนหน่วย'} · ${esc(U[x.unit]?.name||'')}</h3><button class="btn ghost" onclick="closeSheet()">✕</button></div>
  ${linked?`<div class="banner turn" style="font-weight:400">ได้วันระดมทีมแล้ว: <b>${thDate(o?o.start:x.start)}</b> — วันที่ผูกกับแผนรวม (เปลี่ยนผ่านการแลกวัน)</div>`:''}
  <div class="row"><div class="f" style="flex:1"><label>วันที่</label><input type="date" id="uS" value="${x.start}" ${linked||!can?'disabled':''}></div>
  <div class="f" style="flex:1"><label>ถึงวันที่ (ถ้าหลายวัน)</label><input type="date" id="uE" value="${x.end&&x.end!==x.start?x.end:''}" ${linked||!can?'disabled':''}></div></div>
  <div class="f"><label>ประเภทงาน</label><select id="uK" ${dis}>${UP_KINDS.map(k=>`<option ${k===x.kind?'selected':''}>${k}</option>`).join('')}</select></div>
  <div class="f"><label>งาน / สถานที่ / ฟีดเดอร์</label><input id="uT" value="${esc(x.title)}" placeholder="เช่น PM หม้อแปลง 3 จุด F3" ${dis}></div>
  <div class="f"><label>ทีม / อุปกรณ์ที่ใช้</label><input id="uC" value="${esc(x.crew)}" placeholder="เช่น ทีมปฏิบัติการ อล. + กระเช้า" ${dis}></div>
  <div class="f"><label>หมายเหตุ</label><input id="uN" value="${esc(x.note)}" ${dis}></div>
  ${id?`<div class="f"><label>สถานะ</label><div class="seg">${Object.keys(UP_ST).map(k=>`<button type="button" class="${k===x.status?'on':''}" ${dis} onclick="this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${k}</button>`).join('')}</div></div>`:''}
  <label class="row" style="background:#E1F5EE;color:#085041;border-radius:10px;padding:8px 10px;margin-bottom:10px;flex-wrap:nowrap"><input type="checkbox" id="uM" ${x.mob?'checked':''} ${linked||!can?'disabled':''} style="flex:none;width:18px;height:18px"><span><b>ขอเป็นงานระดมทีม</b><br><span style="font-size:12px">ต้องใช้ทีมหน่วยอื่นช่วย → ไปรอในคิวเลือกวัน</span></span></label>
  ${x.photos.length?`<div class="thumbs" style="margin-bottom:8px">${x.photos.map(p=>`<a href="https://drive.google.com/file/d/${p}/view" target="_blank"><img src="${photoUrl(p)}" loading="lazy"></a>`).join('')}</div>`:''}
  ${can?`<div class="f"><label>แนบรูป</label><input type="file" id="uP" accept="image/*" multiple></div>`:''}
  <div class="row">${id&&can&&!linked?`<button class="btn" style="color:#dc2626" onclick="upDel('${id}')">🗑 ลบ</button>`:''}<span class="sp"></span><button class="btn" onclick="closeSheet()">ปิด</button>${can?`<button class="btn pri" onclick="upSave('${id}','${x.unit}')">บันทึก</button>`:''}</div>`);
}
async function upSave(id,unit){
  const g=i=>document.getElementById(i);const st=document.querySelector('#sheet .seg button.on');
  const item={id,unit,start:g('uS').value,end:g('uE').value,kind:g('uK').value,title:g('uT').value.trim(),crew:g('uC').value.trim(),note:g('uN').value.trim(),mob:g('uM').checked,status:st?st.textContent:'แผน',newPhotos:await filesToData(g('uP'))};
  if(!item.title)return toast('ระบุงานก่อน');if(!item.start)return toast('ระบุวันที่');
  closeSheet();await act('upSave',{item},'บันทึกแผนหน่วยแล้ว');
}
function upDel(id){if(!confirmDel){confirmDel=id;toast('กดลบอีกครั้งเพื่อยืนยัน');return setTimeout(()=>confirmDel='',3000)}confirmDel='';closeSheet();act('upDel',{id},'ลบแล้ว')}
let confirmDel='';
// งานที่ขอระดมทีมของหน่วย ที่ยังไม่ได้วัน (ใช้ตอนเลือกวัน)
function upMobPending(unit){return UP().filter(x=>x.unit===unit&&x.mob&&!x.outId&&x.status!=='ยกเลิก'&&!PICK.some(p=>p.upId===x.id))}
function upPrint(ym){
  const unit=upMine();const [y,m]=ym.split('-').map(Number);
  const list=UP().filter(x=>x.unit===unit&&x.start<=monthDays(ym).slice(-1)[0]&&x.end>=ym+'-01').sort((a,b)=>a.start<b.start?-1:1);
  return `<div class="card noprint"><div class="row"><b>แผนหน่วย</b>${seeAllUp()?`<select onchange="UPU=this.value;vRpt()">${UNITS.map(u=>`<option value="${u.id}" ${u.id===unit?'selected':''}>${u.name}</option>`).join('')}</select>`:''}</div></div>
  <div id="docWrap"><div id="printArea"><div class="pg upg">
  <h2>แผนงานภายใน ${T(U[unit]?.name||unit)} ประจำเดือน${TM[m-1]} ${thaiNum(y+543)}</h2>
  <table class="ut"><colgroup><col style="width:13%"><col style="width:18%"><col><col style="width:22%"><col style="width:11%"></colgroup>
  <tr><th>วันที่</th><th>ประเภท</th><th>งาน / สถานที่</th><th>ทีม / อุปกรณ์</th><th>สถานะ</th></tr>
  ${list.map(x=>{const o=x.outId&&EV.find(e=>e.id===x.outId);return`<tr><td>${thaiNum(+x.start.slice(8))}${x.end!==x.start?'–'+thaiNum(+x.end.slice(8)):''} ${TMS[m-1]}</td><td>${T(x.kind)}</td><td>${T(x.title)}${o?'<br><b>(ระดมทีม)</b>':''}${x.note?'<br><span style="font-size:.85em">'+T(x.note)+'</span>':''}</td><td>${T(x.crew)}</td><td>${T(x.status)}</td></tr>`}).join('')||'<tr><td colspan="5" style="text-align:center">ไม่มีงาน</td></tr>'}
  </table></div></div></div>`;
}

// ---------- เอกสารขออนุมัติแผนประจำเดือน (หน้า 1 บันทึก + หน้า 2 ปฏิทินแนวนอน) ----------
const DOCDEF={from:'ผปบ.กฟจ.กระบี่',to:'กฟจ.กระบี่',no:'ต.๒ กบ.(ปบ.)',dear:'ผจก.กฟจ.กระบี่',
  signName:'นายมนตรี ธรรมประดิษฐ์',signPos:'รจก. รักษาการแทน ผจก.กฟจ.กระบี่',
  apNo:'',apTo:'ผจก.กฟฟ.ในสังกัด กฟจ.กระบี่',apCc:'รจก., หผ.ปบ., หผ.กส., หผ.มต., จป.(ว.) กฟจ.กระบี่',
  apName:'นายมนตรี ธรรมประดิษฐ์',apPos:'รจก. รักษาการแทน ผจก.กฟจ.กระบี่',
  foot1:'ผปบ.กฟจ.กระบี่',foot2:'โทร. ๑๔๕๕๕',withX:false,withMemo:true};
let DOC=null;
const DOCKEEP=['from','to','no','dear','signName','signPos','apTo','apCc','apName','apPos','foot1','foot2'];
function docInit(){if(DOC)return;let loc={};try{loc=JSON.parse(localStorage.getItem('tp_doc')||'{}')}catch(e){}
  DOC=Object.assign({},DOCDEF,(S&&S.doc&&S.doc.fields)||{},{withMemo:loc.withMemo!==false,withX:!!loc.withX})}
let DOC_T=null;
let DOCDATE=TODAY;
function docSet(k,v){DOC[k]=v;
  if(k==='signName'||k==='apName'){const h=((S.doc&&S.doc.names)||[]).find(x=>x.n===v.trim());if(h&&h.pos)DOC[k==='signName'?'signPos':'apPos']=h.pos}
  if(k==='withMemo'||k==='withX'){try{localStorage.setItem('tp_doc',JSON.stringify({withMemo:DOC.withMemo,withX:DOC.withX}))}catch(e){}}
  else{clearTimeout(DOC_T);DOC_T=setTimeout(async()=>{try{const j=await api('docSave',{doc:DOC},true);S.doc=j.doc;toast('บันทึกข้อมูลเอกสารแล้ว')}catch(e){toast('⚠ '+e.message)}},600)}
  vRpt()}
const thFull=s=>{const d=parse(s);return thaiNum(`${d.getUTCDate()} ${TM[d.getUTCMonth()]} ${d.getUTCFullYear()+543}`)};
const T=s=>esc(thaiNum(s??''));
function docMemo(ym){
  const [y,m]=ym.split('-').map(Number);const mon=`${TM[m-1]} ${thaiNum(y+543)}`;
  return `<div class="pg memo">
  <img class="logo" src="pea-logo.png" alt="">
  <div class="mrow"><div class="c1"><span class="lb">จาก</span>${T(DOC.from)}</div><div class="c2"><span class="lb">ถึง</span>${T(DOC.to)}</div></div>
  <div class="mrow"><div class="c1"><span class="lb">เลขที่</span>${T(DOC.no)}</div><div class="c2"><span class="lb">วันที่</span>${thFull(DOCDATE)}</div></div>
  <div class="mrow"><span class="lb">เรื่อง</span>ขออนุมัติแผนการปฏิบัติงาน กฟจ.กระบี่และ กฟฟ.ในสังกัด ประจำเดือน${mon}</div>
  <div class="mrow" style="margin-top:3mm"><span class="lb">เรียน</span>${T(DOC.dear)}</div>
  <p class="para">ตามที่ ผปบ.กฟจ.กระบี่ ได้รับมอบหมายให้ดูแลรับผิดชอบ ระบบสายส่ง ๑๑๕ KV และระบบจำหน่ายไฟฟ้า ๓๓ KV ในเขตพื้นที่รับผิดชอบของ กฟจ.กระบี่ และ กฟฟ.ในสังกัด นั้น</p>
  <p class="para">เพื่อให้การปฏิบัติงานด้านบำรุงรักษาระบบไฟฟ้า และงานฮอทไลน์ สามารถดำเนินการสำเร็จลุล่วงตามวัตถุประสงค์ ผ่านเกณฑ์ชี้วัด ผปบ.กฟจ.กระบี่ ได้ดำเนินการจัดทำแผนการปฏิบัติงานประจำเดือน${mon} ตามเอกสารแนบ จำนวน ๑ แผ่น ทั้งนี้หากมีการเปลี่ยนแปลงแผนการปฏิบัติงานดังกล่าว มอบหมายให้ หผ.ปบ.กฟจ.กระบี่ พิจารณาดำเนินการได้ตามความเหมาะสม โดยไม่ต้องขออนุมัติเปลี่ยนแปลงอีก</p>
  <p class="para">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ และแจ้งส่วนที่เกี่ยวข้องดำเนินการต่อไป</p>
  <div class="sign"><div class="sp"></div>(${T(DOC.signName)})<br>${T(DOC.signPos)}</div>
  <div class="endorse">
    <div>ที่ ${T(DOC.no)} <span class="dots"></span></div>
    <div class="mrow"><span class="lb">เรียน</span>${T(DOC.apTo)}</div>
    <div class="ind">${T(DOC.apCc)}</div>
    <div class="ind2">-&nbsp;&nbsp;อนุมัติ</div>
    <div class="ind2">-&nbsp;&nbsp;เพื่อทราบและแจ้งส่วนที่เกี่ยวข้องดำเนินการต่อไป</div>
    <div class="sign2"><div class="sp"></div>(${T(DOC.apName)})<br>${T(DOC.apPos)}<div class="dt"><span class="dots" style="width:32mm"></span></div></div>
  </div>
  <div class="foot">${T(DOC.foot1)}<br>${T(DOC.foot2)}</div>
  </div>`;
}
function docCal(ym){
  const [y,m]=ym.split('-').map(Number);const days=monthDays(ym);const first=dow(days[0]);
  const cells=[];for(let i=0;i<first;i++)cells.push('');days.forEach(d=>cells.push(d));while(cells.length%7)cells.push('');
  const keep=e=>e.type!=='P'&&(DOC.withX||e.type!=='W');
  const multiL=EV.filter(e=>e.type==='L'&&e.start!==e.end&&e.end>=days[0]&&e.start<=days[days.length-1]);
  const nWeeks=cells.length/7;const cellH=Math.floor((166-nWeeks*5)/nWeeks);
  let rows='';
  for(let r=0;r<cells.length;r+=7){
    const wk=cells.slice(r,r+7);
    rows+='<tr class="wk">'+wk.map(d=>{
      if(!d)return`<td style="height:${cellH}mm"></td>`;
      const ev=evOn(d).filter(keep);let h=`<div class="dn">${thaiNum(+d.slice(8))}</div><div class="cc">`;
      ev.filter(e=>e.type!=='L').forEach(e=>{
        if(e.type==='H')h+=`<div class="hol">${T(e.title)}</div>`;
        else if(e.type==='O')h+=`<div class="blk"><span class="off">ดับไฟ</span> ${T(e.unit)}.<br>${T(e.title)}${e.crew?'<br>'+T(e.crew):''}</div>`;
        else h+=`<div class="blk">${T(e.title)}${e.crew?'<br>'+T(e.crew):''}</div>`;
      });
      if(!ev.filter(e=>e.type!=='L').length&&![0,6].includes(dow(d)))h+=`<div class="blk">ตามภาระหน้าที่</div>`;
      h+='</div>';
      const l1=ev.filter(e=>e.type==='L'&&e.start===e.end);
      if(l1.length)h+=`<div class="hl1">${l1.map(l=>'กบ.๐๖ '+(l.title.startsWith('ช่วยงาน')?'':'ไป ')+T(l.title)).join('<br>')}</div>`;
      return`<td style="height:${cellH}mm">${h}</td>`}).join('')+'</tr>';
    // แถวลูกศร กบ.06 หลายวัน
    const spans=[];
    multiL.forEach(e=>{const idx=wk.map((d,i)=>d&&d>=e.start&&d<=e.end?i:-1).filter(i=>i>=0);if(idx.length)spans.push({a:idx[0],b:idx[idx.length-1],t:e.title})});
    let ar='<tr class="ar">';let c=0;
    spans.sort((p,q)=>p.a-q.a).forEach(s=>{if(s.a<c)return;if(s.a>c)ar+=`<td colspan="${s.a-c}"></td>`;
      ar+=`<td colspan="${s.b-s.a+1}"><div class="arrow"><span>กบ.๐๖ ${s.t.startsWith('ช่วยงาน')?'':'ไป '}${T(s.t)}</span><i></i></div></td>`;c=s.b+1});
    if(c<7)ar+=`<td colspan="${7-c}"></td>`;
    rows+=ar+'</tr>';
  }
  return `<div class="pg land"><div class="rot">
    <h2>แผนงาน กฟจ.กระบี่ ประจำเดือน${TM[m-1]} ${thaiNum(y+543)}</h2>
    <table class="ct"><colgroup><col style="width:8.5%">${'<col style="width:16.6%">'.repeat(5)}<col style="width:8.5%"></colgroup>
    <tr>${TD.map(t=>`<th>${t}</th>`).join('')}</tr>${rows}</table></div></div>`;
}
function docPanel(){
  const names=((S.doc&&S.doc.names)||[]);
  const f=(k,lab,w,list)=>`<label class="f" style="min-width:${w||200}px;flex:1"><span>${lab}</span><input value="${esc(DOC[k])}" ${list?'list="dlNames"':''} onchange="docSet('${k}',this.value)"></label>`;
  return `<div class="card noprint">
  <div class="row"><b>ข้อมูลในเอกสาร</b><span class="sp"></span><span class="note">ค่าที่แก้จะบันทึกกลางให้ทุกคนใช้ร่วมกัน · ชื่อที่พิมพ์ใหม่จะถูกเก็บไว้เลือกครั้งหน้า</span></div>
  <div class="row" style="align-items:flex-end;margin-top:6px">
    <label class="f" style="min-width:150px"><span>วันที่หนังสือ</span><input type="date" value="${DOCDATE}" onchange="DOCDATE=this.value;vRpt()"></label>
    ${f('no','เลขที่',120)}${f('from','จาก',140)}${f('to','ถึง',120)}${f('dear','เรียน',150)}</div>
  <datalist id="dlNames">${names.map(x=>`<option value="${esc(x.n)}">${esc(x.pos)}</option>`).join('')}</datalist>
  <div class="row">${f('signName','ผู้ลงนาม (ชื่อ) — พิมพ์ใหม่หรือเลือกจากที่เคยใช้',0,1)}${f('signPos','ตำแหน่ง')}</div>
  <details><summary class="note" style="cursor:pointer">ส่วนท้าย (ผู้อนุมัติ / สำเนาเรียน / ท้ายหนังสือ)</summary>
  <div class="row">${f('apNo','เลขที่รับ (เว้นว่าง = เขียนมือ)',150)}${f('apTo','เรียน (อนุมัติ)')}</div>
  <div class="row">${f('apCc','สำเนาเรียน')}</div>
  <div class="row">${f('apName','ผู้อนุมัติ (ชื่อ) — พิมพ์ใหม่หรือเลือกจากที่เคยใช้',0,1)}${f('apPos','ตำแหน่ง')}</div>
  <div class="row">${f('foot1','ท้ายหนังสือ บรรทัด 1',150)}${f('foot2','บรรทัด 2',150)}</div></details>
  <div class="row" style="margin-top:6px">
    <label class="row note"><input type="checkbox" ${DOC.withMemo?'checked':''} onchange="docSet('withMemo',this.checked)"> พิมพ์หน้าบันทึกขออนุมัติ</label>
    <label class="row note"><input type="checkbox" ${DOC.withX?'checked':''} onchange="docSet('withX',this.checked)"> รวมงานนอกแผนระดมทีมในปฏิทิน</label></div>
  <p class="note">ฟอนต์ TH Sarabun New ขนาด ๑๖ · ได้ ๒ หน้าเสมอ (ถ้าตารางแน่นเกิน ระบบจะย่อตัวอักษรในตารางลงเท่าที่จำเป็น) · พิมพ์บนกระดาษ A4 แนวตั้ง</p></div>`;
}
function docView(ym){
  docInit();
  return docPanel()+`<div id="docWrap"><div id="printArea">${DOC.withMemo?docMemo(ym):''}${docCal(ym)}</div></div>`;
}
function fitDoc(){const w=document.getElementById('docWrap');if(!w)return;const pa=document.getElementById('printArea');
  pa.style.zoom=1;
  // ให้ตารางอยู่ในหน้าเดียว: เริ่ม ๑๖ แล้วลดทีละ ๐.๕ จนพอดี
  const rot=pa.querySelector('.rot'),ct=pa.querySelector('.ct');
  if(rot&&ct){let fs=16;ct.style.fontSize=fs+'pt';while(rot.scrollHeight>rot.clientHeight+1&&fs>10){fs-=.5;ct.style.fontSize=fs+'pt'}rot.dataset.fs=fs}
  const memo=pa.querySelector('.memo');if(memo){let fs=16;memo.style.fontSize=fs+'pt';const over=()=>{const e=memo.querySelector('.endorse'),f=memo.querySelector('.foot');return e.getBoundingClientRect().bottom>f.getBoundingClientRect().top-2};while(over()&&fs>14){fs-=.5;memo.style.fontSize=fs+'pt'}memo.dataset.fs=fs}
  pa.style.zoom=Math.min(1,(w.clientWidth-4)/794)}
addEventListener('beforeprint',()=>{const pa=document.getElementById('printArea');if(pa)pa.style.zoom=1});
addEventListener('afterprint',()=>fitDoc());

document.getElementById('mask').onclick=e=>{if(e.target.id==='mask')closeSheet()};
addEventListener('resize',()=>{clearTimeout(window._r);window._r=setTimeout(render,200)});
start();
