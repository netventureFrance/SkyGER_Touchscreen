# Sky Sport Touchscreen - Visualisierung

**Version 1.39.3**

Interaktive Web-Visualisierung für das Sky Sport Touchscreen System.

## Übersicht

Diese Anwendung dokumentiert die komplette Struktur des RCS Touch Systems, das bei Sky Deutschland für Live-TV-Produktionen eingesetzt wird. Die Daten werden aus einer Notion-Datenbank synchronisiert und als interaktive Mindmap dargestellt.

## Features

- **Interaktive Mindmap** - Hierarchische Navigation durch alle Funktionen
- **Screenshot-Vorschau** - Bilder direkt in der Visualisierung
- **Notion Integration** - Automatische Synchronisierung via GitHub Actions
- **Admin Panel** - Manuelles Auslösen der Synchronisierung
- **Responsive Design** - Optimiert für verschiedene Bildschirmgrößen
- **Sky Design System** - Authentisches Look & Feel

## Projektstruktur

```
SkyGER_Touchscreen/
├── index.html                 # Hauptseite (Mindmap)
├── admin.html                 # Admin Panel für Sync
├── version.json               # Versionsnummer
├── favicon.ico
│
├── css/
│   ├── styles.css             # Sky Design System (Basis)
│   └── mindmap.css            # Mindmap-spezifische Styles
│
├── js/
│   ├── data.js                # Generierte Datenstruktur (SKY_DATA)
│   └── mindmap.js             # MindmapView Klasse
│
├── images/
│   ├── screenshots/           # Lokale Screenshots (151 Bilder)
│   ├── notion-data.json       # Exportierte Notion-Daten
│   ├── screenshot-mapping.json# Screenshot-Zuordnung
│   └── README.md              # Dokumentation der Bildverwaltung
│
├── netlify/
│   └── functions/
│       └── sync.js            # Netlify Function für Sync-Trigger
│
├── scripts/
│   └── setup-notion-db.js     # Notion Datenbank Setup
│
├── mcp-notion-server/         # Notion Synchronisierung
│   ├── sync-notion.js         # Haupt-Sync-Skript (GitHub Actions)
│   ├── download-images.js     # Screenshot-Download
│   ├── explore-notion.js      # Notion-Struktur erkunden
│   ├── src/index.js           # MCP Server Entry Point
│   ├── utils/                 # Einmalige Utility-Skripte
│   │   ├── setup-db.js
│   │   ├── populate-db.js
│   │   ├── check-db.js
│   │   └── ...
│   └── package.json           # Dependencies
│
├── .github/
│   └── workflows/
│       └── sync-notion.yml    # GitHub Actions Workflow
│
├── netlify.toml               # Netlify Konfiguration
├── package.json               # Projekt Dependencies
├── .env.example               # Umgebungsvariablen Vorlage
└── .gitignore
```

## Installation

### Lokal entwickeln

```bash
# Repository klonen
git clone https://github.com/[username]/SkyGER_Touchscreen.git
cd SkyGER_Touchscreen

# Dependencies installieren
npm install
cd mcp-notion-server && npm install && cd ..

# .env Datei erstellen
cp .env.example .env
# NOTION_TOKEN eintragen

# Entwicklungsserver starten
npm run dev
```

### Auf Netlify deployen

1. Repository mit Netlify verbinden
2. Environment Variables setzen:
   - `NOTION_TOKEN` - Notion Integration Token
   - `GITHUB_TOKEN` - GitHub Personal Access Token (für Sync)
3. Deploy auslösen

## Notion Synchronisierung

### Automatische Sync

Die Synchronisierung läuft über GitHub Actions:
1. Admin Panel öffnen (`/admin.html`)
2. Anmelden
3. "Sync from Notion" klicken
4. GitHub Actions Workflow wird ausgelöst
5. `sync-notion.js` holt Daten und Screenshots
6. Änderungen werden automatisch committed

### Manuelle Sync (lokal)

```bash
cd mcp-notion-server
node sync-notion.js
```

## Admin Panel

Zugriff über `/admin.html`:
- **Sync Status** - Zeigt letzte Synchronisierung
- **Sync Trigger** - Manuelles Auslösen
- **Sync Log** - Protokoll der Aktionen
- **Version Info** - Aktuelle Version

## Datenstruktur

Die Mindmap zeigt folgende Struktur:

```
Sky Touchscreen
├── RCS TOUCH
│   ├── Spiele (Statistik, Aufstellung, Analyse)
│   ├── Tabelle (sortierbar)
│   ├── Liga Info (Top Teams, Top Spieler)
│   ├── Analyse (Ballbesitz, Heatmap, Passmap, ...)
│   ├── Multiview (4 Live-Inputs)
│   ├── Live (Fullscreen)
│   ├── Headlines
│   ├── Twitter
│   └── Telestrator
├── Shows (Bundesliga, CL, PL, ...)
├── AKI Paint (F1, MotoGP, Tennis, Eishockey)
└── RCS Webapplikation
```

## Technologie

| Komponente | Technologie |
|------------|-------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Hosting | Netlify |
| Functions | Netlify Functions (Node.js) |
| Sync | GitHub Actions |
| Datenquelle | Notion API v1 |
| MCP Server | Node.js |

## Lizenz

MIT
