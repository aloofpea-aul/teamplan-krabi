/**
 * แผนงานระดมทีม กฟจ.กระบี่ — Backend (Google Apps Script)
 * ฐานข้อมูล: Google Sheet ที่ setup() สร้างให้ · รูป: โฟลเดอร์ Google Drive
 * ล็อกอิน: LINE Login (LIFF) → ตรวจ ID token กับ LINE → ออก session token
 */
const SP = PropertiesService.getScriptProperties();
const UNITS = ['ผกส','ผปบ','อล','คท','หคง','กลต','ขพ'];
const PLANNER_UNITS = ['ผกส','ผปบ'];
const ROLE_RANK = {viewer:1, picker:2, planner:3, coadmin:4, admin:5};
const SHEETS = {
  Events:  ['id','start','end','type','unit','title','crew','hl','photos','src','createdBy','createdAt','ofOut'],
  Users:   ['lineId','name','pic','unit','role','status','createdAt','lastLogin'],
  Sessions:['token','lineId','expires'],
  Config:  ['key','value'],
  Picks:   ['month','round','unit','dates','by','at'],
  Swaps:   ['id','month','from','to','a','b','st','by','at','answeredBy','answeredAt'],
  Audit:   ['at','by','action','detail'],
};

// ================= SETUP (รันครั้งเดียวจากหน้า Apps Script) =================
function setup() {
  let ssId = SP.getProperty('SS_ID');
  if (!ssId) {
    const ss = SpreadsheetApp.create('แผนงานระดมทีม กฟจ.กระบี่ (ฐานข้อมูล)');
    ssId = ss.getId(); SP.setProperty('SS_ID', ssId);
  }
  const ss = SpreadsheetApp.openById(ssId);
  Object.keys(SHEETS).forEach(n => {
    let sh = ss.getSheetByName(n);
    if (!sh) sh = ss.insertSheet(n);
    if (sh.getLastRow() === 0) { sh.getRange(1, 1, sh.getMaxRows(), SHEETS[n].length).setNumberFormat('@'); sh.appendRow(SHEETS[n]); sh.setFrozenRows(1); }
  });
  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('แผ่น1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  if (!SP.getProperty('FOLDER_ID')) {
    const f = DriveApp.createFolder('แผนงานระดมทีม กฟจ.กระบี่ - รูปหน้างาน');
    SP.setProperty('FOLDER_ID', f.getId());
  }
  // ข้อมูลตั้งต้น ม.ค.–พ.ย. 2569
  const ev = ss.getSheetByName('Events');
  if (ev.getLastRow() <= 1) {
    const now = new Date().toISOString();
    const SEED_RAW = UrlFetchApp.fetch('https://raw.githubusercontent.com/aloofpea-aul/teamplan-krabi/main/gas/seed.txt').getContentText('UTF-8');
    const rows = SEED_RAW.trim().split('\n').map((l, i) => {
      const [dt, type, unit, title, crew] = l.split('|');
      const [s, e] = dt.split('~');
      return ['S' + (i + 1), s, e || s, type, unit || '', title, crew || '', '', '', 'seed', 'seed', now, ''];
    });
    ev.getRange(2, 1, rows.length, SHEETS.Events.length).setValues(rows);
  }
  Logger.log('SS: https://docs.google.com/spreadsheets/d/' + ssId);
}
/** ตั้งค่า LINE Login Channel ID (เรียกจาก setLine) */
function setLineChannel(channelId) { SP.setProperty('LINE_CHANNEL_ID', String(channelId)); }

