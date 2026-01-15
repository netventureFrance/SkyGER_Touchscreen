# MCP Notion Server

Model Context Protocol (MCP) Server für Notion API Integration mit Claude Code.

## Installation

```bash
cd mcp-notion-server
npm install
```

## Konfiguration

### 1. Notion Integration Token

Du brauchst einen Notion Integration Token:

1. Gehe zu [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Erstelle eine neue Integration
3. Kopiere den Token (`secret_...`)

### 2. Claude Code Konfiguration

Füge den Server zu deiner Claude Code Konfiguration hinzu:

**Datei:** `~/.claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["/Users/yan/Documents/GitHub/SkyGER_Touchscreen/mcp-notion-server/src/index.js"],
      "env": {
        "NOTION_TOKEN": "secret_dein_token_hier"
      }
    }
  }
}
```

### 3. Notion Seite verbinden

Die Seiten, auf die du zugreifen willst, müssen mit der Integration verbunden sein:

1. Öffne die Seite in Notion
2. Klicke "..." → "Connections" → Deine Integration hinzufügen

## Verfügbare Tools

| Tool | Beschreibung |
|------|-------------|
| `notion_get_page` | Ruft Seiten-Eigenschaften ab |
| `notion_get_page_content` | Ruft kompletten Seiteninhalt ab |
| `notion_search` | Durchsucht Notion |
| `notion_get_children` | Listet Unterseiten auf |
| `notion_query_database` | Fragt Datenbanken ab |
| `notion_create_page` | Erstellt neue Seiten |
| `notion_append_blocks` | Fügt Inhalt hinzu |

## Verwendung

Nach der Konfiguration kannst du in Claude Code:

```
Lies die Notion-Seite 2e9f99a2be2281379653c6ba4b29400f
```

```
Suche in Notion nach "Sky Touchscreen"
```

```
Liste alle Unterseiten von 2e9f99a2be2281379653c6ba4b29400f
```

## Page IDs

- **Projekt:** `2b9f99a2be228098a506e3621bf4d538`
- **Dokumentation:** `2caf99a2be228014a094ec591bad7089`
- **Arbeitsbereich (Yan):** `2e9f99a2be2281379653c6ba4b29400f`

## Testen

```bash
# Token setzen
export NOTION_TOKEN="secret_..."

# Server starten (für Debugging)
npm start
```

## Troubleshooting

- **"Could not find block"** - Seite nicht mit Integration verbunden
- **"Invalid token"** - Token falsch oder abgelaufen
- **"Insufficient permissions"** - Integration hat keine Rechte für diese Seite
