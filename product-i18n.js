/* DOM adapter for authored legacy templates. Never modifies storage values or input values. */
(() => {
  'use strict';
  const dictionary=globalThis.ZK_EN||{};
  let language='tr';
  try {const saved=JSON.parse(localStorage.getItem('zk_product_v1')||'{}').language;language=['tr','en'].includes(saved)?saved:localStorage.getItem('zinciriKirma2026')?'tr':navigator.language?.startsWith('tr')?'tr':'en'}catch{}
  const plural=(n,word)=>`${n} ${word}${Number(n)===1?'':'s'}`;
  const rules=[
    [/^(\d+)\. [Hh]afta(.*)$/,(_,n,tail)=>`Week ${n}${tail}`],
    [/^(\d+)\/(\d+) gün$/,(_,a,b)=>`${a}/${b} days`],
    [/^(Upper A|Upper B|Lower A|Lower B) başlat$/,(_,name)=>`Start ${name}`],
    [/^(.+): henüz ölçüm yok\.$/,(_,label)=>`${t(label)}: no measurements yet.`],
    [/^(\d{4}-\d{2}) ayındaki giderler bu limitle karşılaştırılır\.$/,(_,month)=>`Expenses for ${month} are compared with this limit.`],
    [/^(\d+:\d+) dinlenme$/,(_,clock)=>`${clock} rest`],
    [/^(\d+) gündür devam ediyorsun\.$/,(_,n)=>`You've kept going for ${plural(n,'day')}.`],
    [/^(\d+) \/ (\d+) tamamlandı$/,(_,a,b)=>`${a} / ${b} complete`],
    [/^Bu hafta (\d+) kez kendin için adım attın\.$/,(_,n)=>`You took ${plural(n,'step')} for yourself this week.`],
    [/^(\d+) gün \/ ay · (.*)$/,(_,n,tail)=>`${plural(n,'day')} / month · ${t(tail)}`],
    [/^(\d+) gün seri$/,(_,n)=>`${n}-day streak`],
    [/^(\d+) odak oturumu bugün tamamlandı$/,(_,n)=>`${plural(n,'focus session')} completed today`],
    [/^Önceki günlerden (\d+) açık görev$/,(_,n)=>`${plural(n,'unfinished task')} from previous days`],
    [/^Bugün (\d+) \/ (\d+)$/,(_,a,b)=>`Today ${a} / ${b}`],
    [/^(\d+) aktif gün · (\d+) tamamlama$/,(_,a,b)=>`${plural(a,'active day')} · ${plural(b,'completion')}`],
    [/^Son 28 gün: (\d+) aktif gün, (\d+) alışkanlık tamamlandı$/,(_,a,b)=>`Last 28 days: ${plural(a,'active day')}, ${plural(b,'habit')} completed`],
    [/^(\d+) alışkanlığın bugün seni bekliyor\.$/,(_,n)=>`${plural(n,'habit')} waiting for you today.`],
    [/^(\d+) rutin adımı eklendi\.$/,(_,n)=>`${plural(n,'routine step')} added.`],
    [/^(.+) kcal hedefin üzerinde\.(.*)$/,(_,n,tail)=>`${n} kcal above your goal.${tail?' '+t(tail.trim()):''}`],
    [/^(.+) kcal hedefe kalan\.(.*)$/,(_,n,tail)=>`${n} kcal remaining to your goal.${tail?' '+t(tail.trim()):''}`],
    [/^(.+) harcandı\.$/,(_,n)=>`${n} spent.`],
    [/^(.+) limitin üzerinde\.$/,(_,n)=>`${n} above your limit.`],
    [/^(.+) kullanılabilir limit\.$/,(_,n)=>`${n} available within your limit.`],
    [/^(.+) seviyesine ([\d.,]+) XP kaldı\.$/,(_,rank,n)=>`${n} XP to ${t(rank)}.`],
    [/^Tamamlama başına (\d+) XP\. Kaydı geri aldığında puan da geri alınır\.$/,(_,n)=>`${n} XP per completion. Undoing a record also removes its points.`],
    [/^Günlük kaydı başına (\d+) XP\. Aynı kayıt iki kez puan kazandırmaz\.$/,(_,n)=>`${n} XP per journal entry. The same entry never earns points twice.`],
    [/^(\d+) veri bölümü doğrulandı\. Bu işlem mevcut kayıtlarının yerine seçtiğin yedeği koyar\.$/,(_,n)=>`${plural(n,'data section')} validated. This replaces your current records with the selected backup.`],
    [/^Yedekte geçersiz .+ var\. Mevcut kayıtların değiştirilmedi\.$/,()=>`The backup contains invalid data. Your existing records have not been changed.`],
    [/^(.+) için ayarlar$/,(_,name)=>`Settings for ${name}`],
    [/^(.+) hareketini kaldır$/,(_,name)=>`Remove ${name}`],
    [/^(.+) (\d+)\. set tamamlandı$/,(_,name,n)=>`${name}, set ${n} complete`],
    [/^(.+) (\d+)\. set (kg|Tekrar|RIR)$/,(_,name,n,label)=>`${name}, set ${n}, ${label==='Tekrar'?'reps':label}`],
    [/^(.+) tamamlandı$/,(_,name)=>`${name} completed`],
    [/^(.+): (\d+) \/ (\d+) alışkanlık$/,(_,date,a,b)=>`${t(date)}: ${a} / ${b} habits`],
    [/^(.+): gelecek gün$/,(_,date)=>`${t(date)}: upcoming day`],
    [/^(.+): (\d+) tamamlama$/,(_,date,n)=>`${t(date)}: ${plural(n,'completion')}`],
    [/^(\d+) (dk|dakika|sn|tekrar|hareket|gün|hafta|ay|tamamlama|alışkanlık)$/,(_,n,unit)=>plural(n,({dk:'min',dakika:'minute',sn:'sec',tekrar:'rep',hareket:'exercise',gün:'day',hafta:'week',ay:'month',tamamlama:'completion',alışkanlık:'habit'})[unit]).replace(/(min|sec)s$/,'$1')],
    [/^(Son kayıt:|Son yedek:|Tekrar değerlendir:|Bir sonraki:)\s*(.*)$/,(_,prefix,tail)=>`${dictionary[prefix]||({ 'Tekrar değerlendir:':'Review again:', 'Bir sonraki:':'Next:'})[prefix]} ${t(tail)}`],
    [/^([A-Z]{3}) · Güncel kayıt değeri$/,(_,c)=>`${c} · Current recorded value`],
    [/^(.+) · Kaydi fark$/,(_,n)=>`${n} · Unrealized gain / loss`],
    [/^(\d{1,2}) (\p{L}{3,})( \d{4})?$/u,(_,day,month,year)=>dictionary[month]?`${dictionary[month]} ${day}${year?', '+year.trim():''}`:`${day} ${month}${year||''}`],
    [/^(\p{L}+) (\d{4})$/u,(_,month,year)=>dictionary[month]?`${dictionary[month]} ${year}`:`${month} ${year}`]
  ];
  const folded=new Map(Object.entries(dictionary).map(([k,v])=>[k.toLocaleLowerCase('tr'),v]));
  function t(input){
    const raw=String(input??'');if(language==='tr')return raw;
    const s=raw.trim().replace(/\s+/g,' ');if(!s)return raw;
    let translated=dictionary[s];
    if(translated===undefined){for(const [re,replace] of rules){if(re.test(s)){translated=s.replace(re,replace);break}}}
    if(translated===undefined){const decoration=s.match(/^([^\p{L}\p{N}]*)([\s\S]*?)(\s*[^\p{L}\p{N}]*)?$/u);if(decoration&&(decoration[1]||decoration[3])&&dictionary[decoration[2].trim()])translated=decoration[1]+dictionary[decoration[2].trim()]+(decoration[3]||'')}
    if(translated===undefined&&s.includes(' · ')){const parts=s.split(' · ');const mapped=parts.map(part=>t(part));if(mapped.some((v,i)=>v!==parts[i]))translated=mapped.join(' · ')}
    if(translated===undefined&&s===s.toLocaleUpperCase('tr')&&folded.has(s.toLocaleLowerCase('tr')))translated=folded.get(s.toLocaleLowerCase('tr')).toUpperCase();
    return translated===undefined?raw:raw.slice(0,raw.indexOf(raw.trim()))+translated+raw.slice(raw.indexOf(raw.trim())+raw.trim().length);
  }
  const originals=new WeakMap(),attributeSources=new WeakMap();
  const excluded='script,style,textarea,[translate="no"],[data-user-content],.habit-label,.tasks-task-text,.task-text,.routine-task-name,.journal-entry-text,.journal-grateful-text,.cal-item-name,.invest-note-text,.invest-note-symbol,.budget-txn-name,.event-title,.event-note,.txn-desc,.astra-ex>strong,.astra-ex>h3,.event-today-title,.habit-name-cell,.hgr-label,.bh-label,.sr-label,.y-bh-label,.journal-entry-grateful,[data-zk=foodRepeat]';
  function textNode(node){
    const parent=node.parentElement;if(!parent||parent.closest(excluded))return;
    const current=node.nodeValue,old=originals.get(node);const source=old&&current===old.output?old.source:current;
    // Explicit option values preserve legacy form semantics while labels are translated.
    if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.setAttribute('value',parent.textContent);
    const output=source==='Tekrar'&&parent.closest('.zk-set')&&language==='en'?'Reps':t(source);
    originals.set(node,{source,output});if(current!==output)node.nodeValue=output;
  }
  function attributes(el){
    if(el.closest('script,style,[translate="no"],[data-user-content]'))return;
    for(const name of ['placeholder','title','aria-label','alt','data-label']){
      if(!el.hasAttribute(name))continue;
      // A record's exact accessible name remains authored by its user.
      if(name==='aria-label'&&el.matches('[data-zk="habitDone"],[data-zk="taskDone"],[data-user-label]'))continue;
      let map=attributeSources.get(el);if(!map){map={};attributeSources.set(el,map)}
      const current=el.getAttribute(name),old=map[name],source=old&&current===old.output?old.source:current,output=t(source);
      map[name]={source,output};if(current!==output)el.setAttribute(name,output);
    }
  }
  const excludedElements=excluded.replace('textarea,','');
  function apply(root=document.body){
    if(!root)return;if(root.nodeType===3){textNode(root);return}
    if(root.nodeType!==1&&root.nodeType!==9)return;
    const tables=[...(root.querySelectorAll?.('table.zk-table')||[])];if(root.matches?.('table.zk-table'))tables.push(root);
    for(const table of tables){const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent);table.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(!td.hasAttribute('data-label'))td.setAttribute('data-label',labels[i]||'')}))}
    if(root.nodeType===1){if(root.closest(excludedElements))return;attributes(root)}
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:node=>node.nodeType===1&&node.matches(excludedElements)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let node;while((node=walker.nextNode()))node.nodeType===3?textNode(node):attributes(node);
  }
  function updateHeader(){document.documentElement.lang=language;document.documentElement.dataset.language=language;document.querySelectorAll('.zk-top-date').forEach(el=>el.textContent=new Date().toLocaleDateString(api.locale(),{day:'numeric',month:'long',year:'numeric'}));document.querySelectorAll('[data-language-picker]').forEach(el=>el.value=language);}
  function setLanguage(value){
    if(!['tr','en'].includes(value))throw Error('Unsupported language');
    if(window.ZK){const before=ZK.data.language;ZK.data.language=value;try{ZK.write()}catch(e){ZK.data.language=before;throw e}}
    else {const data=JSON.parse(localStorage.getItem('zk_product_v1')||'{}');data.language=value;localStorage.setItem('zk_product_v1',JSON.stringify(data))}
    language=value;updateHeader();apply(document.documentElement);
  }
  const api=globalThis.ZKI18n={t,apply,setLanguage,get language(){return language},locale:()=>language==='en'?'en-US':'tr-TR',
    picker:()=>`<label class="zk-field zk-language-field">${t('Uygulama dili')}<select name="language" data-language-picker aria-label="${t('Uygulama dili')}"><option value="tr" lang="tr" translate="no" ${language==='tr'?'selected':''}>Türkçe</option><option value="en" lang="en" translate="no" ${language==='en'?'selected':''}>English</option></select></label>`};
  document.documentElement.lang=language;
  for(const name of ['alert','confirm','prompt']){const original=window[name];if(typeof original==='function')window[name]=function(message,...args){return original.call(window,t(message),...args)}}
  document.addEventListener('DOMContentLoaded',()=>{
    updateHeader();apply(document.documentElement);
    const observer=new MutationObserver(records=>{for(const record of records){if(record.type==='childList')record.addedNodes.forEach(apply);else if(record.type==='characterData')textNode(record.target);else attributes(record.target)}});
    observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label','alt']});
    document.addEventListener('change',event=>{if(!event.target.matches('.zk-start [data-language-picker]'))return;try{setLanguage(event.target.value)}catch{event.target.value=language;window.ZK?.toast(t('Kayıt saklanamadı. Cihazında yer açıp yeniden dene.'))}});
  });
})();
