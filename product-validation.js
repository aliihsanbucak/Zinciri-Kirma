/* Schema validation is shared by startup, import and automated tests. */
(() => {
  'use strict';
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const string=(v,max=10000)=>typeof v==='string'&&v.length<=max;
  const date=v=>string(v,10)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  const id=v=>string(v,160)&&/^[a-zA-Z0-9_-]+$/.test(v);
  const fail=label=>{throw Error('Yedekte geçersiz '+label+' var. Mevcut kayıtların değiştirilmedi.')};
  function normalizeProduct(input,defaults){
    if(!object(input))fail('ürün ayarları');
    const d={...JSON.parse(JSON.stringify(defaults)),...input};
    if(d.language!=null&&!['tr','en'].includes(d.language))fail('dil tercihi');
    if(d.version!==1||!['light','dark'].includes(d.theme))fail('ürün sürümü veya tema');
    if(!object(d.water)||Object.entries(d.water).some(([k,v])=>!date(k)||!number(v,0,20000)))fail('su kaydı');
    if(!object(d.focus))fail('odak ayarları');
    d.focus={...defaults.focus,...d.focus};
    const f=d.focus;
    if(!number(f.minutes,1,180)||!Number.isInteger(f.minutes)||!number(f.remaining,0,10800)||typeof f.running!=='boolean'||!(f.end===null||number(f.end,1,9e15))||(f.running&&f.end===null)||!Array.isArray(f.sessions)||f.sessions.some(s=>!object(s)||!id(s.id)||!date(s.date)||!number(s.minutes,1,180)))fail('odak oturumu');
    if(!Array.isArray(d.portfolio)||d.portfolio.some(p=>!object(p)||!id(p.id)||!string(p.name,60)||!p.name.trim()||!string(p.category,40)||!['TRY','USD','EUR'].includes(p.currency)||!number(p.quantity,1e-8,1e12)||!number(p.cost,0,1e12)||!number(p.price,0,1e12)||!date(p.updated)))fail('portföy satırı');
    if(!object(d.budgetLimits)||Object.entries(d.budgetLimits).some(([k,v])=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(k)||!number(v,1,1e9)))fail('bütçe limiti');
    if(!Array.isArray(d.workoutPlan)||d.workoutPlan.some(i=>!Number.isInteger(i)||i<0||i>6)||new Set(d.workoutPlan).size!==d.workoutPlan.length||!Number.isInteger(d.workoutGoal)||d.workoutGoal<1||d.workoutGoal>7)fail('antrenman planı');
    if(!object(d.journalDraft)||(d.journalDraft.date!=null&&!date(d.journalDraft.date))||(d.journalDraft.entry!=null&&!string(d.journalDraft.entry,10000))||(d.journalDraft.grateful!=null&&!string(d.journalDraft.grateful,1000)))fail('günlük taslağı');
    if(!object(d.review)||!Array.isArray(d.favorites))fail('ek kayıtlar');
    if(d.lastBackup!=null&&(!string(d.lastBackup,40)||Number.isNaN(Date.parse(d.lastBackup))))fail('yedek tarihi');
    if(d.workout!==null){
      const w=d.workout;
      const numeric=(v,min,max,integer=false)=>v===''||((typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&number(Number(v),min,max)&&(!integer||Number.isInteger(Number(v))));
      if(!object(w)||!id(w.id)||!string(w.name,100)||!date(w.date)||!number(w.startedAt,1,9e15)||!numeric(w.duration,1,600)||!string(w.note,2000)||!(w.restEnd===null||number(w.restEnd,1,9e15))||!Array.isArray(w.exercises)||w.exercises.length>100)fail('antrenman taslağı');
      for(const ex of w.exercises){
        if(!object(ex)||!id(ex.id)||!string(ex.name,100)||(ex.source!=null&&!string(ex.source,100))||!ex.name.trim()||!Array.isArray(ex.sets)||ex.sets.length<1||ex.sets.length>15)fail('hareket');
        for(const s of ex.sets)if(!object(s)||!numeric(s.weight,0,1000)||!numeric(s.reps,1,500,true)||!numeric(s.rir,0,10,true)||typeof s.done!=='boolean'||(s.done&&(s.weight===''||s.reps==='')))fail('antrenman seti');
      }
    }
    return d;
  }
  function validateLegacy(key,value){
    const parsed=JSON.parse(value);
    if(/Sport2026$/.test(key)){
      if(!object(parsed)||!['sessions','swim','cardio','measurements'].every(k=>Array.isArray(parsed[k])))fail('spor listesi');
      for(const s of parsed.sessions){if(!object(s)||!id(s.id)||!date(s.date)||!Array.isArray(s.exercises))fail('spor seansı');for(const ex of s.exercises){if(!object(ex)||!string(ex.name,200)||!Array.isArray(ex.sets)||ex.sets.some(t=>!object(t)))fail('spor setleri')}}
      if([...parsed.swim,...parsed.cardio,...parsed.measurements].some(s=>!object(s)||!date(s.date)))fail('spor geçmişi');
      if(parsed.astra!=null&&(!object(parsed.astra)||!object(parsed.astra.daily)||!object(parsed.astra.reviews)||!object(parsed.astra.settings)))fail('ayrıntılı spor ayarları');
    }
    if(/Tasks2026$/.test(key)&&(!object(parsed)||!Array.isArray(parsed.tasks)||parsed.tasks.some(t=>!object(t)||!id(t.id)||!date(t.date)||!string(t.text)||typeof t.done!=='boolean')))fail('görev');
    if(/Routine2026$/.test(key)&&(!object(parsed)||!Array.isArray(parsed.tasks)||!object(parsed.completions)||parsed.tasks.some(t=>!object(t)||!id(t.id)||!string(t.name)||!Array.isArray(t.days)||t.days.some(n=>!Number.isInteger(n)||n<0||n>6))))fail('rutin');
    if(/Calorie2026$/.test(key)&&(!Array.isArray(parsed)||parsed.some(l=>!object(l)||!id(l.id)||!date(l.date)||!string(l.meal,100)||!number(l.totalKcal,0,100000)||!Array.isArray(l.items)||l.items.some(i=>!object(i)||!string(i.name)||!number(i.kcal,0,100000))||(l.macros!=null&&!object(l.macros)))))fail('öğün');
    if(/Invest2026$/.test(key)&&(!Array.isArray(parsed)||parsed.some(n=>!object(n)||!id(n.id)||!string(n.symbol,200)||!string(n.note))))fail('yatırım notu');
    if(/Budget2026$/.test(key)&&(!Array.isArray(parsed)||parsed.some(t=>!object(t)||!id(t.id)||!date(t.date)||!number(t.amount,0,1e15)||!['income','expense'].includes(t.type))))fail('bütçe işlemi');
    if(/Events2026$/.test(key)&&(!Array.isArray(parsed)||parsed.some(e=>!object(e)||!id(e.id)||!string(e.title||e.name,200))))fail('takvim kaydı');
    if(key==='zinciriKirma2026'){
      if(!object(parsed)||!object(parsed.user)||!string(parsed.user.name,200)||!Array.isArray(parsed.habits)||!object(parsed.completions)||!Array.isArray(parsed.journal)||!Array.isArray(parsed.achievements))fail('ana kayıt');
      if(parsed.habits.some(h=>!object(h)||!id(h.id)||!string(h.name,1000)))fail('alışkanlık');
      if(Object.entries(parsed.completions).some(([k,v])=>!date(k)||!object(v)||Object.values(v).some(x=>typeof x!=='boolean')))fail('alışkanlık tamamlaması');
      if(parsed.journal.some(j=>!object(j)||!date(j.date)||!string(j.text)||!string(j.grateful??'')))fail('günlük kaydı');
    }
  }
  globalThis.ZKValidation={normalizeProduct,validateLegacy,date};
})();
