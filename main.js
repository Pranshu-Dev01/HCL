/* =====================================================
   FraudLens AI — main.js
   Claim Upload → Analysis → Results App Logic
   ===================================================== */

// ==================== API CONFIG ====================
const API_BASE = 'http://localhost:8000';
let apiResponsePromise = null;

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
        // Check API health silently
        fetch(API_BASE + '/health')
            .then(r => r.json())
            .then(data => {
                if (!data.models_loaded) {
                    showToast('AI models are initialising — first prediction may take ~60 s', 'info');
                }
            })
            .catch(() => {
                showToast('API server offline — demo mode active (no live scoring)', 'danger');
            });
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
let selectedType = 'motor';
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

// ==================== CSV HELPERS ====================
function parseCsvToClaimInputs(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const formatDate = d => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${d.getFullYear()}`;
    };
    const now = new Date();
    const baseDefaults = {
        Date_start_contract: formatDate(new Date(now - 365 * 86400000)),
        Date_last_renewal: formatDate(new Date(now - 365 * 86400000)),
        Date_next_renewal: formatDate(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())),
        Date_birth: formatDate(new Date(now.getFullYear() - 38, 6, 15)),
        Date_driving_licence: formatDate(new Date(now.getFullYear() - 18, 3, 20)),
        Date_lapse: null,
        Seniority: 1.0, Policies_in_force: 1, Max_policies: 1, Max_products: 1,
        Lapse: 0, Payment: 0, Distribution_channel: 1, Second_driver: 0,
        Premium: 500, Cost_claims_year: 0, N_claims_year: 0,
        N_claims_history: 0, R_Claims_history: 0,
        Type_risk: 3, Area: 1, Year_matriculation: 2018,
        Power: 90, Cylinder_capacity: 1600, Value_vehicle: 15000,
        N_doors: 4, Weight: 1200, Length: 4500, Type_fuel: 'P', claim_records: null
    };
    const numericFields = new Set(['Seniority','Policies_in_force','Max_policies','Max_products','Lapse',
        'Payment','Distribution_channel','Second_driver','Premium','Cost_claims_year','N_claims_year',
        'N_claims_history','R_Claims_history','Type_risk','Area','Year_matriculation','Power',
        'Cylinder_capacity','Value_vehicle','N_doors','Weight','Length']);

    return lines.slice(1).filter(l => l.trim()).map((line, idx) => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        const claim = { ...baseDefaults };
        Object.keys(row).forEach(key => {
            if (key in claim && row[key] !== '') {
                claim[key] = numericFields.has(key) ? (parseFloat(row[key]) || baseDefaults[key]) : row[key];
            }
        });
        claim.ID = parseInt(row.ID || row.policy_id || row.id || '') || (idx + 1);
        return claim;
    });
}

function handleFileSelect(input) {
    if (!input.files || !input.files[0]) return;
    const f = input.files[0];
    fileAttached = true;
    csvBatchResults = null;

    if (f.name.toLowerCase().endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const claims = parseCsvToClaimInputs(e.target.result);
            if (claims.length > 0) {
                csvBatchResults = { claims, total: claims.length };
                document.getElementById('fa-size').textContent =
                    (f.size / 1024 / 1024).toFixed(2) + ' MB · ' + claims.length + ' records ready for batch scoring';
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

// ==================== CLAIM INPUT BUILDER ====================
function buildClaimInput() {
    const idRaw = (document.getElementById('mot-id').value || '').replace(/\D/g, '');
    const id = parseInt(idRaw) || (Math.floor(Math.random() * 999998) + 1);
    const amount = parseFloat(document.getElementById('mot-amount').value) || 5000;
    const prevClaims = parseInt(document.getElementById('mot-prev').value) || 0;
    const daysSinceStart = parseInt(document.getElementById('mot-days').value) || 365;
    const loc = (document.getElementById('mot-loc').value || '').toLowerCase();
    const vehicleStr = (document.getElementById('mot-vehicle').value || '').toLowerCase();

    const seniority = daysSinceStart / 365;
    const area = (loc.includes('rural') || loc.includes('remote') || loc.includes('highway') || loc.includes('isolated')) ? 0 : 1;
    const premium = Math.max(amount * 0.05, 300);
    const valueVehicle = amount * 1.5;
    const yearMatch = vehicleStr.match(/\b(19|20)\d{2}\b/);
    const yearMatriculation = yearMatch ? parseInt(yearMatch[0]) : 2018;

    const fmt = d => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const now = new Date();
    const startDate = new Date(now.getTime() - daysSinceStart * 86400000);

    return {
        ID: id,
        Date_start_contract: fmt(startDate),
        Date_last_renewal: fmt(startDate),
        Date_next_renewal: fmt(new Date(startDate.getTime() + 365 * 86400000)),
        Date_birth: fmt(new Date(now.getFullYear() - 38, 6, 15)),
        Date_driving_licence: fmt(new Date(now.getFullYear() - 18, 3, 20)),
        Date_lapse: null,
        Seniority: parseFloat(seniority.toFixed(4)),
        Policies_in_force: 1, Max_policies: 1, Max_products: 1,
        Lapse: 0, Payment: 0, Distribution_channel: 1, Second_driver: 0,
        Premium: parseFloat(premium.toFixed(2)),
        Cost_claims_year: parseFloat(amount.toFixed(2)),
        N_claims_year: 1,
        N_claims_history: prevClaims + 1,
        R_Claims_history: parseFloat(((prevClaims + 1) / Math.max(seniority, 0.5)).toFixed(4)),
        Type_risk: 3, Area: area, Year_matriculation: yearMatriculation,
        Power: 90, Cylinder_capacity: 1600,
        Value_vehicle: parseFloat(valueVehicle.toFixed(2)),
        N_doors: 4, Weight: 1200, Length: 4500, Type_fuel: 'P',
        claim_records: null
    };
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
    apiResponsePromise = null;

    if (csvBatchResults && csvBatchResults.claims && csvBatchResults.claims.length > 0) {
        // Batch CSV → POST /predict/batch
        apiResponsePromise = fetch(API_BASE + '/predict/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claims: csvBatchResults.claims })
        }).then(r => {
            if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || r.statusText)));
            return r.json();
        });
    } else if (type === 'motor') {
        // Single motor claim → POST /predict
        const claimInput = buildClaimInput();
        apiResponsePromise = fetch(API_BASE + '/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(claimInput)
        }).then(r => {
            if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || r.statusText)));
            return r.json();
        });
    }

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
            if (apiResponsePromise) {
                apiResponsePromise
                    .then(data => showResults(type, data))
                    .catch(err => {
                        console.error('API error:', err);
                        showToast('API error — showing demo results: ' + err.message, 'danger');
                        showResults(type, null);
                    });
            } else {
                setTimeout(() => showResults(type, null), 500);
            }
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

function showResults(type, apiResponse) {
    setState('results');

    const isBatch = apiResponse && apiResponse.results;
    const isApiSingle = apiResponse && apiResponse.fraud_risk_score !== undefined;

    if (isBatch) {
        // ── BATCH results from API ──
        const results = apiResponse.results;
        const total = results.length;
        const tc = { HIGH: 0, MEDIUM: 0, LOW: 0, VERY_LOW: 0 };
        results.forEach(r => { tc[r.risk_tier] = (tc[r.risk_tier] || 0) + 1; });
        const highCount = tc.HIGH || 0;
        const medCount = tc.MEDIUM || 0;
        const flagged = highCount + medCount;
        const tierColor = t => t === 'HIGH' ? 'var(--red)' : t === 'MEDIUM' ? 'var(--orange)' : 'var(--green)';

        document.getElementById('res-claim-id').textContent = 'BATCH-ANALYSIS';
        document.getElementById('res-claim-meta').textContent =
            `Batch CSV Upload · ${total} claims · Analyzed ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;

        const banner = document.getElementById('risk-banner');
        banner.className = 'risk-banner' + (highCount > 0 ? '' : medCount > 0 ? ' medium-banner' : ' low-banner');
        const mainColor = highCount > 0 ? 'var(--red)' : medCount > 0 ? 'var(--orange)' : 'var(--green)';
        document.getElementById('rb-score').textContent = flagged;
        document.getElementById('rb-score').style.color = mainColor;
        document.getElementById('rb-tag').textContent = 'SUSPICIOUS CLAIMS';
        document.getElementById('rb-tag').style.color = mainColor;
        document.getElementById('rb-verdict').textContent =
            `${highCount} HIGH + ${medCount} MEDIUM risk claims detected out of ${total}`;
        document.getElementById('rb-verdict-sub').textContent =
            `${tc.LOW || 0} LOW risk · ${tc.VERY_LOW || 0} VERY LOW risk · ${Math.round((flagged / total) * 100)}% flagged rate`;
        document.getElementById('aec-risk-level').textContent = highCount > 0 ? 'HIGH RISK' : 'MEDIUM RISK';

        const topClaims = results
            .filter(r => r.risk_tier === 'HIGH' || r.risk_tier === 'MEDIUM')
            .sort((a, b) => b.fraud_risk_score - a.fraud_risk_score)
            .slice(0, 10);
        document.getElementById('aec-body').innerHTML =
            `<strong>Batch of ${total} claims scored by the AI ensemble.</strong> Risk breakdown: ` +
            `<span style="color:var(--red)">${highCount} HIGH</span>, ` +
            `<span style="color:var(--orange)">${medCount} MEDIUM</span>, ` +
            `<span>${(tc.LOW || 0) + (tc.VERY_LOW || 0)} LOW/VERY LOW</span>.` +
            (topClaims.length > 0 ? `<br><br><strong>Top suspicious claims:</strong>` +
            `<table style="width:100%;border-collapse:collapse;margin-top:0.5rem;font-size:0.8rem">` +
            `<thead><tr style="border-bottom:1px solid var(--border)">` +
            `<th style="text-align:left;padding:0.3rem 0.5rem">Policy ID</th>` +
            `<th style="text-align:left;padding:0.3rem 0.5rem">Fraud Risk %</th>` +
            `<th style="text-align:left;padding:0.3rem 0.5rem">Risk Tier</th></tr></thead><tbody>` +
            topClaims.map(r =>
                `<tr><td style="padding:0.3rem 0.5rem;font-family:monospace">${r.ID}</td>` +
                `<td style="padding:0.3rem 0.5rem;color:${tierColor(r.risk_tier)}">${(r.fraud_risk_score * 100).toFixed(1)}%</td>` +
                `<td style="padding:0.3rem 0.5rem;color:${tierColor(r.risk_tier)};font-weight:600">${r.risk_tier}</td></tr>`
            ).join('') + `</tbody></table>` : '') +
            `<br><strong>Recommendation: Route all HIGH risk cases to SIU for immediate review.</strong>`;

        setModuleScore('mot', Math.round((flagged / total) * 100),
            `${flagged} of ${total} flagged`, highCount > 0 ? 'red' : 'orange');

    } else if (isApiSingle) {
        // ── SINGLE motor prediction from API ──
        const r = apiResponse;
        const riskPct = Math.round(r.fraud_risk_score * 100);
        const claimId = document.getElementById('mot-id')?.value || 'MOT-2026-0001';
        const claimantName = document.getElementById('mot-name')?.value || 'Unknown';
        const vehicleMake = document.getElementById('mot-vehicle')?.value || 'Motor Vehicle';
        const prevClaims = parseInt(document.getElementById('mot-prev')?.value) || 0;
        const daysSinceStart = parseInt(document.getElementById('mot-days')?.value) || 365;
        const policeReport = document.getElementById('mot-police')?.value || 'no';

        document.getElementById('res-claim-id').textContent = claimId;
        document.getElementById('res-claim-meta').textContent =
            `Motor Insurance · ${claimantName} · ${vehicleMake} · Analyzed ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`;

        const tierConfig = {
            HIGH:     { cls: '',              color: 'var(--red)',    tag: 'HIGH RISK' },
            MEDIUM:   { cls: ' medium-banner', color: 'var(--orange)', tag: 'MEDIUM RISK' },
            LOW:      { cls: ' low-banner',   color: 'var(--green)',  tag: 'LOW RISK' },
            VERY_LOW: { cls: ' low-banner',   color: 'var(--green)',  tag: 'VERY LOW RISK' }
        };
        const tcfg = tierConfig[r.risk_tier] || tierConfig.LOW;
        document.getElementById('risk-banner').className = 'risk-banner' + tcfg.cls;
        document.getElementById('rb-score').textContent = riskPct;
        document.getElementById('rb-score').style.color = tcfg.color;
        document.getElementById('rb-tag').textContent = tcfg.tag;
        document.getElementById('rb-tag').style.color = tcfg.color;
        document.getElementById('rb-verdict').textContent =
            r.risk_tier === 'HIGH'   ? `ML ensemble flagged this claim as HIGH risk (${riskPct}% fraud probability)` :
            r.risk_tier === 'MEDIUM' ? `Motor claim shows moderate fraud indicators (${riskPct}% fraud probability)` :
                                       `Motor claim appears low risk (${riskPct}% fraud probability)`;
        document.getElementById('rb-verdict-sub').textContent =
            `Ensemble anomaly score ${Math.round(r.ensemble_anomaly_score * 100)}/100 — ` +
            (r.risk_tier === 'HIGH'   ? 'multiple behavioral signals detected. Immediate investigation recommended.' :
             r.risk_tier === 'MEDIUM' ? 'some anomalies present. Further review recommended.' :
                                        'no major red flags detected. Standard processing.');
        document.getElementById('aec-risk-level').textContent = tcfg.tag;
        document.getElementById('aec-body').innerHTML =
            `This motor claim was scored by our <strong>4-model AI ensemble</strong>:` +
            `<ul style="margin:0.5rem 0 0.5rem 1.2rem;line-height:1.9">` +
            `<li><strong>Isolation Forest anomaly:</strong> ${(r.iso_score * 100).toFixed(1)}/100</li>` +
            `<li><strong>Local Outlier Factor:</strong> ${(r.lof_score * 100).toFixed(1)}/100</li>` +
            `<li><strong>Autoencoder reconstruction error:</strong> ${(r.ae_score * 100).toFixed(1)}/100</li>` +
            `<li><strong>Ensemble anomaly score:</strong> ${(r.ensemble_anomaly_score * 100).toFixed(1)}/100</li>` +
            `<li><strong>Calibrated RF P(fraud):</strong> <span style="color:${tcfg.color};font-weight:700">${riskPct}%</span></li>` +
            `</ul>` +
            (prevClaims >= 3 ? `<strong>⚠️ ${prevClaims} previous claims in 3 years</strong> — significantly above national average.<br>` : '') +
            (daysSinceStart <= 30 ? `<strong>⚠️ Policy active only ${daysSinceStart} days</strong> — early claim filing indicator.<br>` : '') +
            (policeReport === 'no' ? `<strong>⚠️ No police report filed</strong> — unusual for significant damage claim.<br>` : '') +
            `<br><strong>Recommendation: ` +
            (r.risk_tier === 'HIGH'   ? 'Escalate to SIU for immediate investigation.' :
             r.risk_tier === 'MEDIUM' ? 'Assign to adjuster for detailed review before payout.' :
                                        'Standard processing — no immediate action required.') +
            `</strong>`;

        setModuleScore('mot', riskPct, tcfg.tag, r.risk_tier === 'HIGH' ? 'red' : r.risk_tier === 'MEDIUM' ? 'orange' : 'green');

        // Populate motor signals list with real data + API sub-scores
        const signals = [];
        if (prevClaims >= 3) signals.push({ cls: 'high', icon: 'alert-triangle', title: `${prevClaims} Previous Claims in 3 Years`, body: 'Above average claim frequency — behavioral fraud indicator.' });
        if (daysSinceStart <= 30) signals.push({ cls: 'high', icon: 'clock', title: `Policy Active Only ${daysSinceStart} Days`, body: 'Early claim filing after recent activation — staged fraud signal.' });
        if (policeReport === 'no') signals.push({ cls: 'medium', icon: 'file-x', title: 'No Police Report Filed', body: 'Significant damage claimed without official incident documentation.' });
        const scoreClass = s => s > 0.7 ? 'high' : s > 0.5 ? 'medium' : 'low';
        signals.push({ cls: scoreClass(r.iso_score),          icon: 'bar-chart-2',    title: `Isolation Forest: ${(r.iso_score * 100).toFixed(1)}/100`,          body: 'Statistical outlier detection vs. reference policy portfolio.' });
        signals.push({ cls: scoreClass(r.lof_score),          icon: 'git-branch',     title: `Local Outlier Factor: ${(r.lof_score * 100).toFixed(1)}/100`,         body: 'Local density-based anomaly score compared to similar policies.' });
        signals.push({ cls: scoreClass(r.ae_score),           icon: 'cpu',            title: `Autoencoder Score: ${(r.ae_score * 100).toFixed(1)}/100`,             body: 'Neural network reconstruction error — measures profile unusualness.' });
        signals.push({ cls: scoreClass(r.ensemble_anomaly_score), icon: 'layers',     title: `Ensemble Anomaly: ${(r.ensemble_anomaly_score * 100).toFixed(1)}/100`, body: 'Mean of all three unsupervised anomaly detector scores.' });
        const sl = document.getElementById('signals-list');
        if (sl) sl.innerHTML = signals.map(s =>
            `<div class="sig-item ${s.cls}"><i data-lucide="${s.icon}"></i>` +
            `<div><strong>${s.title}</strong><p>${s.body}</p></div></div>`
        ).join('');

    } else {
        // ── FALLBACK demo data ──
        const r = RESULTS[type] || RESULTS.motor;
        document.getElementById('res-claim-id').textContent = r.claimId;
        document.getElementById('res-claim-meta').textContent =
            r.meta + ' · Analyzed ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const banner = document.getElementById('risk-banner');
        banner.className = 'risk-banner' + (r.overallScore >= 70 ? '' : r.overallScore >= 40 ? ' medium-banner' : ' low-banner');
        const scoreColor = r.overallScore >= 70 ? 'var(--red)' : r.overallScore >= 40 ? 'var(--orange)' : 'var(--green)';
        document.getElementById('rb-score').textContent = r.overallScore;
        document.getElementById('rb-score').style.color = scoreColor;
        document.getElementById('rb-tag').textContent = r.overallTag;
        document.getElementById('rb-tag').style.color = scoreColor;
        document.getElementById('rb-verdict').textContent = r.verdict;
        document.getElementById('rb-verdict-sub').textContent = r.verdictSub;
        document.getElementById('aec-risk-level').textContent = r.overallTag;
        document.getElementById('aec-body').innerHTML = r.aiText;
        setModuleScore('mot', r.motScore, r.motRisk, r.motScore >= 70 ? 'red' : 'orange');
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
