/* =====================================================
   FraudLens AI — main.js
   Claim Upload → Analysis → Results App Logic
   ===================================================== */

// ==================== ENTER APP ====================
function enterApp(claimType) {
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app-shell');
    landing.style.transition = 'opacity 0.35s ease';
    landing.style.opacity = '0';
    setTimeout(() => {
        landing.style.display = 'none';
        app.style.display = 'flex';
        app.classList.add('reveal');
        window.scrollTo(0, 0);
        lucide.createIcons();
        switchView('analyze');
        if (claimType) selectClaimType(claimType);
    }, 350);
}

function backToLanding() {
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app-shell');
    app.style.display = 'none';
    landing.style.display = 'block';
    landing.style.opacity = '0';
    setTimeout(() => { landing.style.transition = 'opacity 0.3s ease'; landing.style.opacity = '1'; }, 10);
    window.scrollTo(0, 0);
}

// ==================== VIEW SWITCHING ====================
function switchView(view) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.app-tab').forEach(t => t.classList.remove('active'));
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    const tab = document.querySelector(`.app-tab[data-view="${view}"]`);
    if (tab) tab.classList.add('active');

    if (view === 'investigations') initInvestigations();
}

// ==================== UPLOAD FLOW ====================
let selectedType = 'medical';
let fileAttached = false;
let csvBatchResults = null;

