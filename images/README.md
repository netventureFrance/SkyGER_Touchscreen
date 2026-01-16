# Screenshots für SkyGER Touchscreen

## Ordnerstruktur

```
images/screenshots/
├── spiele/          # Spiele-Menü Screenshots
├── tabelle/         # Tabellen-Ansichten
├── liga-info/       # Liga Informationen
├── analyse/         # Analyse-Tools (Heatmap, Passmap, etc.)
├── multiview/       # Multiview Screenshots
├── live/            # Live-Ansichten
├── headlines/       # Headlines/Grafiken
├── twitter/         # Twitter-Integration
├── telestrator/     # Telestrator-Tool
├── shows/           # Verschiedene Shows
├── aki-paint/       # AKI Paint Tool
└── web-app/         # Web-Applikation
```

## Bilder hinzufügen

### 1. Bild in den richtigen Ordner legen

```bash
# Beispiel: Screenshot für Heatmap
cp mein-screenshot.png images/screenshots/analyse/heatmap.png
```

### 2. In Notion verlinken

1. Öffne die Notion-Datenbank
2. Finde das entsprechende Element (z.B. "Heatmap")
3. Im Feld **Screenshot**:
   - Klicke auf "Link einbetten"
   - Gib den Pfad ein: `/images/screenshots/analyse/heatmap.png`

### Namenskonvention

- Kleinbuchstaben
- Bindestriche statt Leerzeichen
- Beschreibender Name

**Beispiele:**
- `spiele-overview.png`
- `heatmap-team.png`
- `tabelle-nach-punkten.png`
- `passmap-angekommene.png`

## Unterstützte Formate

- PNG (empfohlen für Screenshots)
- JPG (für Fotos)
- GIF (für Animationen)
- WebP (für optimierte Größe)

## Git Workflow

```bash
# Bilder hinzufügen
git add images/screenshots/

# Commit
git commit -m "Add screenshots for [Bereich]"

# Push
git push
```

Die Bilder sind dann sofort auf der Website verfügbar.
