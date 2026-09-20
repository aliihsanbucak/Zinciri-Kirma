/* Personal practices: opt-in prayer, yoga, meditation, or user-defined routines. */
(() => {
  'use strict';
  const Z=window.ZK,E=Z.esc,B=Z.button,I=Z.icon,T=ZKI18n.t;
  const dayNames=['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const templates={prayer:[['fajr','Sabah namazı'],['dhuhr','Öğle namazı'],['asr','İkindi namazı'],['maghrib','Akşam namazı'],['isha','Yatsı namazı']],wellbeing:[['yoga','Yoga'],['meditation','Meditasyon']]};
  const P=Z.practices={
    date:()=>Z.practiceDate||Z.today(),
    day:date=>(new Date(date+'T12:00:00').getDay()+6)%7,
    scheduled(date){return Z.data.practices.items.filter(item=>!item.archived&&item.createdAt<=date&&item.days.includes(P.day(date)))},
    complete(date,id){return Z.data.practices.completions[date]?.[id]===true},
    toggle(date,id){if(!ZKValidation.date(date)||date>Z.today()||!P.scheduled(date).some(item=>item.id===id))return false;const logs=Z.data.practices.completions;logs[date]||={};if(logs[date][id])delete logs[date][id];else logs[date][id]=true;if(!Object.keys(logs[date]).length)delete logs[date];Z.write();return true},
    addTemplate(key,date=P.date()){
      if(!templates[key]||!ZKValidation.date(date)||date>Z.today())return 0;
      let added=0;
      for(const [templateKey,name] of templates[key]){const existing=Z.data.practices.items.find(item=>item.templateKey===templateKey);if(existing){if(existing.archived){existing.archived=false;added++}continue}
        Z.data.practices.items.push({id:Z.uid(),name:T(name),templateKey,days:[0,1,2,3,4,5,6],createdAt:date,archived:false});added++;
      }
      Z.write();return added;
    },
    row(item,date,editable=false){const done=P.complete(date,item.id);return `<div class="zk-row zk-practice-row ${done?'done':''}"><button class="zk-check" data-zk="practiceToggle" data-id="${E(item.id)}" data-date="${date}" data-user-label aria-label="${E(item.name)}" aria-pressed="${done}">${I('check')}</button><div class="zk-row-body"><strong>${Z.userHTML(item.name)}</strong>${editable?`<small>${item.days.length===7?'Her gün':item.days.map(d=>T(dayNames[d])).join(' · ')}</small>`:''}</div>${editable?B('Düzenle','practiceEdit',`data-id="${E(item.id)}"`,'small'):''}</div>`},
    refresh(id){if(state.currentPage==='practices')Z.renderPractices();P.renderToday();if(id)[...document.querySelectorAll('.page:not(.hidden) [data-zk="practiceToggle"]')].find(b=>b.dataset.id===id)?.focus({preventScroll:true})},
    renderToday(){const host=document.querySelector('#page-today .zk-columns>.zk-stack');if(!host)return;let panel=document.getElementById('zk-today-practices');if(!panel){panel=document.createElement('section');panel.id='zk-today-practices';panel.className='zk-panel';host.append(panel)}const items=P.scheduled(Z.today()),done=items.filter(item=>P.complete(Z.today(),item.id)).length;panel.innerHTML=`<div class="zk-section-head"><h2>Kişisel pratikler</h2>${B('Bölüme git','go','data-page="practices"','small')}</div>${items.length?`<p class="zk-note" role="status">${done} / ${items.length} ${T('tamamlandı')}</p>${items.map(item=>P.row(item,Z.today())).join('')}`:`<p class="zk-note">İbadet, yoga veya meditasyon için kendine bir alan aç.</p>${B('Pratiklerini seç','go','data-page="practices"')}`}`}
  };
  const oldToday=Z.renderToday;Z.renderToday=function(){oldToday();P.renderToday()};
  Z.renderPractices=function(){
    const date=P.date(),items=P.scheduled(date),all=Z.data.practices.items.filter(item=>!item.archived),done=items.filter(item=>P.complete(date,item.id)).length;
    const history=Array.from({length:7},(_,i)=>{const d=new Date(Z.today()+'T12:00:00');d.setDate(d.getDate()-6+i);return getDayKey(d)});
    document.getElementById('page-practices').innerHTML=Z.heading('practices')+`
      <div class="zk-practice-date"><button class="zk-icon-button" data-zk="practiceDay" data-offset="-1" aria-label="Önceki gün">${I('arrow')}</button><label class="zk-field">Takip tarihi<input type="date" id="zk-practice-date" value="${date}" max="${Z.today()}" required></label><button class="zk-icon-button" data-zk="practiceDay" data-offset="1" ${date>=Z.today()?'disabled':''} aria-label="Sonraki gün">${I('arrow')}</button>${B('Bugün','practiceToday','','small')}</div>
      <div class="zk-two"><section class="zk-panel"><div class="zk-section-head"><h2>Günün pratikleri</h2><span class="zk-chip green" role="status">${done} / ${items.length} ${T('tamamlandı')}</span></div>
      ${items.length?items.map(item=>P.row(item,date)).join(''):`<p class="zk-note">${all.length?'Bu tarih için planlanmış pratiğin yok. Günleri düzenleyebilir veya yeni bir pratik ekleyebilirsin.':'Sana uygun başlangıcı seç. Namaz, yoga veya kendi pratiğin; seçim sana ait.'}</p>`}
      <p class="zk-note">İşaretlerin seçtiğin güne kaydedilir. Bir sonraki gün yeni bir listeyle başlarsın.</p></section>
      <section class="zk-panel"><h2>Bir başlangıç seç</h2><p class="zk-note">Hazır seçenekler isteğe bağlıdır. Birlikte kullanabilir, adlarını ve günlerini değiştirebilirsin.</p><div class="zk-practice-template"><div><h3>Beş vakit namaz</h3><p class="zk-note">Sabah, öğle, ikindi, akşam ve yatsı.</p></div>${B('Namazları ekle','practiceTemplate','data-template="prayer"','primary')}</div><div class="zk-practice-template"><div><h3>Yoga & meditasyon</h3><p class="zk-note">Hareket etmek ve kendini dinlemek için.</p></div>${B('Yoga ve meditasyonu ekle','practiceTemplate','data-template="wellbeing"')}</div><p class="zk-note">Bu alan bir işaretleme defteridir; namaz vakti hesaplamaz veya bildirim göndermez.</p></section></div>
      <section class="zk-panel zk-practice-manage"><h2>Kendi pratiğini ekle</h2><form class="zk-inline-form" data-zk-form="practiceAdd"><input name="name" required maxlength="100" placeholder="Örn. dua, nefes egzersizi, esneme" aria-label="Pratik adı"><button class="zk-btn primary" type="submit">Ekle</button></form><p class="zk-note">Yeni pratik her güne eklenir. Düzenle düğmesiyle günlerini değiştirebilirsin.</p>
      ${all.length?`<details class="zk-practice-settings"><summary>Pratikleri ve günlerini düzenle</summary>${all.map(item=>P.row(item,date,true).replace(/<button class="zk-check"[\s\S]*?<\/button>/,'')).join('')}</details>`:''}</section>
      <section class="zk-panel zk-practice-manage"><h2>Son yedi gün</h2><div class="zk-practice-history">${history.map(day=>`<button class="zk-practice-history-day ${day===date?'selected':''}" data-zk="practiceSelectDay" data-date="${day}" aria-pressed="${day===date}"><span>${Z.dateLabel(day)}</span><strong>${Object.values(Z.data.practices.completions[day]||{}).filter(Boolean).length}</strong></button>`).join('')}</div><p class="zk-note">Sayılar o gün işaretlediğin pratikleri gösterir. Arşivlediğin pratiklerin eski kayıtları saklanır.</p></section>`;
  };
  Object.assign(Z.actions,{
    practiceToggle:b=>{if(P.toggle(b.dataset.date,b.dataset.id))P.refresh(b.dataset.id)},
    practiceTemplate:b=>{const count=P.addTemplate(b.dataset.template);P.refresh();Z.toast(count?'Seçtiğin pratikler eklendi.':'Bu pratikler zaten listende.')},
    practiceToday:()=>{Z.practiceDate=null;Z.renderPractices()},
    practiceSelectDay:b=>{if(ZKValidation.date(b.dataset.date)&&b.dataset.date<=Z.today()){Z.practiceDate=b.dataset.date;Z.renderPractices()}},
    practiceDay:b=>{const d=new Date(P.date()+'T12:00:00');d.setDate(d.getDate()+Number(b.dataset.offset));const date=getDayKey(d);if(date<=Z.today()){Z.practiceDate=date;Z.renderPractices()}},
    practiceEdit:b=>{const item=Z.data.practices.items.find(item=>item.id===b.dataset.id);if(!item)return;Z.dialog('Pratiği düzenle',`<form class="zk-form" data-zk-form="practiceEdit"><input type="hidden" name="id" value="${E(item.id)}">${Z.field('practice-name','Pratik adı','text',item.name,'required maxlength="100"')}<fieldset class="zk-practice-days"><legend>Günler</legend>${dayNames.map((day,i)=>`<label class="zk-start-choice"><input type="checkbox" name="days" value="${i}" ${item.days.includes(i)?'checked':''}>${day}</label>`).join('')}</fieldset><button class="zk-btn primary" type="submit">Değişiklikleri kaydet</button>${B('Pratiği arşivle','practiceArchive',`type="button" data-id="${E(item.id)}"`,'danger')}<p class="zk-note">Arşivlemek geçmişteki işaretlerini silmez.</p></form>`)},
    practiceArchive:b=>{const id=b.dataset.id,item=Z.data.practices.items.find(item=>item.id===id);if(!item)return;item.archived=true;Z.write();Z.closeDialog();P.refresh();Z.toast('Pratik arşivlendi.',()=>{const restored=Z.data.practices.items.find(item=>item.id===id);if(restored){restored.archived=false;Z.write();P.refresh()}})}
  });
  Object.assign(Z.forms,{
    practiceAdd:form=>{const name=form.elements.name.value.trim();if(!name)return;Z.data.practices.items.push({id:Z.uid(),name,days:[0,1,2,3,4,5,6],createdAt:P.date(),archived:false});Z.write();P.refresh();Z.toast('Pratiğin eklendi.')},
    practiceEdit:form=>{const item=Z.data.practices.items.find(item=>item.id===form.elements.id.value),name=form.elements['practice-name'].value.trim(),days=[...form.querySelectorAll('[name=days]:checked')].map(el=>Number(el.value));if(!item||!name)return;if(!days.length)return Z.toast('En az bir gün seç.');Object.assign(item,{name,days});Z.write();Z.closeDialog();P.refresh();Z.toast('Değişikliklerin kaydedildi.')}
  });
  document.addEventListener('change',event=>{if(event.target.id!=='zk-practice-date')return;const date=event.target.value;if(!ZKValidation.date(date)||date>Z.today()){event.target.value=P.date();return}Z.practiceDate=date;Z.renderPractices()});
})();