// ================= sheet helpers =================
function ss_() { return SpreadsheetApp.openById(SP.getProperty('SS_ID')); }
function rows_(name) {
  const sh = ss_().getSheetByName(name); const v = sh.getDataRange().getValues(); const h = v.shift();
  return v.map((r, i) => { const o = {_row: i + 2}; h.forEach((k, j) => o[k] = r[j] instanceof Date ? fmtD_(r[j]) : r[j]); return o; });
}
function fmtD_(d) { return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); }
function append_(name, obj) { const sh = ss_().getSheetByName(name); sh.appendRow(SHEETS[name].map(k => obj[k] === undefined ? '' : obj[k])); }
function update_(name, row, obj) {
  const sh = ss_().getSheetByName(name);
  SHEETS[name].forEach((k, j) => { if (obj[k] !== undefined) sh.getRange(row, j + 1).setValue(obj[k]); });
}
function getCfg_(key, dflt) { const r = rows_('Config').find(x => x.key === key); return r ? JSON.parse(r.value) : dflt; }
function setCfg_(key, val) {
  const r = rows_('Config').find(x => x.key === key);
  if (r) update_('Config', r._row, {value: JSON.stringify(val)}); else append_('Config', {key, value: JSON.stringify(val)});
}
function audit_(u, action, detail) { append_('Audit', {at: new Date().toISOString(), by: u ? (u.name + ' (' + (u.unit || '-') + ')') : '-', action, detail: typeof detail === 'string' ? detail : JSON.stringify(detail)}); }
function newId_() { return Utilities.getUuid().slice(0, 8); }

// ================= HTTP =================
function doGet() { return json_({ok: true, app: 'teamplan-krabi'}); }
function doPost(e) {
  let out;
  try {
    const p = JSON.parse(e.postData.contents);
    out = route_(p);
  } catch (err) { out = {ok: false, error: String(err.message || err)}; }
  return json_(out);
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function route_(p) {
  if (p.action === 'login') return login_(p.idToken);
  // ล็อกอินแอปบนหน้าจอโฮม (PWA): แอปสร้างรหัส → เปิด LINE ล็อกอิน → LINE ฝากโทเคนไว้ใต้รหัส → แอปมารับ
  if (p.action === 'pairLogin') {
    if (!/^[A-Za-z0-9]{24,64}$/.test(p.code || '')) return {ok: false, error: 'รหัสไม่ถูกต้อง'};
    const r = login_(p.idToken); if (!r.ok) return r;
    CacheService.getScriptCache().put('pair:' + p.code, r.token, 600);
    return {ok: true};
  }
  if (p.action === 'pairCheck') {
    if (!/^[A-Za-z0-9]{24,64}$/.test(p.code || '')) return {ok: false, error: 'รหัสไม่ถูกต้อง'};
    const c = CacheService.getScriptCache(); const t = c.get('pair:' + p.code);
    if (t) c.remove('pair:' + p.code);
    return {ok: true, token: t || ''};
  }
  const u = auth_(p.token);
  if (!u) return {ok: false, error: 'AUTH'};
  if (u.status !== 'approved' && p.action !== 'state') return {ok: false, error: 'PENDING'};
  const lock = LockService.getScriptLock();
  const write = !['state'].includes(p.action);
  if (write) lock.waitLock(20000);
  try {
    switch (p.action) {
      case 'state': return state_(u);
      case 'pick': return pick_(u, p);
      case 'swapReq': return swapReq_(u, p);
      case 'swapAns': return swapAns_(u, p);
      case 'saveRound': return saveRound_(u, p);
      case 'addEvent': return addEvent_(u, p);
      case 'delEvent': return delEvent_(u, p);
      case 'editEvent': return editEvent_(u, p);
      case 'addPhoto': return addPhoto_(u, p);
      case 'setUser': return setUser_(u, p);
      case 'docSave': return docSave_(u, p);
      default: return {ok: false, error: 'unknown action'};
    }
  } finally { if (write) lock.releaseLock(); }
}

// ================= auth =================
function login_(idToken) {
  const cid = SP.getProperty('LINE_CHANNEL_ID');
  const r = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {method: 'post', payload: {id_token: idToken, client_id: cid}, muteHttpExceptions: true});
  const j = JSON.parse(r.getContentText());
  if (r.getResponseCode() !== 200 || !j.sub) return {ok: false, error: 'LINE: ' + (j.error_description || 'verify failed')};
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const users = rows_('Users'); let u = users.find(x => x.lineId === j.sub);
    const now = new Date().toISOString();
    if (!u) {
      const first = !users.some(x => x.role === 'admin');
      u = {lineId: j.sub, name: j.name || 'LINE user', pic: j.picture || '', unit: first ? 'อล' : '', role: first ? 'admin' : '', status: first ? 'approved' : 'pending', createdAt: now, lastLogin: now};
      append_('Users', u); audit_(u, first ? 'สร้างแอดมินระบบ' : 'ขอเข้าใช้งาน', u.name);
      if (!first) push_(idsAdmins_(), '👤 ' + u.name + ' ขอเข้าใช้งานแผนระดมทีม\nเข้าแท็บ แอดมิน → สิทธิ์ผู้ใช้ เพื่ออนุมัติ');
    } else update_('Users', u._row, {name: j.name || u.name, pic: j.picture || u.pic, lastLogin: now});
    const token = Utilities.getUuid() + Utilities.getUuid();
    append_('Sessions', {token, lineId: j.sub, expires: Date.now() + 60 * 864e5});
    return {ok: true, token};
  } finally { lock.releaseLock(); }
}
function auth_(token) {
  if (!token) return null;
  const c = CacheService.getScriptCache(); const hit = c.get('s:' + token);
  let lineId = hit;
  if (!lineId) {
    const s = rows_('Sessions').find(x => x.token === token && Number(x.expires) > Date.now());
    if (!s) return null; lineId = s.lineId; c.put('s:' + token, lineId, 21600);
  }
  return rows_('Users').find(x => x.lineId === lineId) || null;
}
const rank_ = u => ROLE_RANK[u.role] || 0;
const isPlanner_ = u => rank_(u) >= 4 || (u.role === 'planner' && PLANNER_UNITS.includes(u.unit));
const isCo_ = u => rank_(u) >= 4;
function actUnit_(u, unit) { // หน่วยที่ทำรายการในนาม
  if (unit && unit !== u.unit) { if (!isCo_(u)) throw new Error('ไม่มีสิทธิ์ทำแทนหน่วยอื่น'); return unit; }
  return u.unit;
}


