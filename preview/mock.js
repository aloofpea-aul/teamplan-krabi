// ตัวอย่างเท่านั้น: จำลองเซิร์ฟเวอร์ในเครื่อง ไม่ส่งข้อมูลไปที่ระบบจริง
(function(){
  const off=new Date('2026-11-20T02:00:00Z').getTime()-Date.now();const o=Date.now;Date.now=()=>o()+off;
  // แยกที่เก็บข้อมูลของตัวอย่าง ไม่ให้ทับการล็อกอินของแอปจริง (โดเมนเดียวกัน)
  try{const L=Storage.prototype,g=L.getItem,s=L.setItem,r=L.removeItem,P=k=>/^tp_/.test(k)?'demo_'+k:k;
    L.getItem=function(k){return g.call(this,P(k))};L.setItem=function(k,v){return s.call(this,P(k),v)};L.removeItem=function(k){return r.call(this,P(k))};
    localStorage.setItem('tp_token','demo');localStorage.removeItem('tp_cache')}catch(e){}
  window.liff={init:async()=>{},isLoggedIn:()=>true,getIDToken:()=>'',login:()=>{}};
  const WHO={user:{lineId:'U2',name:'สมชาย',unit:'อล',role:'picker'},admin:{lineId:'U1',name:'Manasak',unit:'อล',role:'admin'}};
  let who='user';try{who=localStorage.getItem('demo_role')||'user'}catch(e){}
  window.DEMO_ROLE=who;
  const ST=JSON.parse(JSON.stringify(window.MOCK));Object.assign(ST.me,WHO[who]);if(who!=='admin'){delete ST.users;delete ST.quota}
  const real=window.fetch.bind(window);
  window.fetch=async(url,opt)=>{
    if(!String(url).includes('script.google.com'))return real(url,opt);
    const b=JSON.parse(opt.body);const a=b.action;let r={ok:true};
    if(a==='state')r=ST;
    else if(a==='fileAdd')ST.files.push({id:'f'+o(),evId:b.evId,kind:b.kind,to:b.to,name:b.name,fileId:'x',mime:/pdf/.test(b.name)?'application/pdf':'image/jpeg',size:180000,by:ST.me.lineId,byName:ST.me.name,at:new Date(Date.now()).toISOString()});
    else if(a==='fileDel')ST.files=ST.files.filter(f=>f.id!==b.id);
    else if(a==='skipSet'){let s=(ST.skips[b.evId]||[]).filter(x=>x!==b.unit);if(b.skip)s.push(b.unit);ST.skips[b.evId]=s}
    else if(a==='hlPeer'){const q=ST.hlReqs.find(x=>x.id===b.id);if(q){q.st=b.ok?'wait_admin':'rejected';q.okBy=ST.me.name}}
    else setTimeout(()=>window.toast&&toast('🧪 ตัวอย่าง: ปุ่มนี้ไม่ได้บันทึกจริง',3000),400);
    await new Promise(z=>setTimeout(z,300));
    return new Response(JSON.stringify(r),{headers:{'Content-Type':'application/json'}});
  };
  window.demoRole=r=>{try{localStorage.setItem('demo_role',r)}catch(e){}location.reload()};
})();
