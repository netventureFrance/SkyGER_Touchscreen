# Sky Sport Touchscreen - Visualisierung

Interaktive Web-Visualisierung für das Sky Sport Touchscreen System.

## Übersicht

Diese Anwendung dokumentiert die komplette Struktur des RCS Touch Systems, das bei Sky Deutschland für Live-TV-Produktionen eingesetzt wird.

## Features

- **Radiales Hauptmenü** - 9 Kategorien im Sky Sport Design
- **Mehrstufige Navigation** - Bis zu 4 Ebenen tief
- **Notion Integration** - Live-Daten aus Notion
- **Responsive Design** - Optimiert für verschiedene Bildschirmgrößen
- **Sky Design System** - Authentisches Look & Feel

## Projektstruktur

```
sky-touchscreen-viz/
├── index.html              # Hauptseite
├── css/
│   └── styles.css          # Sky Design System
├── js/
│   ├── app.js              # Hauptanwendung
│   ├── data.js             # Datenstruktur
│   ├── radial-menu.js      # Radiales Menü Komponente
│   └── notion-api.js       # Notion API Client
├── netlify/
│   └── functions/
│       └── notion-proxy.js # API Proxy
├── netlify.toml            # Netlify Konfiguration
├── package.json            # Dependencies
└── .env.example            # Umgebungsvariablen Vorlage
```

## Installation

### Lokal entwickeln

```bash
# Repository klonen
git clone https://github.com/[username]/sky-touchscreen-viz.git
cd sky-touchscreen-viz

# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env
# Notion Token eintragen

# Entwicklungsserver starten
npm run dev
```

### Auf Netlify deployen

1. Repository mit Netlify verbinden
2. Environment Variables setzen:
   - `NOTION_TOKEN` - Notion Integration Token
   - `NOTION_PAGE_ID` - Haupt-Page ID (optional)
3. Deploy auslösen

## Notion Setup

### Integration erstellen

1. Gehe zu [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Neue Integration erstellen
3. Token kopieren und als `NOTION_TOKEN` speichern

### Seite verbinden

1. Öffne die Sky Touchscreen Seite in Notion
2. "Share" → "Invite" → Integration hinzufügen
3. Page ID aus der URL kopieren

**Page IDs:**
- Projekt: `2b9f99a2be228098a506e3621bf4d538`
- Dokumentation: `2caf99a2be228014a094ec591bad7089`
- Arbeitsbereich: `2e9f99a2be2281379653c6ba4b29400f`

## API Endpoints

Die Netlify Function stellt folgende Endpoints bereit:

| Endpoint | Parameter | Beschreibung |
|----------|-----------|--------------|
| `/api/page` | `id` | Seite abrufen |
| `/api/blocks` | `id` | Blocks einer Seite |
| `/api/children` | `id` | Kinder-Seiten |
| `/api/database` | `id` | Datenbank abfragen |
| `/api/search` | `query` | Seiten durchsuchen |
| `/api/health` | - | Status Check |

## Datenstruktur

Die komplette Struktur des RCS Touch Systems:

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

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Netlify Functions (Node.js)
- **API:** Notion API v1
- **Hosting:** Netlify

## Termine

- **08.01.2026** - Workshop II mit Sky
- **Phase I** - Ablösung RCS für Fußball

## Lizenz

MIT