// ================= LINE แจ้งเตือน (Messaging API · OA "ระดมทีม กฟจ.กระบี่") =================
const APP_URL = 'https://aloofpea-aul.github.io/teamplan-krabi/';
const TMN = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const UNAME = {ผกส:'ผกส.กฟจ.กบ.', ผปบ:'ผปบ.กฟจ.กบ.', อล:'ผปร.กฟส.อล.', คท:'ผปร.กฟส.คท.', หคง:'ผปร.กฟส.หคง.', กลต:'ผปร.กฟส.กลต.', ขพ:'ผปร.กฟส.ขพ.'};
function mName_(ym) { const [y, m] = ym.split('-').map(Number); return TMN[m - 1] + ' ' + (y + 543); }
function thD_(d) { const [y, m, dd] = d.split('-').map(Number); return dd + ' ' + TMN[m - 1].slice(0, 3) + '.'; }
function push_(ids, text) {
  const token = SP.getProperty('LINE_TOKEN'); ids = [...new Set(ids.filter(Boolean))];
  if (!token || !ids.length) return;
  try {
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/multicast', {method: 'post', contentType: 'application/json',
      headers: {Authorization: 'Bearer ' + token}, muteHttpExceptions: true,
      payload: JSON.stringify({to: ids.slice(0, 500), messages: [{type: 'text', text: text + '\n\n👉 ' + APP_URL}]})});
  } catch (e) { Logger.log('push fail ' + e); }
}
function approved_() { return rows_('Users').filter(u => u.status === 'approved'); }
function idsOfUnit_(unit) { return approved_().filter(u => u.unit === unit && rank_(u) >= 2).map(u => u.lineId); }
function idsAll_() { return approved_().map(u => u.lineId); }
function idsAdmins_() { return approved_().filter(u => rank_(u) >= 4).map(u => u.lineId); }
function notifyTurn_(month, cfg) {
  if (cfg.status === 'swap') { push_(idsAll_(), '✅ แผนระดมทีม ' + mName_(month) + '\nทุกหน่วยเลือกวันครบแล้ว — ขอแลกวันกับหน่วยอื่นได้จนกว่าจะประกาศแผน'); return; }
  if (cfg.status !== 'open') return;
  const unit = cfg.order[cfg.turn.idx];
  push_(idsOfUnit_(unit), '✋ ถึงคิว ' + UNAME[unit] + ' เลือกวันดับไฟระดมทีม\nเดือน ' + mName_(month) + ' · รอบที่ ' + cfg.turn.round + ' · เลือกได้ ' + (cfg.perRound[unit] || 1) + ' วัน\nหน่วยถัดไปรอคุณยืนยันอยู่ครับ');
}
/** ทดสอบส่งข้อความหาแอดมิน (รันจากหน้า Apps Script) */
function testPush() { push_(idsAdmins_(), '🔔 ทดสอบแจ้งเตือน แผนงานระดมทีม กฟจ.กระบี่'); }

