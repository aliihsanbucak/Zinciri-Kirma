(function () {
    'use strict';

    const STORAGE_KEY = 'zinciriKirmaPaymentPlans2026';
    const schedules = {
        monthly: 'Her ay',
        installment: 'Taksit',
        once: 'Tek sefer'
    };
    const icons = {
        'Abonelik': '🎧',
        'Faturalar': '🧾',
        'Ulaşım': '🚌',
        'Taksit': '💳',
        'Kira': '🏠',
        'Eğitim': '🎓',
        'Sağlık': '💊',
        'Diğer': '📦'
    };

    let plans = [];
    let editingId = null;

    function today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function currentMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function selectedMonthKey() {
        return `${budgetState.viewYear}-${String(budgetState.viewMonth + 1).padStart(2, '0')}`;
    }

    function monthIndex(key) {
        const [year, month] = key.split('-').map(Number);
        return year * 12 + month - 1;
    }

    function escapeText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function readPlans() {
        if (typeof state !== 'undefined' && state.finance && Array.isArray(state.finance.paymentPlans)) {
            plans = state.finance.paymentPlans.filter(plan => plan && plan.id && plan.name);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
            return;
        }
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            plans = Array.isArray(raw) ? raw.filter(plan => plan && plan.id && plan.name) : [];
        } catch (_) {
            plans = [];
        }
    }

    function writePlans() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        if (typeof saveBudget === 'function') saveBudget();
    }

    function appliesToMonth(plan, key) {
        const offset = monthIndex(key) - monthIndex(plan.startMonth);
        if (offset < 0) return false;
        if (plan.schedule === 'once') return offset === 0;
        if (plan.schedule === 'installment') return offset < Number(plan.installmentCount || 1);
        return true;
    }

    function occurrenceFor(plan, key) {
        if (!appliesToMonth(plan, key)) return null;
        const [year, month] = key.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(Math.max(Number(plan.dueDay) || 1, 1), lastDay);
        const date = `${key}-${String(day).padStart(2, '0')}`;
        const paid = Array.isArray(plan.paidMonths) && plan.paidMonths.includes(key);
        const installmentNo = plan.schedule === 'installment'
            ? monthIndex(key) - monthIndex(plan.startMonth) + 1
            : null;
        return { plan, key, date, day, paid, installmentNo };
    }

    function selectedOccurrences() {
        const key = selectedMonthKey();
        return plans
            .map(plan => occurrenceFor(plan, key))
            .filter(Boolean)
            .sort((a, b) => Number(a.paid) - Number(b.paid) || a.day - b.day || a.plan.name.localeCompare(b.plan.name, 'tr'));
    }

    function totals(occurrences) {
        const total = occurrences.reduce((sum, item) => sum + Number(item.plan.amount || 0), 0);
        const paid = occurrences.filter(item => item.paid).reduce((sum, item) => sum + Number(item.plan.amount || 0), 0);
        return { total, paid, remaining: total - paid };
    }

    function transactionCategory(plan) {
        if (['Faturalar', 'Ulaşım', 'Sağlık'].includes(plan.category)) return plan.category;
        if (plan.category === 'Abonelik' || plan.category === 'Taksit' || plan.category === 'Kira' || plan.category === 'Eğitim') return plan.category;
        return 'Diğer';
    }

    function injectInterface() {
        const home = document.getElementById('budget-home');
        if (!home || document.getElementById('budget-period-bar')) return;

        home.insertAdjacentHTML('afterbegin', `
            <div class="budget-period-bar" id="budget-period-bar">
                <div>
                    <div class="budget-period-eyebrow">AYLIK BÜTÇE</div>
                    <div class="budget-period-title" id="budget-month-label"></div>
                </div>
                <div class="budget-period-actions" aria-label="Ay seçimi">
                    <button type="button" class="budget-period-btn" onclick="budgetChangeMonth(-1)" aria-label="Önceki ay">‹</button>
                    <button type="button" class="budget-today-btn" onclick="ZKPayments.goToday()">Bu ay</button>
                    <button type="button" class="budget-period-btn" id="budget-month-next" onclick="budgetChangeMonth(1)" aria-label="Sonraki ay">›</button>
                </div>
            </div>`);

        const summary = home.querySelector('.budget-summary-row');
        summary?.insertAdjacentHTML('beforeend', `
            <div class="budget-card budget-card-due">
                <div class="bcard-icon">🗓️</div>
                <div class="bcard-body">
                    <div class="bcard-label">Bu Ay Ödenecek</div>
                    <div class="bcard-value" id="b-total-due">₺0,00</div>
                    <div class="bcard-meta" id="b-due-remaining">Kalan ₺0,00</div>
                </div>
            </div>`);

        const tabs = home.querySelector('.budget-tabs');
        const chartTab = document.getElementById('btab-chart');
        const paymentTab = document.createElement('button');
        paymentTab.type = 'button';
        paymentTab.className = 'budget-tab';
        paymentTab.id = 'btab-payments';
        paymentTab.innerHTML = '🗓️ Ödemeler';
        paymentTab.onclick = () => window.switchBudgetTab('payments');
        tabs?.insertBefore(paymentTab, chartTab || null);

        const txnPanel = document.getElementById('budget-txn-panel');
        txnPanel?.insertAdjacentHTML('afterend', `
            <div id="budget-payments-panel" class="hidden">
                <div class="payment-summary" aria-label="Aylık ödeme özeti">
                    <div><span>Toplam</span><strong id="payment-total">₺0,00</strong></div>
                    <div><span>Ödenen</span><strong id="payment-paid">₺0,00</strong></div>
                    <div><span>Kalan</span><strong id="payment-remaining">₺0,00</strong></div>
                </div>
                <div class="payment-toolbar">
                    <div>
                        <h2>Ayın ödemeleri</h2>
                        <p>Fatura, abonelik ve taksitlerini tek listede takip et.</p>
                    </div>
                    <button type="button" class="budget-add-btn payment-add-btn" onclick="ZKPayments.open()"><span>+</span> Ödeme planı ekle</button>
                </div>
                <div id="payment-list" class="payment-list"></div>
            </div>`);

        document.body.insertAdjacentHTML('beforeend', `
            <div id="payment-plan-overlay" class="overlay hidden">
                <div class="modal payment-plan-modal" role="dialog" aria-modal="true" aria-labelledby="payment-plan-title">
                    <div class="modal-header">
                        <h2 id="payment-plan-title">Ödeme Planı Ekle</h2>
                        <button type="button" class="close-btn" onclick="ZKPayments.close()" aria-label="Kapat">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label-sm" for="payment-name">Ödeme adı</label>
                            <input id="payment-name" type="text" maxlength="80" placeholder="Örn: Spotify, Elektrik, Telefon taksidi" autocomplete="off">
                        </div>
                        <div class="payment-form-grid">
                            <div class="form-group">
                                <label class="form-label-sm" for="payment-amount">Aylık tutar (₺)</label>
                                <input id="payment-amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0,00">
                            </div>
                            <div class="form-group">
                                <label class="form-label-sm" for="payment-category">Kategori</label>
                                <select id="payment-category">
                                    ${Object.keys(icons).map(name => `<option value="${name}">${icons[name]} ${name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label-sm" for="payment-schedule">Tekrar</label>
                                <select id="payment-schedule" onchange="ZKPayments.scheduleChanged()">
                                    <option value="monthly">Her ay</option>
                                    <option value="installment">Taksitli</option>
                                    <option value="once">Tek sefer</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label-sm" for="payment-start-month">Başlangıç ayı</label>
                                <input id="payment-start-month" type="month">
                            </div>
                            <div class="form-group">
                                <label class="form-label-sm" for="payment-due-day">Ödeme günü</label>
                                <input id="payment-due-day" type="number" min="1" max="31" step="1" inputmode="numeric" value="1">
                            </div>
                            <div class="form-group hidden" id="payment-installment-group">
                                <label class="form-label-sm" for="payment-installment-count">Toplam taksit</label>
                                <input id="payment-installment-count" type="number" min="2" max="120" step="1" inputmode="numeric" value="12">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label-sm" for="payment-note">Not <span class="payment-optional">isteğe bağlı</span></label>
                            <input id="payment-note" type="text" maxlength="140" placeholder="Paket, kurum veya kısa bir hatırlatma" autocomplete="off">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="ZKPayments.close()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="ZKPayments.save()">Planı Kaydet</button>
                    </div>
                </div>
            </div>`);
    }

    function render() {
        readPlans();
        const occurrences = selectedOccurrences();
        const summary = totals(occurrences);
        const key = selectedMonthKey();
        const monthLabel = document.getElementById('budget-month-label');
        if (monthLabel) monthLabel.textContent = `${MONTHS_TR_B[budgetState.viewMonth]} ${budgetState.viewYear}`;
        const next = document.getElementById('budget-month-next');
        if (next) next.disabled = false;

        const dueEl = document.getElementById('b-total-due');
        const dueRemainingEl = document.getElementById('b-due-remaining');
        if (dueEl) dueEl.textContent = fmtMoney(summary.total);
        if (dueRemainingEl) dueRemainingEl.textContent = `Kalan ${fmtMoney(summary.remaining)}`;

        const totalEl = document.getElementById('payment-total');
        const paidEl = document.getElementById('payment-paid');
        const remainingEl = document.getElementById('payment-remaining');
        if (totalEl) totalEl.textContent = fmtMoney(summary.total);
        if (paidEl) paidEl.textContent = fmtMoney(summary.paid);
        if (remainingEl) remainingEl.textContent = fmtMoney(summary.remaining);

        const list = document.getElementById('payment-list');
        if (!list) return;
        if (!occurrences.length) {
            list.innerHTML = `<div class="payment-empty">
                <span>🗓️</span>
                <h3>${MONTHS_TR_B[budgetState.viewMonth]} için planlı ödeme yok</h3>
                <p>Abonelik, fatura, ulaşım veya taksit eklediğinde bu ayın toplamı otomatik hesaplanır.</p>
                <button type="button" class="btn btn-primary" onclick="ZKPayments.open()">İlk ödemeyi ekle</button>
            </div>`;
            return;
        }

        list.innerHTML = occurrences.map(item => {
            const plan = item.plan;
            const overdue = !item.paid && item.date < today();
            const scheduleText = plan.schedule === 'installment'
                ? `${item.installmentNo}/${plan.installmentCount}. taksit`
                : schedules[plan.schedule];
            return `<article class="payment-row ${item.paid ? 'is-paid' : ''} ${overdue ? 'is-overdue' : ''}">
                <button type="button" class="payment-check" onclick="ZKPayments.togglePaid('${escapeText(plan.id)}','${key}')" aria-label="${item.paid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}" aria-pressed="${item.paid}">${item.paid ? '✓' : ''}</button>
                <div class="payment-icon">${icons[plan.category] || '📦'}</div>
                <div class="payment-info">
                    <div class="payment-name-row">
                        <h3>${escapeText(plan.name)}</h3>
                        ${overdue ? '<span class="payment-status overdue">Gecikti</span>' : item.paid ? '<span class="payment-status paid">Ödendi</span>' : ''}
                    </div>
                    <p>${escapeText(plan.category)} · ${scheduleText} · ${item.day} ${MONTHS_TR_B[budgetState.viewMonth]}</p>
                    ${plan.note ? `<small>${escapeText(plan.note)}</small>` : ''}
                </div>
                <div class="payment-amount-actions">
                    <strong>${fmtMoney(Number(plan.amount))}</strong>
                    <div>
                        <button type="button" onclick="ZKPayments.open('${escapeText(plan.id)}')" aria-label="Düzenle">Düzenle</button>
                        <button type="button" class="danger" onclick="ZKPayments.remove('${escapeText(plan.id)}')" aria-label="Sil">Sil</button>
                    </div>
                </div>
            </article>`;
        }).join('');
    }

    function open(id) {
        readPlans();
        editingId = id || null;
        const plan = editingId ? plans.find(item => item.id === editingId) : null;
        document.getElementById('payment-plan-title').textContent = plan ? 'Ödeme Planını Düzenle' : 'Ödeme Planı Ekle';
        document.getElementById('payment-name').value = plan?.name || '';
        document.getElementById('payment-amount').value = plan?.amount || '';
        document.getElementById('payment-category').value = plan?.category || 'Abonelik';
        document.getElementById('payment-schedule').value = plan?.schedule || 'monthly';
        document.getElementById('payment-start-month').value = plan?.startMonth || selectedMonthKey();
        document.getElementById('payment-due-day').value = plan?.dueDay || Math.min(new Date().getDate(), 28);
        document.getElementById('payment-installment-count').value = plan?.installmentCount || 12;
        document.getElementById('payment-note').value = plan?.note || '';
        scheduleChanged();
        document.getElementById('payment-plan-overlay').classList.remove('hidden');
        setTimeout(() => document.getElementById('payment-name')?.focus(), 30);
    }

    function close() {
        document.getElementById('payment-plan-overlay')?.classList.add('hidden');
        editingId = null;
    }

    function scheduleChanged() {
        const installment = document.getElementById('payment-schedule')?.value === 'installment';
        document.getElementById('payment-installment-group')?.classList.toggle('hidden', !installment);
    }

    function save() {
        const name = document.getElementById('payment-name').value.trim();
        const amount = Number(document.getElementById('payment-amount').value);
        const category = document.getElementById('payment-category').value;
        const schedule = document.getElementById('payment-schedule').value;
        const startMonth = document.getElementById('payment-start-month').value;
        const dueDay = Number(document.getElementById('payment-due-day').value);
        const installmentCount = Number(document.getElementById('payment-installment-count').value);
        const note = document.getElementById('payment-note').value.trim();

        if (!name) return showToast('⚠️', 'Ödeme adını gir.', 'error');
        if (!Number.isFinite(amount) || amount <= 0) return showToast('⚠️', 'Geçerli bir tutar gir.', 'error');
        if (!startMonth) return showToast('⚠️', 'Başlangıç ayını seç.', 'error');
        if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return showToast('⚠️', 'Ödeme günü 1–31 arasında olmalı.', 'error');
        if (schedule === 'installment' && (!Number.isInteger(installmentCount) || installmentCount < 2 || installmentCount > 120)) {
            return showToast('⚠️', 'Toplam taksit sayısı 2–120 arasında olmalı.', 'error');
        }

        const previous = editingId ? plans.find(item => item.id === editingId) : null;
        const plan = {
            id: previous?.id || `payment_${Date.now()}`,
            name,
            amount: Math.round(amount * 100) / 100,
            category,
            schedule,
            startMonth,
            dueDay,
            installmentCount: schedule === 'installment' ? installmentCount : null,
            note,
            paidMonths: previous?.paidMonths || [],
            createdAt: previous?.createdAt || Date.now()
        };
        if (previous) plans = plans.map(item => item.id === previous.id ? plan : item);
        else plans.unshift(plan);
        if (previous && typeof budgetState !== 'undefined') {
            budgetState.transactions.forEach(txn => {
                if (txn.paymentPlanId !== plan.id) return;
                txn.amount = plan.amount;
                txn.category = transactionCategory(plan);
                txn.desc = `${plan.name} · planlı ödeme`;
                if (txn.paymentMonth) {
                    const occurrence = occurrenceFor(plan, txn.paymentMonth);
                    if (occurrence) txn.date = occurrence.date;
                }
            });
        }
        writePlans();
        close();
        render();
        showToast('✓', previous ? 'Ödeme planı güncellendi.' : 'Ödeme planı eklendi.', 'success');
    }

    function togglePaid(id, key) {
        readPlans();
        const plan = plans.find(item => item.id === id);
        const occurrence = plan && occurrenceFor(plan, key);
        if (!plan || !occurrence) return;
        plan.paidMonths = Array.isArray(plan.paidMonths) ? plan.paidMonths : [];
        const wasPaid = plan.paidMonths.includes(key);
        const transactionId = `payment_txn_${plan.id}_${key}`;
        if (wasPaid) {
            plan.paidMonths = plan.paidMonths.filter(month => month !== key);
            budgetState.transactions = budgetState.transactions.filter(txn => txn.id !== transactionId);
        } else {
            plan.paidMonths.push(key);
            if (!budgetState.transactions.some(txn => txn.id === transactionId)) {
                budgetState.transactions.unshift({
                    id: transactionId,
                    type: 'expense',
                    amount: Number(plan.amount),
                    category: transactionCategory(plan),
                    desc: `${plan.name} · planlı ödeme`,
                    date: occurrence.date,
                    paymentPlanId: plan.id,
                    paymentMonth: key
                });
            }
        }
        writePlans();
        window.renderBudget();
        showToast(wasPaid ? '↩' : '✓', wasPaid ? 'Ödeme işareti kaldırıldı.' : 'Ödeme giderlere eklendi.', wasPaid ? '' : 'success');
    }

    function remove(id) {
        readPlans();
        const plan = plans.find(item => item.id === id);
        if (!plan) return;
        if (!confirm(`"${plan.name}" ödeme planı silinsin mi? Daha önce giderlere eklenen ödemeler korunur.`)) return;
        plans = plans.filter(item => item.id !== id);
        writePlans();
        render();
        showToast('🗑️', 'Ödeme planı silindi.', '');
    }

    function goToday() {
        const d = new Date();
        budgetState.viewYear = d.getFullYear();
        budgetState.viewMonth = d.getMonth();
        window.renderBudget();
    }

    function setup() {
        injectInterface();
        readPlans();
        if (typeof CAT_ICONS !== 'undefined') Object.assign(CAT_ICONS, icons);

        const originalRenderBudget = window.renderBudget;
        window.renderBudget = function () {
            originalRenderBudget();
            render();
        };

        window.switchBudgetTab = function (tab) {
            ['txn', 'payments', 'chart', 'history'].forEach(name => {
                document.getElementById(`btab-${name}`)?.classList.toggle('active', name === tab);
                document.getElementById(`budget-${name}-panel`)?.classList.toggle('hidden', name !== tab);
            });
            if (tab === 'payments') render();
            else renderBudgetByTab(tab, txnsForMonth(budgetState.viewYear, budgetState.viewMonth));
        };

        render();
    }

    window.ZKPayments = { open, close, save, remove, togglePaid, scheduleChanged, goToday, render };
    document.addEventListener('DOMContentLoaded', setup);
})();
