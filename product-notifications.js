/* Notification delivery and schedules. Web timers need a running page; native schedules use the OS. */
(() => {
  'use strict';
  const Z=window.ZK,E=Z.esc;
  const tr=(a,b)=>ZKI18n.language==='en'?b:a;
  const sections=['planner','tasks','routine','sport','calorie','practices','journal','budget','invest'];
  const bodies={focus:()=>tr('Odak oturumun tamamlandı. Kısa bir mola ver.','Your focus session is complete. Take a short break.'),rest:()=>tr('Dinlenme süresi tamamlandı. Hazır olduğunda devam et.','Rest time is over. Continue when you are ready.')};
  let busy=false,queue=Promise.resolve(),syncTimer;
  const sent=new Set(Z.read('zk_notification_delivered',[]));
  const N=Z.notifications={
    config:()=>Z.data.notifications,
    native:()=>window.ZKNativeNotifications,
    async permission(){return N.native()?N.native().permission():('Notification' in window?Notification.permission:'unsupported')},
    async enable(){
      let permission;
      if(N.native())permission=await N.native().request();
      else if(!window.isSecureContext||!('Notification' in window)){throw Error(tr('Bildirim için HTTPS bağlantısı ve destekleyen bir tarayıcı gerekir. iPhone’da Safari’den ana ekrana ekleyip oradan aç.','Notifications need HTTPS and a supported browser. On iPhone, add the site to your Home Screen from Safari and open it there.'))}
      else permission=await Notification.requestPermission();
      if(permission!=='granted')throw Error(tr('Bildirim izni verilmedi. Cihazın site veya uygulama ayarlarından izni aç.','Notification permission was not granted. Enable it in your device’s site or app settings.'));
      await N.syncNow();return permission;
    },
    fail(error){console.error('Notifications:',error);N.error=error.message||String(error);Z.toast(tr('Bildirim gönderilemedi. Ayarlar → Bildirimler bölümünü kontrol et.','Notification failed. Check Settings → Notifications.'));N.renderStatus()},
    async show(body,page='today',tag='zk-message'){
      if(await N.permission()!=='granted')return false;
      if(N.native()){await N.native().show(body,page);return true}
      // Mobile browsers require a service-worker notification, not new Notification().
      let reg=await navigator.serviceWorker?.getRegistration(new URL('./',location.href).href);
      if(!reg&&navigator.serviceWorker)reg=await navigator.serviceWorker.register('./sw.js');
      if(!reg)throw Error(tr('Bildirim servisi başlatılamadı. Uygulamayı HTTPS üzerinden aç.','Notification service could not start. Open the app over HTTPS.'));
      if(!reg.active)await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error(tr('Bildirim servisi hazırlanamadı. Sayfayı yenileyip tekrar dene.','Notification service is not ready. Reload and try again.'))),10000))]);
      await reg.showNotification('Zinciri Kırma',{body,icon:new URL('./assets/icon-192.png',location.href).href,badge:new URL('./assets/icon-192.png',location.href).href,tag,data:{page},silent:false});return true;
    },
    complete(kind){if(N.native()||!N.config()[kind])return;N.show(bodies[kind](),kind==='rest'?'sport':'today','zk-'+kind).catch(N.fail)},
    eventPlans(now=Date.now()){
      const rows=Z.read('zinciriKirmaEvents2026',[]);
      return (Array.isArray(rows)?rows:[]).filter(e=>!e.completed&&ZKValidation.date(e.date)).map(e=>({key:'event-'+e.id+'-'+e.date+'-'+(e.time||'09:00'),body:String(e.title||''),page:'events',at:new Date(e.date+'T'+(e.time||'09:00')+':00').getTime()})).filter(e=>Number.isFinite(e.at)&&e.at>=now-90000).sort((a,b)=>a.at-b.at).slice(0,40);
    },
    plans(){const list=[],c=N.config(),f=Z.data.focus,w=Z.data.workout,now=Date.now();
      if(c.focus&&f.running&&f.end>now)list.push({id:41001,body:bodies.focus(),page:'today',at:f.end,timer:true});
      if(c.rest&&w?.restEnd>now)list.push({id:41002,body:bodies.rest(),page:'sport',at:w.restEnd,timer:true});
      sections.forEach((page,i)=>{if(c.daily[page]){const [hour,minute]=c.daily[page].split(':').map(Number);list.push({id:41100+i,body:ZKI18n.t(Z.pages[page][0])+tr(': Kendine birkaç dakika ayır.',': Take a few minutes for yourself.'),page,hour,minute})}});
      if(c.events)N.eventPlans(now).filter(e=>e.at>now).forEach((e,i)=>list.push({...e,id:41200+i}));return list;
    },
    sync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>N.syncNow().catch(N.fail),100)},
    syncNow(){queue=queue.catch(()=>{}).then(async()=>{if(N.native())await N.native().replace(N.plans())});return queue},
    async poll(now=Date.now()){
      if(busy||N.native())return;if(await N.permission()!=='granted'||busy)return;busy=true;
      try{const date=getToday(),due=[],c=N.config();
        for(const [page,time] of Object.entries(c.daily)){const at=new Date(date+'T'+time+':00').getTime();if(now>=at&&now-at<90000)due.push({key:'daily-'+page+'-'+date,body:ZKI18n.t(Z.pages[page][0])+tr(': Kendine birkaç dakika ayır.',': Take a few minutes for yourself.'),page})}
        if(c.events)due.push(...N.eventPlans(now).filter(e=>e.at<=now));
        for(const e of due){if(sent.has(e.key))continue;if(await N.show(e.body,e.page,e.key)){sent.add(e.key);while(sent.size>100)sent.delete(sent.values().next().value);localStorage.setItem('zk_notification_delivered',JSON.stringify([...sent]))}}
      }finally{busy=false}
    },
    async renderStatus(){const el=document.getElementById('zk-notification-status');if(!el)return;const permission=await N.permission();if(!el.isConnected)return;el.textContent=tr('Bildirim izni: ','Notification permission: ')+({granted:tr('Açık','Granted'),denied:tr('Engellendi — cihaz ayarlarından aç','Blocked — enable in device settings'),default:tr('Henüz istenmedi','Not requested'),unsupported:tr('Bu ortamda desteklenmiyor','Unsupported in this environment')}[permission]||permission)+(N.error?' · '+N.error:'')},
    markup(){const c=N.config();return `<section class="zk-panel" style="margin-top:24px" translate="no"><h2>${tr('Bildirimler','Notifications')}</h2><p id="zk-notification-status" class="zk-note" role="status"></p><p class="zk-callout">${N.native()?tr('Hatırlatmalar cihazına planlanır. Android’de tam zamanında çalması için Alarmlar ve hatırlatıcılar iznini de aç.','Reminders are scheduled on your device. On Android, enable Alarms & reminders for precise timing.'):tr('Web sürümünde bildirimler sayfa çalışırken gönderilir. Site kapalıyken veya telefon sayfayı uyuttuğunda zamanında gönderim desteklenmez. iPhone’da Safari’den ana ekrana ekleyip oradan aç.','On the web, notifications are sent while the page is running. Timely delivery is not supported when the site is closed or the phone suspends it. On iPhone, add the site to your Home Screen from Safari and open it there.')}</p><div class="zk-actions">${Z.button(tr('Bildirim iznini aç','Enable notifications'),'notificationEnable','','primary')}${Z.button(tr('Test bildirimi gönder','Send test notification'),'notificationTest')}${N.native()?Z.button(tr('Alarm iznini aç','Enable alarm permission'),'notificationExact'):''}</div><form class="zk-form" data-zk-form="notifications" style="margin-top:20px">${[['focus',tr('Odak süresi bitince','When focus time ends')],['rest',tr('Spor dinlenmesi bitince','When workout rest ends')],['events',tr('Takvim etkinlikleri (saatsiz olanlar 09:00)','Calendar events (09:00 if no time is set)')]].map(([key,label])=>`<label class="zk-start-choice"><input type="checkbox" name="${key}" ${c[key]?'checked':''}>${label}</label>`).join('')}<h3>${tr('Günlük bölüm hatırlatmaları','Daily section reminders')}</h3><p class="zk-note">${tr('İstediğin bölümü seç ve saatini belirle. Bunlar genel hatırlatmalardır; namaz vakti hesaplanmaz.','Choose sections and their reminder times. These are general reminders; prayer times are not calculated.')}</p>${sections.map(page=>`<div class="zk-notification-row"><label class="zk-start-choice"><input type="checkbox" name="daily-${page}" ${c.daily[page]?'checked':''}>${E(ZKI18n.t(Z.pages[page][0]))}</label><input type="time" name="time-${page}" aria-label="${E(ZKI18n.t(Z.pages[page][0]))} ${tr('hatırlatma saati','reminder time')}" value="${E(c.daily[page]||'19:00')}" required></div>`).join('')}<button class="zk-btn primary" type="submit">${tr('Bildirim ayarlarını kaydet','Save notification settings')}</button></form></section>`}
  };
  const focusMarkup=Z.focusMarkup;Z.focusMarkup=function(){return focusMarkup().replace('</section>','<p class="zk-note">'+(N.native()?tr('Bitiş bildirimi cihazına planlanır.','The end notification is scheduled on your device.'):tr('Bitiş bildirimi için sayfanın çalışır durumda kalması gerekir.','The page must keep running to send the end notification.'))+'</p>'+Z.button(tr('Bildirim ayarları','Notification settings'),'go','data-page="settings"','small')+'</section>')};
  const settings=Z.renderSettings;Z.renderSettings=function(){settings();document.getElementById('page-settings').insertAdjacentHTML('beforeend',N.markup());N.renderStatus().catch(N.fail)};
  const write=Z.write;Z.write=function(){const result=write();N.sync();return result};
  Z.actions.notificationEnable=async()=>{await N.enable();N.error=null;await N.renderStatus();Z.toast(tr('Bildirim izni açık. Test bildirimiyle kontrol edebilirsin.','Notifications are allowed. You can now send a test notification.'))};
  Z.actions.notificationTest=async()=>{try{await N.enable();if(await N.show(tr('Bildirim testi başarılı.','Notification test successful.'),'settings','zk-test')){N.error=null;Z.toast(tr('Test bildirimi gönderildi. Cihazının bildirim merkezini kontrol et.','Test notification sent. Check your device’s notification center.'));await N.renderStatus()}}catch(e){N.fail(e)}};
  Z.actions.notificationExact=async()=>{await N.native()?.exact();await N.syncNow()};
  Z.forms.notifications=form=>{const daily={};for(const page of sections)if(form.elements['daily-'+page].checked)daily[page]=form.elements['time-'+page].value;Z.data.notifications={focus:form.elements.focus.checked,rest:form.elements.rest.checked,events:form.elements.events.checked,daily};Z.write();Z.toast(tr('Bildirim tercihleri kaydedildi.','Notification preferences saved.'))};
  document.addEventListener('DOMContentLoaded',()=>{if(localStorage.getItem('zk_reminder')==='1'&&!localStorage.getItem('zk_notification_migrated')){N.config().daily.planner||='19:00';Z.write();localStorage.setItem('zk_notification_migrated','1')}N.sync();setInterval(()=>N.poll().catch(N.fail),15000);N.poll().catch(N.fail)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){N.sync();N.poll().catch(N.fail);N.renderStatus().catch(N.fail)}});
  navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='zk-notification-open'&&Z.pages[event.data.page])Z.go(event.data.page)});
  document.addEventListener('DOMContentLoaded',()=>{const page=new URL(location.href).searchParams.get('notification');if(Z.pages[page])Z.go(page)});
})();