// ================= state =================
function state_(u) {
  const out = {ok: true, me: {name: u.name, pic: u.pic, unit: u.unit, role: u.role, status: u.status}};
  if (u.status !== 'approved') return out;
  out.events = rows_('Events').map(e => ({id: e.id, start: e.start, end: e.end, type: e.type, unit: e.unit, title: e.title, crew: e.crew, hl: e.hl === true || e.hl === 'TRUE', photos: e.photos ? String(e.photos).split(',') : [], src: e.src, ofOut: e.ofOut}));
  out.active = getCfg_('active', '');
  out.rounds = {};
  rows_('Config').filter(r => r.key.startsWith('round:')).forEach(r => out.rounds[r.key.slice(6)] = JSON.parse(r.value));
  out.picks = rows_('Picks').map(p => ({month: p.month, round: Number(p.round), unit: p.unit, dates: String(p.dates).split(',').filter(Boolean), by: p.by, at: p.at}));
  out.swaps = rows_('Swaps').map(s => ({id: s.id, month: s.month, from: s.from, to: s.to, a: s.a, b: s.b, st: s.st, at: s.at}));
  out.doc = getCfg_('doc', null);
  out.audit = rows_('Audit').slice(-60).reverse().map(a => ({at: a.at, by: a.by, action: a.action, detail: a.detail}));
  if (isCo_(u) || isPlanner_(u)) out.users = rows_('Users').map(x => ({lineId: x.lineId, name: x.name, pic: x.pic, unit: x.unit, role: x.role, status: x.status, lastLogin: x.lastLogin}));
  return out;
}

// ================= rules (ต้องตรงกับหน้าเว็บ) =================
function dow_(s) { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function evOn_(evs, d) { return evs.filter(e => d >= e.start && d <= e.end); }
function lockReason_(evs, cfg, d) {
  const w = dow_(d); const ev = evOn_(evs, d);
  if (!cfg.allowWeekend && (w === 0 || w === 6)) return 'เสาร์-อาทิตย์';
  if (ev.some(e => e.type === 'H')) return 'วันหยุด';
  if (cfg.lockTraining && ev.some(e => e.type === 'T')) return 'วันอบรม';
  if (cfg.lockMeeting && ev.some(e => e.type === 'M')) return 'วันประชุม';
  if (ev.some(e => e.type === 'O')) return 'จองแล้ว';
  return '';
}
function allDone_(cfg) { return cfg.turn.round > cfg.rounds; }

// ================= pick =================
function pick_(u, p) {
  const month = getCfg_('active', ''); const cfg = getCfg_('round:' + month, null);
  if (!cfg || cfg.status !== 'open') throw new Error('ยังไม่เปิดรอบเลือกวัน');
  const unit = actUnit_(u, p.unit);
  if (rank_(u) < 2) throw new Error('ไม่มีสิทธิ์เลือกวัน');
  const cur = cfg.order[cfg.turn.idx];
  if (cur !== unit) throw new Error('ยังไม่ถึงคิวของ ' + unit + '. (ตอนนี้คิว ' + cur + '.)');
  const quota = cfg.perRound[unit] || 1;
  if (!p.items || p.items.length !== quota) throw new Error('ต้องเลือกให้ครบ ' + quota + ' วัน');
  const evs = rows_('Events');
  let hlLeft = (cfg.hlQuota[unit] || 0) - evs.filter(e => e.type === 'O' && e.unit === unit && e.start.startsWith(month) && (e.hl === true || e.hl === 'TRUE')).length;
  const now = new Date().toISOString(); const dates = [];
  p.items.forEach(it => {
    if (!it.date.startsWith(month)) throw new Error('วันที่ไม่อยู่ในเดือนที่เปิด');
    const why = lockReason_(evs, cfg, it.date); if (why) throw new Error(it.date + ' เลือกไม่ได้: ' + why);
    if (dates.includes(it.date)) throw new Error('เลือกวันซ้ำ');
    let hl = !!it.hl;
    if (hl) { if (hlLeft <= 0 || evOn_(evs, it.date).some(e => e.type === 'L')) hl = false; else hlLeft--; }
    const id = newId_();
    const photos = (it.photos || []).map(b => savePhoto_(b, month + '_' + unit + '_' + it.date)).join(',');
    const o = {id, start: it.date, end: it.date, type: 'O', unit, title: it.title || '', crew: it.crew || '', hl, photos, src: 'round', createdBy: u.name, createdAt: now, ofOut: ''};
    append_('Events', o); evs.push(o); dates.push(it.date);
    if (hl) { const l = {id: newId_(), start: it.date, end: it.date, type: 'L', unit: '', title: 'ช่วยงาน ' + unit + '.', crew: '', hl: '', photos: '', src: 'round', createdBy: u.name, createdAt: now, ofOut: id}; append_('Events', l); evs.push(l); }
  });
  append_('Picks', {month, round: cfg.turn.round, unit, dates: dates.sort().join(','), by: u.name, at: now});
  if (unit !== u.unit) audit_(u, 'เลือกวันแทน ' + unit, dates.join(','));
  // คิวถัดไป
  cfg.turn.idx++; if (cfg.turn.idx >= cfg.order.length) { cfg.turn.idx = 0; cfg.turn.round++; }
  if (allDone_(cfg)) cfg.status = 'swap';
  setCfg_('round:' + month, cfg);
  notifyTurn_(month, cfg);
  return {ok: true};
}
function savePhoto_(dataUrl, name) {
  const m = String(dataUrl).match(/^data:(image\/\w+);base64,(.+)$/); if (!m) return '';
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + '.jpg');
  const f = DriveApp.getFolderById(SP.getProperty('FOLDER_ID')).createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return f.getId();
}
function addPhoto_(u, p) {
  const r = rows_('Events').find(e => e.id === p.id); if (!r) throw new Error('ไม่พบรายการ');
  if (r.unit !== u.unit && !isCo_(u) && !isPlanner_(u)) throw new Error('แนบรูปได้เฉพาะงานของหน่วยตัวเอง');
  const ids = (p.photos || []).map(b => savePhoto_(b, r.start + '_' + (r.unit || r.type)));
  const all = (r.photos ? String(r.photos).split(',') : []).concat(ids).filter(Boolean);
  update_('Events', r._row, {photos: all.join(',')});
  return {ok: true};
}

