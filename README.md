# TaskFlow — Application de Gestion de Projets Collaboratifs

> Projet de fin de module · JavaScript · Express · MongoDB · Docker · GitHub  
> Date de rendu : **20 mai 2026**

---

## 📋 Présentation

**TaskFlow** est une application web fullstack de gestion de projets collaboratifs.  
Elle permet aux utilisateurs de créer des projets, d'y inviter des membres, de gérer des tâches avec priorités et statuts, et de suivre l'activité de l'équipe en temps réel via un système de notifications.

---

## 👥 Membres du groupe

| Nom complet | Rôle | GitHub |
|-------------|------|--------|
| Mohammed Tahiri | Chef de projet | @MohammedsTAHIRI |

---

## 🚀 Démarrage rapide

### Prérequis

- [Docker](https://www.docker.com/) & Docker Compose installés
- Git

### Installation & lancement

```bash
# 1. Cloner le dépôt
git clone https://github.com/MohammedsTAHIRI/Taskflow-Projet.git
cd taskflow

# 2. Configurer les variables d'environnement
cp server/.env.exemple server/.env
# Éditez server/.env et renseignez JWT_SECRET et MONGO_URI

# 3. Lancer l'application (une seule commande)
docker-compose up --build
```

L'application sera accessible sur **http://localhost:5000** (API) et les fichiers client dans `client/`.

> ⚠️ La base de données MongoDB tourne **exclusivement dans Docker** — aucune installation locale requise.

---

## ⚙️ Configuration

Créez le fichier `server/.env` (jamais versionné) :

```env
MONGO_URI=mongodb://mongo:27017/taskflow
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire
PORT=5000
```

---

## 🏗️ Architecture du projet

```
taskflow/
├── docker-compose.yml          # Orchestration Docker (MongoDB + serveur)
├── README.md
├── client/                     # Frontend statique (HTML/CSS/JS vanilla)
│   ├── index.html              # Tableau de bord
│   ├── login.html              # Connexion
│   ├── register.html           # Inscription
│   ├── projects.html           # Liste des projets
│   ├── tasks.html              # Gestion des tâches
│   ├── css/
│   │   └── style.css           # Styles globaux (palette #222831 / #00ADB5)
│   └── js/
│       ├── api.js              # Client HTTP (fetch + JWT auto)
│       ├── auth.js             # Gestion session, login, register, logout
│       ├── dashboard.js        # Métriques + tâches en cours
│       ├── projects.js         # CRUD projets + gestion membres
│       ├── tasks.js            # CRUD tâches + filtres + brouillons
│       ├── activities.js       # Fil d'activité
│       └── notifications.js   # Polling + badge + archivage localStorage
└── server/                     # Backend Node.js / Express
    ├── Dockerfile
    ├── package.json
    ├── server.js               # Point d'entrée Express
    ├── .env.exemple
    ├── .gitignore
    ├── models/
    │   ├── User.js             # Schéma utilisateur (bcrypt 10 rounds)
    │   ├── Project.js          # Schéma projet (cascade delete)
    │   ├── Task.js             # Schéma tâche (enum priorité/statut)
    │   ├── Activity.js         # Schéma activité
    │   └── Notification.js     # Schéma notification
    ├── routes/
    │   ├── auth.js             # POST /api/auth/register|login
    │   ├── dashboard.js        # GET  /api/dashboard (agrégation MongoDB)
    │   ├── projects.js         # CRUD /api/projects + membres
    │   ├── tasks.js            # CRUD /api/tasks + PATCH statut
    │   ├── activities.js       # GET  /api/projects/:id/activities
    │   └── notifications.js   # GET|PATCH /api/notifications
    ├── middleware/
    │   ├── auth.js             # Vérification JWT Bearer
    │   ├── roles.js            # requireOwner / requireMember
    │   └── validation.js       # Validation des champs (enum)
    └── utils/
        ├── logActivity.js      # Enregistrement automatique des activités
        └── sendNotification.js # Création de notifications
```

---

## ✅ Fonctionnalités implémentées

### F1 — Authentification
- Inscription avec nom complet, email, mot de passe (haché bcryptjs, 10 rounds)
- Connexion avec génération de token JWT (24h, clé dans `.env`)
- Token stocké dans `localStorage`, envoyé en `Authorization: Bearer`
- Restauration automatique de session au rechargement
- Redirection vers `index.html` si déjà connecté sur login/register
- Bouton de déconnexion (supprime token + redirect)
- Middleware `auth.js` protégeant toutes les routes authentifiées

### F2 — Gestion des projets
- CRUD complet (`GET`, `POST`, `PUT`, `DELETE`) sur `/api/projects`
- Champs : titre, description, date limite, statut (`actif` / `en pause` / `archivé`)
- Projet lié à son créateur (`owner` ObjectId)
- Suppression en cascade des tâches via `pre('deleteOne')` Mongoose
- Liste paginée (`page` & `limit`)

### F3 — Gestion des tâches
- CRUD sur `/api/tasks/:id`
- Champs obligatoires : titre, priorité (`basse/moyenne/haute`), statut (`à faire/en cours/terminé`)
- Validation `enum` dans le schéma Mongoose et dans le middleware de validation
- Route `GET /api/projects/:id/tasks` — toutes les tâches d'un projet
- Route `PATCH /api/tasks/:id/status` — mise à jour du statut uniquement
- Collection `tasks` séparée avec référence `project`

### F4 — Assignation des tâches
- Champ `assignedTo` (ObjectId → `users`) dans le schéma tâche
- `.populate()` avec projection (nom + email, sans mot de passe)
- Menu déroulant alimenté par les membres du projet (appel Axios)
- Dashboard filtré : un membre ne voit que ses tâches assignées
- Filtrage Mongoose multi-conditions (`project` + `assignedTo`)

### F5 — Tableau de bord personnel
- Métriques calculées côté serveur : projets actifs, tâches assignées, terminées, en retard
- Tâche en retard = `dueDate` dépassée ET statut ≠ `terminé`
- Pipeline d'agrégation MongoDB (`$match`, `$group`, `$addFields`, `$sort`)
- Tâches en cours triées par priorité décroissante puis date limite croissante
- Chargement en un seul appel Axios au `DOMContentLoaded`

### F6 — Filtrage, recherche et pagination
- Filtres par statut, priorité, membre assigné
- Recherche par mot-clé (`$regex` + option `i`) sur titre et description
- Paramètres transmis via query string HTTP
- Filtre Mongoose construit conditionnellement
- Réponse JSON : `{ data, total, page, totalPages }`
- Contrôles de navigation entre pages dans l'interface

### F7 — Sauvegarde automatique des brouillons
- Sauvegarde à chaque événement `input` dans `localStorage`
- Clé identifiée par l'ID du projet (isolation multi-projets)
- Détection et proposition de restauration au chargement du formulaire
- Suppression du brouillon après soumission réussie

### F8 — Gestion des membres
- Invitation par email (vérification compte existant avant ajout)
- Contrôle d'accès par rôle : seul le créateur modifie/supprime le projet
- Membres : peuvent uniquement mettre à jour le statut de leurs tâches assignées
- Retrait de membre → suppression immédiate de l'accès
- Routes réservées au créateur (`requireOwner`)

### F9 — Historique des activités
- Événements tracés : création/suppression de tâche, changement de statut, ajout/retrait de membre, modification de projet
- Collection `activities` dédiée (type, projectId, userId, timestamp)
- Route `GET /api/projects/:id/activities` (tri anti-chronologique)
- Affichage lisible : *« Adil a changé le statut de Maquette à Terminé — il y a 2 heures »*

### F10 — Notifications
- Notification lors de l'assignation d'une tâche, changement de statut, ajout à un projet
- Badge de notifications non lues sur l'icône 🔔 dans la navbar
- Récupération via `GET /api/notifications`, stockée en mémoire JS côté client
- Marquage lu via `PATCH /api/notifications/:id/read` (mise à jour badge en temps réel)
- Archivage des notifications lues dans `localStorage`
- Polling automatique toutes les **30 secondes** avec `setInterval`

---

## 🔀 Workflow Git

```
main          ← code validé uniquement (via PR depuis develop)
  └── develop ← intégration continue
        ├── feature/authentification
        ├── feature/projets
        ├── feature/taches
        ├── feature/assignation
        ├── feature/dashboard
        ├── feature/filtrage
        ├── feature/brouillons
        ├── feature/membres
        ├── feature/activites
        └── feature/notifications
```

- Toutes les fusions vers `develop` se font via **Pull Request** (relecture par ≥ 1 membre)
- Convention des commits : `feat:`, `fix:`, `docs:`, `refactor:` ([Conventional Commits](https://www.conventionalcommits.org/))

---

## 🌐 Routes API

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| POST | `/api/auth/register` | Créer un compte | — |
| POST | `/api/auth/login` | Se connecter (JWT) | — |
| GET | `/api/dashboard` | Métriques + tâches en cours | ✅ |
| GET | `/api/projects` | Liste paginée des projets | ✅ |
| POST | `/api/projects` | Créer un projet | ✅ |
| PUT | `/api/projects/:id` | Modifier un projet | ✅ owner |
| DELETE | `/api/projects/:id` | Supprimer (cascade) | ✅ owner |
| GET | `/api/projects/:id/tasks` | Tâches d'un projet | ✅ member |
| GET | `/api/projects/:id/members` | Membres d'un projet | ✅ member |
| POST | `/api/projects/:id/members` | Inviter par email | ✅ owner |
| DELETE | `/api/projects/:id/members/:mid` | Retirer un membre | ✅ owner |
| GET | `/api/projects/:id/activities` | Fil d'activité | ✅ member |
| GET | `/api/tasks` | Tâches assignées à moi | ✅ |
| GET | `/api/tasks/project/:id` | Tâches filtrées/paginées | ✅ member |
| POST | `/api/tasks` | Créer une tâche | ✅ owner |
| PUT | `/api/tasks/:id` | Modifier une tâche | ✅ owner |
| DELETE | `/api/tasks/:id` | Supprimer une tâche | ✅ owner |
| PATCH | `/api/tasks/:id/status` | Changer le statut | ✅ owner/assigned |
| GET | `/api/notifications` | Mes notifications | ✅ |
| PATCH | `/api/notifications/:id/read` | Marquer comme lue | ✅ |

---

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML5, CSS3, JavaScript (Vanilla) |
| Backend | Node.js, Express.js |
| Base de données | MongoDB 7 (Docker) |
| ODM | Mongoose |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| HTTP Client | Fetch API (avec Authorization Bearer auto) |
| Containerisation | Docker, Docker Compose |
| Versioning | Git + GitHub (Conventional Commits) |

---

## 📁 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `MONGO_URI` | URI de connexion MongoDB | `mongodb://mongo:27017/taskflow` |
| `JWT_SECRET` | Clé secrète de signature JWT | `mon_secret_32_chars_minimum` |
| `PORT` | Port du serveur Express | `5000` |

> Le fichier `.env` est listé dans `.gitignore` et ne sera **jamais** commité.

