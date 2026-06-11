# LaRonde

SaaS de gestion des poubelles pour mairies françaises.  
Stack : Next.js 14 + Node.js/Express + MySQL + Leaflet + PWA + Stripe

## Structure

```
projet mairie/
├── backend/        Node.js + Express API
└── frontend/       Next.js 14 + TailwindCSS + PWA
```

## Démarrage rapide

### 1. Prérequis
- Node.js 18+
- MySQL 8+

### 2. Backend

```bash
cd backend
cp .env.example .env      # Remplir tous les champs
npm install
npm run db:migrate        # Crée la BDD + tables
npm run db:seed           # Données demo
npm run dev               # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev               # http://localhost:3000
```

### Comptes de démonstration

| Rôle    | Email           | Mot de passe |
|---------|-----------------|--------------|
| Chef    | chef@demo.fr    | chef1234     |
| Agent 1 | agent1@demo.fr  | tech1234     |
| Agent 2 | agent2@demo.fr  | tech1234     |

## Pages

### Chef (web)
| URL           | Description                                  |
|---------------|----------------------------------------------|
| /dashboard    | Stats temps réel + dernières collectes + SSE |
| /carte        | Carte Leaflet rouge/vert + filtres            |
| /poubelles    | Gestion poubelles (CRUD)                     |
| /agents       | Gestion agents                               |
| /recaps       | Graphiques semaine / mois / 3 mois           |
| /abonnement   | Stripe checkout / portail billing            |

### Agent (PWA mobile)
| URL       | Description                                   |
|-----------|-----------------------------------------------|
| /tournee  | 4 onglets : À faire / Déjà fait / Progression / Remarque |

### Admin (propriétaire)
| URL    | Description                        |
|--------|------------------------------------|
| /admin | Toutes les mairies, stats globales |

## Fonctionnalités

- **Authentification JWT** — rôles chef / technicien / admin
- **Carte Leaflet** — rouge = à collecter, vert = collectée, popup détail
- **Vérification GPS** — agent doit être à < 100m de la poubelle
- **Temps réel SSE** — dashboard chef mis à jour instantanément
- **PWA offline** — Service Worker + file d'attente IndexedDB
- **Rapport PDF** — généré via PDFKit, envoyé par email
- **Cron auto** — rapport le 1er de chaque mois + alerte si > 50% non collecté
- **Stripe** — checkout + portail facturation + webhooks
- **Admin panel** — créer mairies, suspendre, stats globales

## Routes API principales

```
POST   /api/auth/login
GET    /api/auth/me
GET    /api/auth/agents              (chef)
POST   /api/auth/agents              (chef)
GET    /api/bins
POST   /api/bins                     (chef)
PUT    /api/bins/:id                 (chef)
DELETE /api/bins/:id                 (chef, archive)
POST   /api/collections              (GPS check)
GET    /api/collections/stats/dashboard
GET    /api/collections/stats/map
GET    /api/remarks
POST   /api/remarks
PATCH  /api/remarks/:id/status       (chef)
GET    /api/reports/recap?period=week|month|quarter
POST   /api/reports/monthly          (génère PDF + envoie email)
GET    /api/events                   (SSE, token en query param)
POST   /api/stripe/checkout          (chef)
POST   /api/stripe/portal            (chef)
POST   /api/stripe/webhook
GET    /api/admin/stats              (X-Admin-Secret header)
GET    /api/admin/municipalities
POST   /api/admin/municipalities
PATCH  /api/admin/municipalities/:id
```

## Stripe — Configuration

1. Créer 2 produits dans Stripe Dashboard : Starter (200€/mois) et Pro (500€/mois)
2. Copier les Price IDs dans `.env` :
   ```
   STRIPE_PRICE_STARTER=price_xxx
   STRIPE_PRICE_PRO=price_yyy
   ```
3. Configurer le webhook Stripe vers `POST /api/stripe/webhook`