// ================= swap =================
function swapReq_(u, p) {
  const month = getCfg_('active', ''); const cfg = getCfg_('round:' + month, null);
  if (!cfg || cfg.status !== 'swap') throw new Error('ยังไม่เปิดให้แลกวัน');
  const unit = actUnit_(u, p.unit); const evs = rows_('Events');
  const A = evs.find(e => e.type === 'O' && e.start === p.a), B = evs.find(e => e.type === 'O' && e.start === p.b);
  if (!A || A.unit !== unit) throw new Error('วันแรกต้องเป็นวันของหน่วยคุณ');
  if (!B || B.unit === unit) throw new Error('วันที่ขอต้องเป็นของหน่วยอื่น');
  append_('Swaps', {id: newId_(), month, from: unit, to: B.unit, a: p.a, b: p.b, st: 'รอ', by: u.name, at: new Date().toISOString()});
  push_(idsOfUnit_(B.unit), '🔁 ' + UNAME[unit] + ' ขอแลกวันกับ ' + UNAME[B.unit] + '\nให้วัน ' + thD_(p.a) + ' ⇄ ขอวัน ' + thD_(p.b) + '\nเข้าไปกด ยอมรับ/ปฏิเสธ ในหน้าเลือกวัน');
  return {ok: true};
}
function swapAns_(u, p) {
  const s = rows_('Swaps').find(x => x.id === p.id); if (!s || s.st !== 'รอ') throw new Error('ไม่พบคำขอ');
  if (s.to !== u.unit && !isCo_(u)) throw new Error('ตอบได้เฉพาะหน่วยที่ถูกขอ');
  if (!p.ok) { update_('Swaps', s._row, {st: 'ปฏิเสธ', answeredBy: u.name, answeredAt: new Date().toISOString()}); push_(idsOfUnit_(s.from), '❌ ' + UNAME[s.to] + ' ปฏิเสธการแลกวัน ' + thD_(s.a) + ' ⇄ ' + thD_(s.b)); return {ok: true}; }
  const evs = rows_('Events');
  const A = evs.find(e => e.type === 'O' && e.start === s.a && e.unit === s.from), B = evs.find(e => e.type === 'O' && e.start === s.b && e.unit === s.to);
  if (!A || !B) { update_('Swaps', s._row, {st: 'ยกเลิก (วันเปลี่ยนไปแล้ว)'}); throw new Error('วันที่ขอแลกเปลี่ยนไปแล้ว'); }
  update_('Events', A._row, {start: s.b, end: s.b}); update_('Events', B._row, {start: s.a, end: s.a});
  evs.filter(e => e.type === 'L' && (e.ofOut === A.id || e.ofOut === B.id)).forEach(l => { const d = l.ofOut === A.id ? s.b : s.a; update_('Events', l._row, {start: d, end: d}); });
  update_('Swaps', s._row, {st: 'สำเร็จ', answeredBy: u.name, answeredAt: new Date().toISOString()});
  audit_(u, 'แลกวัน', s.from + ' ' + s.a + ' ⇄ ' + s.to + ' ' + s.b);
  push_(idsOfUnit_(s.from).concat(idsAdmins_()), '✅ แลกวันสำเร็จ\n' + UNAME[s.from] + ' ได้ ' + thD_(s.b) + ' · ' + UNAME[s.to] + ' ได้ ' + thD_(s.a));
  return {ok: true};
}