function selectClaimType(type) {
    selectedType = type;
    document.querySelectorAll('.ctp').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.ctp[data-type="${type}"]`);
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.form-fields').forEach(f => f.classList.remove('active'));
    const fields = document.getElementById('fields-' + type);
    if (fields) fields.classList.add('active');
}

function triggerUpload() {
    document.getElementById('file-input').click();
}

function handleFileSelect(input) {
    if (!input.files || !input.files[0]) return;
    const f = input.files[0];
    fileAttached = true;
    csvBatchResults = null;

    if (f.name.toLowerCase().endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result;
            const lines = text.split('\n');
            if (lines.length > 1) {
                const headers = lines[0].split(',');
                const fraudIdx = headers.indexOf('fraud_label');
                if (fraudIdx > -1) {
                    let total = 0;
                    let fraudCount = 0;
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim() === '') continue;
                        const cols = lines[i].split(',');
                        if (cols.length > fraudIdx) {
                            total++;
                            if (cols[fraudIdx].trim() === '1') {
                                fraudCount++;
                            }
                        }
                    }
                    csvBatchResults = { total, fraud: fraudCount };
                }
            }
        };
        reader.readAsText(f);
    }

    document.getElementById('fa-name').textContent = f.name;
    document.getElementById('fa-size').textContent = (f.size / 1024 / 1024).toFixed(2) + ' MB · Ready for analysis';
    document.getElementById('file-attached').style.display = 'flex';
    document.getElementById('upload-zone').style.borderColor = 'var(--green)';
    document.getElementById('upload-zone').style.background = 'var(--green-bg)';
}

function removeFile() {
    fileAttached = false;
    csvBatchResults = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-attached').style.display = 'none';
    document.getElementById('upload-zone').style.borderColor = '';
    document.getElementById('upload-zone').style.background = '';
}

// ==================== ANALYSIS ENGINE ====================
const RESULTS = {
    medical: {
        claimId: 'MED-2026-4521', meta: 'Medical Insurance · City General Medical Center · John Doe',
        overallScore: 80, overallTag: 'HIGH RISK', bannerClass: '',
        verdict: 'This claim shows strong indicators of medical billing fraud',
        verdictSub: '3 critical anomalies detected — emergency dept upcoding, phantom surgical charge, and inflated MRI billing.',
        medScore: 87, medRisk: 'HIGH RISK',
        motScore: 45, motRisk: 'MEDIUM RISK',
        docScore: 38, docRisk: 'LOW RISK',
        aiText: 'This claim has been flagged with a <strong style="color:var(--red)">HIGH RISK score of 80/100</strong> based on medical billing anomalies. The Medical module identified Emergency Department billing at 5.5× the official rate ($2,750 vs $500 official), an MRI inflated by 462% ($1,800 vs $320), and a phantom Surgical Suite charge of $1,800 with no matching procedure code. Combined, a total suspected overcharge of <strong>$7,220</strong> was detected across 3 line items. <strong>Recommendation: Refer to medical billing audit team immediately and request itemized bills directly from the hospital.</strong>'
    },
    motor: {
        claimId: 'MOT-2026-1832', meta: 'Motor Insurance · Priya Nair · Comprehensive Auto Policy',
        overallScore: 72, overallTag: 'HIGH RISK', bannerClass: '',
        verdict: 'ML classifier flagged this motor claim as highly suspicious',
        verdictSub: '4 behavioral red flags detected — repeat claimant, early policy timing, remote location, no police report.',
        medScore: 30, medRisk: 'LOW RISK',
        motScore: 82, motRisk: 'HIGH RISK',
        docScore: 55, docRisk: 'MEDIUM RISK',
        aiText: 'This claim has been flagged with a <strong style="color:var(--red)">HIGH RISK score of 72/100</strong> based on motor fraud behavioral signals. The Random Forest ML classifier scored this claim in the top 3% of fraud probability nationally. Key signals: 4 previous claims in 3 years (5.5× national average), policy activated only 18 days before the incident (staged fraud indicator), accident occurred in a remote area with no witnesses, and no police report was filed despite significant claimed damage of $18,500. <strong>Recommendation: Require police FIR and dispatch an independent damage assessor before any payout.</strong>'
    },
    document: {
        claimId: 'DOC-2026-0399', meta: 'Policy Document Fraud · Rajesh Kumar Sharma · FL-9910-RKS-2026',
        overallScore: 91, overallTag: 'HIGH RISK', bannerClass: '',
        verdict: 'Critical document anomalies detected — likely staged insurance fraud',
        verdictSub: 'Claim submitted 3 days after policy purchase with identity metadata mismatch and tampered PDF timestamps.',
        medScore: 22, medRisk: 'LOW RISK',
        motScore: 48, motRisk: 'MEDIUM RISK',
        docScore: 91, docRisk: 'HIGH RISK',
        aiText: 'This claim has been flagged with a <strong style="color:var(--red)">CRITICAL RISK score of 91/100</strong> based on document and policy fraud indicators. The Document module detected: (1) Claim submitted only 3 days after policy activation — placing this in the top 2% nationally of suspicious timing patterns; (2) Identity document metadata shows a photo modification timestamp newer than the document creation date, indicating Aadhaar card tampering; (3) The submitted claim PDF has internal metadata showing a creation date one day before the stated incident date, strongly suggesting pre-fabrication. <strong>Recommendation: Immediately escalate to the insurance fraud unit and refer to law enforcement for identity fraud investigation.</strong>'
    }
};

const BILLING_DATA = {
    medical: [
        { service: 'Emergency Department Visit', official: '$500', billed: '$2,750', diff: '+$2,250', cls: 'diff-fraud', badge: 'badge-fraud', status: 'FRAUD' },
        { service: 'MRI Brain Scan (72148)', official: '$320', billed: '$1,800', diff: '+$1,480', cls: 'diff-fraud', badge: 'badge-fraud', status: 'FRAUD' },
        { service: 'Surgical Suite Fee', official: '$—', billed: '$1,800', diff: 'Phantom', cls: 'diff-fraud', badge: 'badge-fraud', status: 'PHANTOM' },
        { service: 'Specialist Consultation', official: '$150', billed: '$490', diff: '+$340', cls: 'diff-warn', badge: 'badge-warn', status: 'UPCODED' },
        { service: 'Blood Panel (CBC)', official: '$85', billed: '$110', diff: '+$25', cls: 'diff-ok', badge: 'badge-ok', status: 'OK' },
        { service: 'X-Ray Chest (71046)', official: '$120', billed: '$140', diff: '+$20', cls: 'diff-ok', badge: 'badge-ok', status: 'OK' }
    ]
};

function startAnalysis() {
    const type = selectedType;
    setState('analyzing');
    runSteps(type);
}

function setState(state) {
    document.querySelectorAll('.app-state').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('state-' + state);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
}

const STEP_MSGS = [
    'Parsing claim document and extracting fields…',
    'Running Medical Billing module — comparing against official rates…',
    'Running Motor Fraud ML classifier (Random Forest)…',
    'Running Document & Policy analysis — checking metadata…',
    'Computing unified Fraud Risk Score…'
];
const STEP_LABELS = ['Parsing claim document', 'Running Medical Fraud module', 'Running Motor Fraud ML classifier', 'Running Document & Policy analysis', 'Computing unified Fraud Risk Score'];

function runSteps(type) {
    const steps = [1, 2, 3, 4, 5];
    let idx = 0;
    // Reset all steps
    steps.forEach(n => {
        const s = document.getElementById('astep-' + n);
        s.className = 'astep';
        s.querySelector('.astep-status').textContent = '';
    });

    function nextStep() {
        if (idx > 0) {
            const prev = document.getElementById('astep-' + idx);
            prev.className = 'astep done';
            prev.querySelector('.astep-status').textContent = '✓';
        }
        if (idx >= steps.length) {
            setTimeout(() => showResults(type), 500);
            return;
        }
        idx++;
        const cur = document.getElementById('astep-' + idx);
        cur.className = 'astep running';
        cur.querySelector('.astep-status').textContent = '…';
        document.getElementById('analyzing-msg').textContent = STEP_MSGS[idx - 1];
        setTimeout(nextStep, idx === 3 ? 1200 : 900);
    }
    nextStep();
}

function showResults(type) {
    const r = RESULTS[type] || RESULTS.medical;
    setState('results');

    // Header
    document.getElementById('res-claim-id').textContent = r.claimId;
    document.getElementById('res-claim-meta').textContent = r.meta + ' · Analyzed ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Risk Banner
    const banner = document.getElementById('risk-banner');

    if (csvBatchResults) {
        document.getElementById('res-claim-meta').textContent = `Batch CSV Upload · Analyzed ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;
        document.getElementById('res-claim-id').textContent = 'BATCH-ANALYSIS';

        banner.className = 'risk-banner medium-banner';
        document.getElementById('rb-score').textContent = csvBatchResults.fraud;
        document.getElementById('rb-score').style.color = 'var(--red)';
        document.getElementById('rb-tag').textContent = 'FRAUDULENT CLAIMS';
        document.getElementById('rb-tag').style.color = 'var(--red)';
        document.getElementById('rb-verdict').textContent = `Analyzed ${csvBatchResults.total} total vehicle insurance claims.`;
        document.getElementById('rb-verdict-sub').textContent = `${csvBatchResults.fraud} high-risk fraudulent applications were detected in the batch.`;

        const p = Math.round((csvBatchResults.fraud / csvBatchResults.total) * 100) || 0;
        document.getElementById('aec-risk-level').textContent = 'HIGH RISK';
        document.getElementById('aec-body').innerHTML = `Batch analysis completed on <strong>${csvBatchResults.total} records</strong>. We found <strong>${csvBatchResults.fraud}</strong> fraudulent claims, representing <strong>${p}%</strong> of the total dataset. <strong>Recommendation: Route flagged cases to SIU team for immediate review.</strong>`;
    } else {
        banner.className = 'risk-banner' + (r.overallScore >= 70 ? '' : r.overallScore >= 40 ? ' medium-banner' : ' low-banner');
        const scoreColor = r.overallScore >= 70 ? 'var(--red)' : r.overallScore >= 40 ? 'var(--orange)' : 'var(--green)';
        document.getElementById('rb-score').textContent = r.overallScore;
        document.getElementById('rb-score').style.color = scoreColor;
        document.getElementById('rb-tag').textContent = r.overallTag;
        document.getElementById('rb-tag').style.color = scoreColor;
        document.getElementById('rb-verdict').textContent = r.verdict;
        document.getElementById('rb-verdict-sub').textContent = r.verdictSub;
        // AI Explanation
        document.getElementById('aec-risk-level').textContent = r.overallTag;
        document.getElementById('aec-body').innerHTML = r.aiText;
    }

    // Module scores
    setModuleScore('med', r.medScore, r.medRisk, 'red');
    setModuleScore('mot', r.motScore, r.motRisk, r.motScore >= 70 ? 'red' : 'orange');
    setModuleScore('doc', r.docScore, r.docRisk, r.docScore >= 70 ? 'red' : 'blue');

    // Show/hide modules based on type
    const showMed = type === 'medical';
    const showMot = type === 'motor';
    const showDoc = type === 'document';
    document.getElementById('mod-medical').style.display = showMed ? 'block' : (type === 'medical' ? 'block' : 'block');
    // Always show all 3 modules in results

    // Build billing table for medical
    const tbody = document.getElementById('billing-rows');
    const rows = BILLING_DATA[type] || BILLING_DATA.medical;
    tbody.innerHTML = rows.map(row => `
    <tr class="${row.status === 'FRAUD' || row.status === 'PHANTOM' ? 'fraud-row' : ''}">
      <td>${row.service}</td>
      <td>${row.official}</td>
      <td><strong>${row.billed}</strong></td>
      <td class="${row.cls}">${row.diff}</td>
      <td><span class="${row.badge}">${row.status}</span></td>
    </tr>
  `).join('');

    // Document timeline dates
    if (type === 'document') {
        const start = document.getElementById('doc-start')?.value || '2026-02-16';
        const claim = document.getElementById('doc-claim')?.value || '2026-02-19';
        const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        document.getElementById('tm-start').textContent = fmt(start);
        document.getElementById('tm-claim').textContent = fmt(claim);
    }

    lucide.createIcons();
    window.scrollTo(0, 0);
}

