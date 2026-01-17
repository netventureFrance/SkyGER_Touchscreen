# Architektur

## Übersicht

Das Sky Sport Touchscreen Projekt besteht aus einer statischen Website, die Daten aus Notion synchronisiert und als interaktive Mindmap darstellt.

## Datenfluss

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATENFLUSS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │    Notion    │         │   GitHub     │         │   Netlify    │
  │   Database   │         │   Actions    │         │   Hosting    │
  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
         │                        │                        │
         │  1. Workflow           │                        │
         │     Trigger            │                        │
         │ ◄──────────────────────┤                        │
         │                        │                        │
         │  2. API Calls          │                        │
         │     (Notion API)       │                        │
         ├───────────────────────►│                        │
         │                        │                        │
         │  3. Daten + Bilder     │                        │
         │                        │                        │
         │                  ┌─────┴─────┐                  │
         │                  │ sync-     │                  │
         │                  │ notion.js │                  │
         │                  └─────┬─────┘                  │
         │                        │                        │
         │                        │ 4. Generiert:          │
         │                        │    - js/data.js        │
         │                        │    - images/*.json     │
         │                        │    - images/screenshots│
         │                        │                        │
         │                        │ 5. Git Commit & Push   │
         │                        ├───────────────────────►│
         │                        │                        │
         │                        │                  6. Auto-Deploy
         │                        │                        │
         │                        │                  ┌─────┴─────┐
         │                        │                  │  Website  │
         │                        │                  │  (Static) │
         │                        │                  └───────────┘
```

## Komponenten

### 1. Frontend (Statische Website)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  index.html                    admin.html                       │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │                     │      │                     │          │
│  │   Mindmap View      │      │   Admin Panel       │          │
│  │   (Hauptanwendung)  │      │   (Sync Control)    │          │
│  │                     │      │                     │          │
│  └──────────┬──────────┘      └──────────┬──────────┘          │
│             │                            │                      │
│             ▼                            ▼                      │
│  ┌─────────────────────┐      ┌─────────────────────┐          │
│  │ js/mindmap.js       │      │ Netlify Function    │          │
│  │ js/data.js          │      │ (sync.js)           │          │
│  └─────────────────────┘      └─────────────────────┘          │
│                                                                  │
│  Styles: css/styles.css, css/mindmap.css                        │
│  Assets: images/screenshots/*                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Dateien:**
- `index.html` - Hauptseite mit interaktiver Mindmap
- `admin.html` - Admin Panel zum Auslösen der Synchronisierung
- `js/mindmap.js` - MindmapView Klasse (Rendering, Interaktion, Zoom)
- `js/data.js` - Generierte Datenstruktur (SKY_DATA Objekt)
- `css/styles.css` - Sky Design System Basisstyles
- `css/mindmap.css` - Mindmap-spezifische Styles

### 2. Synchronisierung

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYNCHRONISIERUNG                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    GitHub Actions                          │  │
│  │                  (.github/workflows/sync-notion.yml)       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                 mcp-notion-server/                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  sync-notion.js (Hauptskript)                       │  │  │
│  │  │  - Liest Notion Datenbank                           │  │  │
│  │  │  - Navigiert durch alle Seiten/Blöcke               │  │  │
│  │  │  - Extrahiert Bilder aus Toggle-Blöcken             │  │  │
│  │  │  - Generiert js/data.js                             │  │  │
│  │  │  - Generiert images/notion-data.json                │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  download-images.js                                 │  │  │
│  │  │  - Lädt Screenshots von Notion-URLs                 │  │  │
│  │  │  - Speichert in images/screenshots/                 │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  Dependencies: @notionhq/client, dotenv                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Workflow:**
1. Admin klickt "Sync" im Admin Panel
2. Netlify Function `sync.js` triggert GitHub Actions Workflow
3. Workflow führt `sync-notion.js` aus
4. Skript holt alle Daten aus Notion (inkl. verschachtelte Blöcke)
5. Screenshots werden heruntergeladen
6. `js/data.js` wird generiert
7. Änderungen werden committed und gepusht
8. Netlify deployed automatisch

### 3. Notion Datenbank

```
┌─────────────────────────────────────────────────────────────────┐
│                    NOTION STRUKTUR                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Sky Touchscreen (Hauptseite)                                   │
│  │                                                               │
│  ├── RCS TOUCH                                                  │
│  │   ├── Spiele                                                 │
│  │   │   ├── Spieltag                                           │
│  │   │   │   └── [Toggle: Screenshots]                          │
│  │   │   ├── Spielstatistik                                     │
│  │   │   │   └── [Toggle: Screenshots]                          │
│  │   │   └── ...                                                │
│  │   │                                                           │
│  │   ├── Tabelle                                                │
│  │   ├── Liga Info                                              │
│  │   └── ...                                                     │
│  │                                                               │
│  ├── Shows                                                      │
│  │   ├── Bundesliga                                             │
│  │   ├── Champions League                                       │
│  │   └── ...                                                     │
│  │                                                               │
│  └── AKI Paint                                                  │
│      └── ...                                                     │
│                                                                  │
│  Jede Seite kann:                                               │
│  - Beschreibung (Text)                                          │
│  - Screenshots (in Toggle-Block)                                │
│  - Unterseiten (beliebig verschachtelt)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4. Netlify Konfiguration

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETLIFY SETUP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  netlify.toml:                                                  │
│  - Publish: / (Root-Verzeichnis)                                │
│  - Functions: netlify/functions                                 │
│  - Node Version: 18                                             │
│  - Headers: Cache-Control für Assets                            │
│                                                                  │
│  Environment Variables:                                          │
│  - NOTION_TOKEN (für lokale Entwicklung)                        │
│  - GITHUB_TOKEN (für Workflow-Trigger)                          │
│                                                                  │
│  Functions:                                                       │
│  - sync.js: Triggert GitHub Actions via REST API                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Datenmodell

### SKY_DATA Struktur (js/data.js)

```javascript
const SKY_DATA = {
  title: "Sky Touchscreen",
  mainMenu: [
    {
      id: "unique-id",
      title: "Kategorie Name",
      description: "Beschreibung...",
      screenshots: [
        "images/screenshots/kategorie/bild-1.png",
        "images/screenshots/kategorie/bild-2.png"
      ],
      children: [
        {
          id: "child-id",
          title: "Unterkategorie",
          description: "...",
          screenshots: [...],
          children: [...]  // Bis zu 4 Ebenen tief
        }
      ]
    }
  ]
};
```

### Screenshot-Mapping (images/screenshot-mapping.json)

```json
{
  "kategorie/unterkategorie": [
    "images/screenshots/kategorie/unterkategorie/image-1.png",
    "images/screenshots/kategorie/unterkategorie/image-2.png"
  ]
}
```

## Sicherheit

- **Admin-Zugang:** Passwort-Hash in admin.html (Basic Protection)
- **GitHub Token:** Gespeichert in GitHub Secrets (nicht im Code)
- **Notion Token:** Gespeichert in .env (gitignored)
- **CORS:** Netlify Functions handlen Cross-Origin Requests

## Entwicklung

### Lokale Entwicklung

```bash
# Server starten
npm run dev

# Sync manuell ausführen
cd mcp-notion-server
node sync-notion.js
```

### Neue Funktion hinzufügen

1. In Notion: Seite/Unterseite erstellen
2. Screenshots als Toggle-Block hinzufügen
3. Sync ausführen
4. Änderungen werden automatisch übernommen

### Debugging

```bash
# Notion-Struktur erkunden
cd mcp-notion-server
node explore-notion.js

# Datenbank prüfen
node utils/check-db.js
```