// ================= เอกสารขออนุมัติแผน: จำค่าที่พิมพ์ + ประวัติชื่อผู้ลงนาม/ผู้อนุมัติ =================
function docSave_(u, p) {
  if (rank_(u) < 2) throw new Error('ไม่มีสิทธิ์');
  const keep = ['from','to','no','dear','signName','signPos','apTo','apCc','apName','apPos','foot1','foot2'];
  const cur = getCfg_('doc', {fields: {}, names: []});
  keep.forEach(k => { if (p.doc && typeof p.doc[k] === 'string') cur.fields[k] = p.doc[k].slice(0, 200); });
  const add = (n, pos) => { n = (n || '').trim(); if (!n) return; cur.names = (cur.names || []).filter(x => x.n !== n); cur.names.unshift({n, pos: (pos || '').trim()}); cur.names = cur.names.slice(0, 20); };
  add(cur.fields.signName, cur.fields.signPos); add(cur.fields.apName, cur.fields.apPos);
  setCfg_('doc', cur);
  return {ok: true, doc: cur};
}

// ================= planner =================
function saveRound_(u, p) {
  if (!isPlanner_(u)) throw new Error('เฉพาะ ผกส./ผปบ. และแอดมิน');
  const month = p.month; const old = getCfg_('round:' + month, null); const c = p.cfg;
  if (old && old.status !== 'setup' && JSON.stringify(old.order) !== JSON.stringify(c.order)) throw new Error('เปลี่ยนลำดับได้เฉพาะก่อนเปิดรอบ');
  if (c.order.slice(0, 2).join() !== 'ผกส,ผปบ') throw new Error('ผกส. และ ผปบ. ต้องอยู่ลำดับ 1-2');
  const cfg = Object.assign({turn: {round: 1, idx: 0}, status: 'setup'}, old || {}, c);
  if (p.status) {
    if (p.status === 'open' && cfg.status === 'setup') cfg.turn = {round: 1, idx: 0};
    if (p.status === 'setup' && rows_('Picks').some(x => x.month === month)) throw new Error('มีหน่วยเลือกวันแล้ว ย้อนกลับไม่ได้');
    cfg.status = p.status;
  }
  const prev = old ? old.status : '';
  setCfg_('round:' + month, cfg);
  if (p.makeActive) setCfg_('active', month);
  if (p.status === 'open' && prev !== 'open') { push_(idsAll_(), '📅 เปิดเลือกวันดับไฟระดมทีม เดือน ' + mName_(month) + '\n' + cfg.rounds + ' รอบ · เรียงตามลำดับสิทธิ์ ' + cfg.order.map(x => x + '.').join(' → ') + (cfg.deadline ? '\nปิดรับ ' + thD_(cfg.deadline) : '')); notifyTurn_(month, cfg); }
  if (p.status === 'published' && prev !== 'published') push_(idsAll_(), '📢 ประกาศแผนงานระดมทีม เดือน ' + mName_(month) + ' แล้ว\nดูปฏิทินและพิมพ์แผนได้ที่ลิงก์');
  audit_(u, 'ตั้งค่ารอบ ' + month, {status: cfg.status, rounds: cfg.rounds});
  return {ok: true};
}
function addEvent_(u, p) {
  const e = p.ev; if (!'HTMLW'.includes(e.type)) throw new Error('ประเภทไม่ถูกต้อง');
  if (!isPlanner_(u)) throw new Error('เฉพาะ ผกส./ผปบ. และแอดมิน');
  append_('Events', {id: newId_(), start: e.start, end: e.end || e.start, type: e.type, unit: e.unit || '', title: e.title, crew: e.crew || '', hl: '', photos: '', src: 'admin', createdBy: u.name, createdAt: new Date().toISOString(), ofOut: ''});
  audit_(u, 'เพิ่มรายการ', e.type + ' ' + e.start + ' ' + e.title);
  return {ok: true};
}
function delEvent_(u, p) {
  const evs = rows_('Events'); const r = evs.find(e => e.id === p.id); if (!r) throw new Error('ไม่พบรายการ');
  if (r.type === 'O' ? !isCo_(u) : !isPlanner_(u)) throw new Error('ไม่มีสิทธิ์ลบรายการนี้');
  const sh = ss_().getSheetByName('Events');
  const linked = evs.filter(e => e.ofOut === r.id).map(e => e._row);
  [r._row].concat(linked).sort((a, b) => b - a).forEach(row => sh.deleteRow(row));
  audit_(u, 'ลบรายการ', r.type + ' ' + r.start + ' ' + r.unit + ' ' + r.title);
  return {ok: true};
}
function editEvent_(u, p) {
  const r = rows_('Events').find(e => e.id === p.id); if (!r) throw new Error('ไม่พบรายการ');
  const own = r.type === 'O' && r.unit === u.unit && rank_(u) >= 2;
  if (!own && !(r.type === 'O' ? isCo_(u) : isPlanner_(u))) throw new Error('ไม่มีสิทธิ์แก้ไข');
  update_('Events', r._row, {title: p.title, crew: p.crew});
  if (!own) audit_(u, 'แก้ไขแทน', r.start + ' ' + r.unit + ' → ' + p.title);
  return {ok: true};
}
function setUser_(u, p) {
  if (!isCo_(u)) throw new Error('เฉพาะแอดมิน/โคแอดมิน');
  const t = rows_('Users').find(x => x.lineId === p.lineId); if (!t) throw new Error('ไม่พบผู้ใช้');
  if (t.role === 'admin' && u.role !== 'admin') throw new Error('แก้ไขแอดมินระบบไม่ได้');
  if (p.role === 'admin' && u.role !== 'admin') throw new Error('ไม่มีสิทธิ์');
  if ((p.role === 'coadmin' || t.role === 'coadmin') && u.role !== 'admin' && p.role !== t.role) throw new Error('แต่งตั้ง/ถอดโคแอดมินได้เฉพาะแอดมินระบบ');
  if (p.role === 'planner' && !PLANNER_UNITS.includes(p.unit)) throw new Error('ผู้กำหนดต้องอยู่ ผกส. หรือ ผปบ.');
  if (p.role === 'admin' && t.lineId !== u.lineId) { // โอนแอดมิน
    const me = rows_('Users').find(x => x.lineId === u.lineId); update_('Users', me._row, {role: 'coadmin'});
  }
  update_('Users', t._row, {unit: p.unit, role: p.role, status: p.status});
  if (t.status !== 'approved' && p.status === 'approved') push_([t.lineId], '✅ อนุมัติให้เข้าใช้งานแผนระดมทีม กฟจ.กระบี่ แล้ว\nหน่วยงาน ' + UNAME[p.unit] + ' · สิทธิ์ ' + ({admin:'แอดมินระบบ', coadmin:'โคแอดมิน', planner:'ผู้กำหนด', picker:'ผู้เลือกวัน', viewer:'ดูอย่างเดียว'}[p.role] || p.role));
  audit_(u, 'ตั้งสิทธิ์ผู้ใช้', t.name + ' → ' + p.unit + ' / ' + p.role + ' / ' + p.status);
  return {ok: true};
}