function setModuleScore(prefix, score, risk, color) {
    const scoreEl = document.getElementById(prefix + '-score');
    const riskEl = document.getElementById(prefix + '-risk');
    const barEl = document.getElementById(prefix + '-bar');
    if (scoreEl) scoreEl.textContent = score;
    if (riskEl) { riskEl.textContent = risk; riskEl.className = 'mrc-risk ' + color + '-text'; }
    if (barEl) { setTimeout(() => { barEl.style.width = score + '%'; }, 200); }
}

function resetToUpload() {
    setState('upload');
    window.scrollTo(0, 0);
}

// ==================== RESULT ACTIONS ====================
function doResultAction(action) {
    const id = document.getElementById('res-claim-id').textContent;
    const msgs = {
        approve: { msg: `Claim ${id} approved — payment authorized`, type: 'success' },
        investigate: { msg: `Claim ${id} escalated to investigation team`, type: 'info' },
        reject: { msg: `Claim ${id} rejected — claimant will be notified`, type: 'danger' }
    };
    showToast(msgs[action].msg, msgs[action].type);
    if (action !== 'approve') {
        // Add to investigations queue
        setTimeout(() => switchView('investigations'), 1500);
    }
}

// ==================== INVESTIGATIONS ====================
const CLAIMS_DB = [
    { id: 'MED-2026-4521', name: 'John Doe', type: 'Medical Insurance', score: 80, risk: 'high', policy: 'Health Gold Plan', insights: ['Emergency dept billed at 5.5× official rate', 'Phantom surgical charge $1,800', 'MRI inflated 462%'] },
    { id: 'DOC-2026-0399', name: 'Rajesh Sharma', type: 'Motor (Policy Fraud)', score: 91, risk: 'high', policy: 'FL-9910-RKS-2026', insights: ['Claim 3 days after policy purchase', 'Identity document mismatch', 'PDF metadata tampered'] },
    { id: 'MOT-2026-1832', name: 'Priya Nair', type: 'Motor Insurance', score: 72, risk: 'high', policy: 'Comprehensive Auto', insights: ['4 prior claims in 3 years', 'Policy active 18 days only', 'No police report'] },
    { id: 'HLT-2026-0812', name: 'Sarah Williams', type: 'Health Insurance', score: 55, risk: 'medium', policy: 'Health Silver Plan', insights: ['Billing code inconsistency', 'Out-of-network provider'] },
    { id: 'MOT-2026-0271', name: 'Alex Chen', type: 'Motor Insurance', score: 43, risk: 'medium', policy: 'Third-Party Liability', insights: ['Repair cost 20% above average', 'Location anomaly flagged'] },
    { id: 'HLT-2026-0091', name: 'Maria Santos', type: 'Health Insurance', score: 18, risk: 'low', policy: 'Health Platinum Plan', insights: ['All codes verified', 'No document anomalies detected'] }
];

