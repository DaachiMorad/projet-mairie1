const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"LaRonde" <${process.env.SMTP_USER}>`;

async function sendTestEmail(to) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject: '✅ Test LaRonde — Email bien configuré',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:40px">🗑</span>
          <h1 style="color:#15803d;margin:8px 0 4px">LaRonde</h1>
          <p style="color:#6b7280;margin:0">Gestion des collectes municipales</p>
        </div>
        <div style="background:white;border-radius:10px;padding:24px;border:1px solid #e5e7eb">
          <h2 style="color:#111827;margin-top:0">Email de test ✅</h2>
          <p style="color:#374151">Votre configuration email est bien en place. Vous recevrez vos récapitulatifs de collecte à cette adresse.</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px">LaRonde · Plateforme SaaS de gestion municipale</p>
      </div>
    `,
  });
}

async function sendRecapEmail(to, data) {
  const { mairie, period, totalCollections, totalBins, collectionRate, byAgent, byType, remarks } = data;
  const periodLabels = { week: '7 derniers jours', month: '30 derniers jours', quarter: '3 derniers mois' };
  const periodLabel = periodLabels[period] || period;

  const agentRows = (byAgent || []).map(a =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${a.firstName} ${a.lastName}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${a.count}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af">Aucune donnée</td></tr>';

  const typeRows = (byType || []).map(t =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-transform:capitalize">${t.type}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">${t.count}</td></tr>`
  ).join('') || '<tr><td colspan="2" style="padding:8px 12px;color:#9ca3af">Aucune donnée</td></tr>';

  const remarkTotal = (remarks || []).reduce((s, r) => s + r.count, 0);

  return transporter.sendMail({
    from: FROM,
    to,
    subject: `📊 Récap LaRonde — ${mairie} (${periodLabel})`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <span style="font-size:36px">🗑</span>
          <h1 style="color:#15803d;margin:8px 0 4px">LaRonde</h1>
          <p style="color:#6b7280;margin:0">${mairie} · Récapitulatif — ${periodLabel}</p>
        </div>

        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e5e7eb;text-align:center">
            <p style="font-size:28px;font-weight:700;color:#111827;margin:0">${totalCollections}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Collectes totales</p>
          </div>
          <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e5e7eb;text-align:center">
            <p style="font-size:28px;font-weight:700;color:#15803d;margin:0">${collectionRate}%</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Taux de collecte</p>
          </div>
          <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e5e7eb;text-align:center">
            <p style="font-size:28px;font-weight:700;color:#111827;margin:0">${totalBins}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Poubelles actives</p>
          </div>
          <div style="background:white;border-radius:10px;padding:16px;border:1px solid #e5e7eb;text-align:center">
            <p style="font-size:28px;font-weight:700;color:#f97316;margin:0">${remarkTotal}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Incidents signalés</p>
          </div>
        </div>

        <!-- Agents -->
        <div style="background:white;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:16px">
          <h3 style="margin:0 0 12px;color:#111827">👥 Performance par agent</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb">Agent</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb">Collectes</th>
            </tr></thead>
            <tbody>${agentRows}</tbody>
          </table>
        </div>

        <!-- Types -->
        <div style="background:white;border-radius:10px;padding:20px;border:1px solid #e5e7eb;margin-bottom:16px">
          <h3 style="margin:0 0 12px;color:#111827">🗑 Par type de poubelle</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb">Type</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb">Collectes</th>
            </tr></thead>
            <tbody>${typeRows}</tbody>
          </table>
        </div>

        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px">
          LaRonde · Envoi automatique — ne pas répondre à cet email
        </p>
      </div>
    `,
  });
}

async function sendAlertEmail(to, subject, message) {
  return transporter.sendMail({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
        <div style="text-align:center;margin-bottom:20px">
          <span style="font-size:36px">⚠️</span>
          <h1 style="color:#15803d;margin:8px 0 4px">LaRonde</h1>
        </div>
        <div style="background:white;border-radius:10px;padding:24px;border:1px solid #fbbf24">
          <p style="color:#374151;margin:0;font-size:15px">${message}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px">LaRonde · Alerte automatique</p>
      </div>
    `,
  });
}

module.exports = { sendTestEmail, sendRecapEmail, sendAlertEmail };
