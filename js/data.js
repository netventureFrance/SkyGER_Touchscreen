/**
 * Sky Touchscreen - Datenstruktur
 * Synchronisiert mit Notion Workspace
 */

const SKY_DATA = {
    // Root screenshot for the main node
    rootScreenshots: [
        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/image-1.png', name: 'Startseite' }
    ],

    // Hauptmenü - Struktur aus Notion
    mainMenu: [
        {
            id: 'spiele',
            label: 'Spiele',
            icon: 'calendar',
            description: 'Spielübersicht, Statistiken und Live-Daten',
            children: [
                {
                    id: 'spiele-uebersicht',
                    label: 'Spiele',
                    icon: 'calendar',
                    description: 'Titel: Spiele - 14. Spieltag\n\n1-3 Spieltage kann man auswählen. Einzelne Teams kann man auswählen.\n\nButton 1: Von jedem Team kann man auf ein Club Profil gehen\nButton 2: Vereinsstatistik - scrollen\nButton 3: Spiel Übersicht von dem jeweiligen Verein\n\nStartseite Übersicht: Torschützen und die Minuten, Spielstatistik, Aufstellung und Analyse',
                    screenshots: [
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spiele/image-1.png', name: 'Spieltag Übersicht' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spiele/image-2.png', name: 'Spieltag Details' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spiele/image-3.png', name: 'Spieltag Ergebnisse' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spiele/image-4.png', name: 'Team Spielplan' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spiele/image-5.png', name: 'Team Ergebnisse' }
                    ]
                },
                {
                    id: 'spielstatistik',
                    label: 'Spielstatistik',
                    icon: 'bar-chart',
                    description: 'Übersicht oben ist dem Spiel Paar Verein 1, Spielstand, Verein 2\n\nStatistiken als Vergleich zwischen den Vereinen. Rechts und links sind jeweils Buttons um weitere Aktionen auf der Seite zu wechseln.\n\n• Saisonstatistik\n• Aktuelle Spielstatistik der beiden Mannschaften\n• Spielerstatistik - man kann bei jeden Spieler der einzelnen Mannschaften von der Partie miteinander vergleichen',
                    screenshots: [
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-1.png', name: 'Vereins Statistik' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-2.png', name: 'Verein Vergleich' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-3.png', name: 'Statistiken Vergleich' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-4.png', name: 'Saisonstatistiken' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-5.png', name: 'Saisonvergleich' },
                        { url: 'images/screenshots/interaktive-mindmap/sky-sport-design-bundesliga/spiele/spielstatistik/image-6.png', name: 'Spieler Statistiken' }
                    ]
                },
                {
                    id: 'aufstellung',
                    label: 'Aufstellung',
                    icon: 'layout',
                    description: 'Übersicht der Aufstellung, eine Grafik mit einem Spielfeld mit 22 Spielern.\n\n• Alle Spieler sind manuell verschiebbar\n• Reset-Button für die Positionen\n• Mit jeden Spieler kann man mit einem Auswechselspieler austauschen\n• Highlight Button für alle Spieler\n• Laufweg einzeichnen von Spielern\n• Spieler Statistik und Saisonstatistiken\n• Spielervergleich zwischen Mannschaften\n• Frei bewegbarer Fußball\n• Von 22er auf 11er Aufstellung switchen'
                },
                {
                    id: 'analyse-spiele',
                    label: 'Analyse',
                    icon: 'pie-chart',
                    description: 'Ballbesitz (komplette Spielzeit, 1. Halbzeit, 2. Halbzeit)\n\nDurchschnittliche Positionen / Real Taktiken - Aufstellungen vergleichen\n\nTouchmap - Ballposition Berührungen animiert\n\nPassmap - Angekommene, Fehlpässe, Torschussvorlagen\n\nAngriffszonen - zwischen Teams wechseln\n\nShotplot - Tor, Vorbei, Paraden, Abgeblockt\n\nTackle Map - Tacklings Statistik\n\nHeatmap - Verein oder einzelne Spieler'
                }
            ]
        },
        {
            id: 'tabelle',
            label: 'Tabelle',
            icon: 'list',
            description: 'Übersicht der aktuellen Tabelle, man kann hoch und runter scrollen.\n\nSortieren nach den einzelnen Infospalten: SP, S, U, N, T, GT, TD, PKT - dies ändert sich auch sofort live.\n\nÜber die Team Logos kann man auf drei verschiedene Sub-Details gehen:\n1. Clubprofil\n2. Vereinstatistik\n3. Spiele (Fahrplan)'
        },
        {
            id: 'liga-info',
            label: 'Liga Information',
            icon: 'info',
            description: 'Liga-Informationen, Top Teams und Top Spieler',
            children: [
                {
                    id: 'top-teams',
                    label: 'Top Teams',
                    icon: 'award',
                    description: 'Geschossene Tore, Schussversuche, Schüsse, Pässe, Karten, Tackles, Flanken\n\nJede Spalte kann sortiert werden. Über Logo klicken: Clubprofile, Statistik, Fahrplan'
                },
                {
                    id: 'top-spieler',
                    label: 'Top Spieler',
                    icon: 'user',
                    description: 'Tore, Torversuche, Chances Created, Passing, Karten, Tackles, Zweikampf, Flanken, Freistoss, Gehaltene Bälle, Spielzeit\n\nFür alle Kategorien: 50 Zeilen. Über das Logo kommt man auf die Team Information.'
                },
                {
                    id: 'teams',
                    label: 'Teams',
                    icon: 'users',
                    description: 'Club Profile, Statistik, Spiele, Mannschaft (Kader)'
                }
            ]
        },
        {
            id: 'telestrator',
            label: 'Telestrator',
            icon: 'edit-3',
            description: 'Zeichenwerkzeug (System funktioniert nicht mehr)'
        },
        {
            id: 'analyse',
            label: 'Analyse',
            icon: 'pie-chart',
            description: 'Vor und zurück spulen des Clips. Clipauswahl von verschiedenen Clips mit Verbindung zur Libero.\n\nFarbpalette und vordefinierte Libero Elemente.',
            children: [
                { id: 'pfeile', label: 'Pfeile', icon: 'arrow-right', description: 'Pfeile zeichnen' },
                { id: 'spielermarker', label: 'Spielermarker', icon: 'user', description: 'Spieler markieren' },
                { id: 'linie', label: 'Linie', icon: 'minus', description: 'Linien zeichnen' },
                { id: 'spot', label: 'Spot', icon: 'target', description: 'Spots setzen' },
                { id: 'lupe', label: 'Lupe', icon: 'search', description: 'Vergrößerung' },
                { id: 'rueckgaengig', label: 'Rückgängig', icon: 'rotate-ccw', description: 'Alles rückgängig machen einzeln' },
                { id: 'loeschen', label: 'Löschen', icon: 'trash', description: 'Alles löschen' },
                { id: 'fullscreen', label: 'Fullscreen', icon: 'maximize', description: 'Vollbildmodus' }
            ]
        },
        {
            id: 'multiview',
            label: 'Multiview',
            icon: 'grid',
            description: 'Full HD einzelne 4 verschiedene Live Input Fenster.\n\nMan kann die jeweils groß animieren und einzeilige Bauchbinde.'
        },
        {
            id: 'live',
            label: 'Live',
            icon: 'video',
            description: 'Fullscreen Live Input für EVS, Schalten'
        },
        {
            id: 'headlines',
            label: 'Headlines',
            icon: 'type',
            description: 'Info Grafiken mit Team Logo editierbar und Free Text editierbar mit mehreren Seiten.\n\nVerschiedene Layouts möglich.'
        },
        {
            id: 'twitter',
            label: 'Twitter',
            icon: 'twitter',
            description: 'Twitter Tweet kann man groß und klein animiert.\n\nWird über die Web Applikation gesteuert.'
        },
        {
            id: 'sidebar',
            label: 'Sidebar',
            icon: 'sidebar',
            description: 'Einstellungen und Konfiguration',
            children: [
                {
                    id: 'settings',
                    label: 'Settings',
                    icon: 'settings',
                    description: 'Systemeinstellungen',
                    children: [
                        {
                            id: 'preferences',
                            label: 'Preferences',
                            icon: 'sliders',
                            description: 'Benutzereinstellungen',
                            children: [
                                { id: 'formation', label: 'Formation', icon: 'layout', description: 'Formation Type: Automatic, Predicted, Official\nShow Score: Ein/Ausschalten der Ergebnisse' },
                                { id: 'standings', label: 'Standings', icon: 'list', description: 'Start at Top/Bottom - Beim Aufruf der Tabelle die 1. oder 2. Seite aufrufen' },
                                { id: 'match-up', label: 'Match up', icon: 'calendar', description: 'By week/By day - Aufteilung der Spieltage\nShow Score - Ergebnisse ein/ausschalten' },
                                { id: 'debug', label: 'Debug', icon: 'terminal', description: 'Debug Information oben rechts' },
                                { id: 'colorbar', label: 'Colorbar', icon: 'palette', description: 'Colorbar wird im Fullscreen eingeblendet' },
                                { id: 'watermark', label: 'Watermark', icon: 'droplet', description: 'Watermark ein/ausschalten' }
                            ]
                        },
                        {
                            id: 'shows',
                            label: 'Shows',
                            icon: 'tv',
                            description: 'Show auswählen: Bundesliga, Championsleague, Premier League, Austrian Bundesliga, Generic'
                        },
                        {
                            id: 'modes',
                            label: 'Modes',
                            icon: 'toggle-left',
                            description: 'Normal, Bookmark, Hide Nav (IPAD)'
                        }
                    ]
                },
                {
                    id: 'datensaetze',
                    label: 'Datensätze',
                    icon: 'database',
                    description: 'Opta: Austrian Bundesliga, Champions League, Premier League, Bundesliga, UEFA Europa League, DFB Pokal, 2. Bundesliga\n\nSport Tec: 1. & 2. Bundesliga'
                },
                {
                    id: 'bookmarks',
                    label: 'Book Marks',
                    icon: 'bookmark',
                    description: 'ADD / EDIT - Auf die Seite navigieren und auf Bookmark Add klicken'
                }
            ]
        }
    ]
};

// Feather Icons SVG Paths
const ICONS = {
    'circle': '<circle cx="12" cy="12" r="10"/>',
    'grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    'video': '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    'type': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    'twitter': '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>',
    'edit-3': '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    'layout': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'award': '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    'sidebar': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
    'bookmark': '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    'sliders': '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    'tv': '<rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>',
    'toggle-left': '<rect x="1" y="5" width="22" height="14" rx="7" ry="7"/><circle cx="8" cy="12" r="3"/>',
    'terminal': '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
    'palette': '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>',
    'droplet': '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
    'rotate-ccw': '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    'maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>'
};