let selectedInv = null;
let invReady = false;

function initInvestigations() {
    if (!invReady) { renderInvQueue(CLAIMS_DB); invReady = true; }
}

function filterInv() {
    const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
    const r = document.getElementById('inv-risk')?.value || 'all';
    const filtered = CLAIMS_DB.filter(c => (r === 'all' || c.risk === r) && (!q || c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)));
    renderInvQueue(filtered);
}

function renderInvQueue(data) {
    const el = document.getElementById('inv-queue');
    if (!el) return;
    const colors = { high: '#dc2626', medium: '#ea580c', low: '#16a34a' };
    el.innerHTML = `
    <div style="padding:0.85rem 1.1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:0.85rem;font-weight:700;color:var(--gray-800)">Flagged Claims</span>
      <span style="font-size:0.72rem;background:var(--gray-100);padding:0.2rem 0.6rem;border-radius:99px;color:var(--muted)">${data.length} claims</span>
    </div>
    <div class="inv-q-items">
      ${data.map(c => `
        <div class="inv-item${selectedInv === c.id ? ' selected' : ''}" onclick="selectInv('${c.id}')">
          <div class="inv-item-top"><span class="inv-id">${c.id}</span><span class="risk-badge ${c.risk}">${c.risk.toUpperCase()}</span></div>
          <div class="inv-name">${c.name}</div><div class="inv-type">${c.type}</div>
          <div class="inv-score-row">
            <div class="inv-bar-wrap"><div class="inv-bar" style="width:${c.score}%;background:${colors[c.risk]}"></div></div>
            <span class="inv-score-val" style="color:${colors[c.risk]}">${c.score}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function selectInv(id) {
    selectedInv = id;
    const c = CLAIMS_DB.find(x => x.id === id);
    if (!c) return;
    document.querySelectorAll('.inv-item').forEach(el => el.classList.toggle('selected', el.querySelector('.inv-id')?.textContent === id));
    const rColor = { high: '#dc2626', medium: '#ea580c', low: '#16a34a' }[c.risk];
    document.getElementById('inv-detail').innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-size:0.7rem;font-family:monospace;color:var(--muted);margin-bottom:0.25rem">${c.id}</div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--gray-900)">${c.name}</div>
        <div style="font-size:0.8rem;color:var(--muted);margin-top:0.2rem">${c.policy} · ${c.type}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:2.5rem;font-weight:800;color:${rColor};line-height:1">${c.score}</div>
        <span class="risk-badge ${c.risk}" style="font-size:0.65rem">${c.risk.toUpperCase()} RISK</span>
      </div>
    </div>
    <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;color:var(--muted);text-transform:uppercase;margin-bottom:0.6rem;display:flex;align-items:center;gap:0.35rem">
      <i data-lucide="sparkles" style="width:13px;height:13px"></i> AI Insights
    </div>
    ${c.insights.map(ins => `
      <div style="display:flex;align-items:flex-start;gap:0.5rem;padding:0.6rem 0.75rem;background:${c.risk === 'high' ? 'var(--red-bg)' : 'var(--orange-bg)'};border:1px solid ${c.risk === 'high' ? '#fecaca' : '#fed7aa'};border-radius:6px;margin-bottom:0.4rem;font-size:0.78rem;color:${c.risk === 'high' ? 'var(--red)' : 'var(--orange)'}">
        <i data-lucide="alert-triangle" style="width:13px;height:13px;flex-shrink:0;margin-top:0.1rem"></i>
        <span>${ins}</span>
      </div>
    `).join('')}
    <div style="display:flex;gap:0.65rem;margin-top:1.25rem;flex-wrap:wrap">
      <button class="rb-approve" style="flex:1;min-width:100px" onclick="invAction('approve','${c.id}')"><i data-lucide="check-circle"></i> Approve</button>
      <button class="rb-investigate" style="flex:1;min-width:100px" onclick="invAction('investigate','${c.id}')"><i data-lucide="search"></i> Investigate</button>
      <button class="rb-reject" style="flex:1;min-width:100px" onclick="invAction('reject','${c.id}')"><i data-lucide="x-circle"></i> Reject</button>
    </div>
  `;
    lucide.createIcons();
}

function invAction(action, id) {
    const msgs = {
        approve: { msg: `Claim ${id} approved`, type: 'success' },
        investigate: { msg: `Claim ${id} sent to investigation team`, type: 'info' },
        reject: { msg: `Claim ${id} rejected`, type: 'danger' }
    };
    showToast(msgs[action].msg, msgs[action].type);
}

// ==================== TOAST ====================
function showToast(msg, type = 'info') {
    const icons = { success: 'check-circle', info: 'info', danger: 'alert-triangle' };
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i data-lucide="${icons[type]}"></i><span>${msg}</span>`;
    c.appendChild(t);
    lucide.createIcons();
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.35s'; setTimeout(() => t.remove(), 350); }, 4000);
}

// ==================== INIT ====================
window.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});
