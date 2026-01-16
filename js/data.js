/**
 * Sky Touchscreen - Datenstruktur
 * Komplette System-Hierarchie basierend auf der RCS Touch Dokumentation
 */

const SKY_DATA = {
    // Hauptmenü - Reihenfolge wie in Notion (Sky Sport Design Bundesliga)
    // Root screenshot for the main node
    rootScreenshots: [
        { url: 'images/screenshots/startseite/overview.png', name: 'Startseite' }
    ],
    mainMenu: [
        {
            id: 'spiele',
            label: 'Spiele',
            icon: 'calendar',
            description: 'Spielübersicht, Statistiken und Live-Daten',
            screenshots: [
                { url: 'images/screenshots/spiele/spieltag-1.png', name: 'Spieltag Übersicht' },
                { url: 'images/screenshots/spiele/spieltag-2.png', name: 'Spieltag Details' },
                { url: 'images/screenshots/spiele/spieltag-3.png', name: 'Spieltag Ergebnisse' },
                { url: 'images/screenshots/spiele/team-spielplan.png', name: 'Team Spielplan' },
                { url: 'images/screenshots/spiele/team-ergebnisse.png', name: 'Team Ergebnisse' }
            ],
            children: [
                {
                    id: 'spielstatistik',
                    label: 'Spielstatistik',
                    icon: 'bar-chart',
                    description: 'Team-Vergleich und Spielervergleiche',
                    children: [
                        { id: 'team-vergleich', label: 'Team-Vergleich', icon: 'users', description: 'Direkter Vergleich zweier Teams' },
                        { id: 'spieler-vergleich', label: 'Spielervergleiche', icon: 'user', description: 'Statistik-Vergleich einzelner Spieler' }
                    ]
                },
                {
                    id: 'aufstellung',
                    label: 'Aufstellung',
                    icon: 'layout',
                    description: '22er/11er Formation, verschiebbar, mit Laufwegen',
                    children: [
                        { id: 'formation-22', label: '22er Aufstellung', icon: 'users', description: 'Beide Teams auf dem Feld' },
                        { id: 'formation-11', label: '11er Aufstellung', icon: 'user', description: 'Einzelnes Team' },
                        { id: 'laufwege', label: 'Laufwege', icon: 'activity', description: 'Animierte Spielerbewegungen' },
                        { id: 'highlights', label: 'Highlights', icon: 'star', description: 'Besondere Spielaktionen' }
                    ]
                },
                { id: 'spielanalyse', label: 'Spielanalyse', icon: 'search', description: 'Detaillierte Spielanalyse' },
                { id: 'club-profile', label: 'Club Profile', icon: 'shield', description: 'Vereinsinformationen und Geschichte' },
                { id: 'vereinsstatistik', label: 'Vereinsstatistik', icon: 'trending-up', description: 'Historische Statistiken des Vereins' }
            ]
        },
        {
            id: 'tabelle',
            label: 'Tabelle',
            icon: 'list',
            description: 'Liga-Tabelle, sortierbar nach verschiedenen Kriterien',
            children: [
                { id: 'tabelle-sp', label: 'Nach Spielen', icon: 'hash', description: 'Sortiert nach Anzahl Spiele' },
                { id: 'tabelle-s', label: 'Nach Siegen', icon: 'award', description: 'Sortiert nach Siegen' },
                { id: 'tabelle-u', label: 'Nach Unentschieden', icon: 'minus', description: 'Sortiert nach Unentschieden' },
                { id: 'tabelle-n', label: 'Nach Niederlagen', icon: 'x', description: 'Sortiert nach Niederlagen' },
                { id: 'tabelle-t', label: 'Nach Toren', icon: 'target', description: 'Sortiert nach geschossenen Toren' },
                { id: 'tabelle-gt', label: 'Nach Gegentoren', icon: 'shield-off', description: 'Sortiert nach Gegentoren' },
                { id: 'tabelle-td', label: 'Nach Tordifferenz', icon: 'plus-minus', description: 'Sortiert nach Tordifferenz' },
                { id: 'tabelle-pkt', label: 'Nach Punkten', icon: 'star', description: 'Sortiert nach Punkten (Standard)' }
            ]
        },
        {
            id: 'liga-info',
            label: 'Liga Information',
            icon: 'info',
            description: 'Liga-Informationen, Top Teams und Top Spieler',
            screenshots: [
                { url: 'images/screenshots/statistik/vereinsstatistik.png', name: 'Vereinsstatistik' }
            ],
            children: [
                {
                    id: 'top-teams',
                    label: 'Top Teams',
                    icon: 'award',
                    description: 'Beste Teams in verschiedenen Kategorien',
                    children: [
                        { id: 'top-teams-tore', label: 'Tore', icon: 'target', description: 'Teams mit den meisten Toren' },
                        { id: 'top-teams-schuesse', label: 'Schüsse', icon: 'crosshair', description: 'Teams mit den meisten Schüssen' },
                        { id: 'top-teams-paesse', label: 'Pässe', icon: 'shuffle', description: 'Teams mit den meisten Pässen' },
                        { id: 'top-teams-karten', label: 'Karten', icon: 'square', description: 'Teams mit den meisten Karten' },
                        { id: 'top-teams-tackles', label: 'Tackles', icon: 'shield', description: 'Teams mit den meisten Tackles' },
                        { id: 'top-teams-flanken', label: 'Flanken', icon: 'corner-up-right', description: 'Teams mit den meisten Flanken' }
                    ]
                },
                {
                    id: 'top-spieler',
                    label: 'Top Spieler',
                    icon: 'user',
                    description: 'Beste Spieler in verschiedenen Kategorien',
                    children: [
                        { id: 'top-spieler-tore', label: 'Torschützen', icon: 'target', description: 'Spieler mit den meisten Toren' },
                        { id: 'top-spieler-assists', label: 'Assists', icon: 'git-branch', description: 'Spieler mit den meisten Vorlagen' },
                        { id: 'top-spieler-paesse', label: 'Pässe', icon: 'shuffle', description: 'Spieler mit den meisten Pässen' },
                        { id: 'top-spieler-spielzeit', label: 'Spielzeit', icon: 'clock', description: 'Spieler mit der meisten Spielzeit' },
                        { id: 'top-spieler-zweikampf', label: 'Zweikampf', icon: 'zap', description: 'Spieler mit bester Zweikampfquote' }
                    ]
                },
                {
                    id: 'teams',
                    label: 'Teams',
                    icon: 'users',
                    description: 'Alle Teams der Liga',
                    children: [
                        { id: 'team-profile', label: 'Club Profile', icon: 'shield', description: 'Vereinsinformationen' },
                        { id: 'team-statistik', label: 'Statistik', icon: 'bar-chart', description: 'Team-Statistiken' },
                        { id: 'team-kader', label: 'Kader/Mannschaft', icon: 'users', description: 'Spielerübersicht' }
                    ]
                }
            ]
        },
        {
            id: 'telestrator',
            label: 'Telestrator',
            icon: 'edit-3',
            description: 'Zeichenwerkzeug für Live-Analyse'
        },
        {
            id: 'analyse',
            label: 'Analyse',
            icon: 'pie-chart',
            description: 'Analyse-Tools für detaillierte Spielauswertung',
            screenshots: [
                { url: 'images/screenshots/statistik/spielstatistik-1.png', name: 'Spielstatistik' },
                { url: 'images/screenshots/statistik/spielstatistik-2.png', name: 'Detaillierte Statistik' },
                { url: 'images/screenshots/statistik/saisonstatistik-1.png', name: 'Saisonstatistik' },
                { url: 'images/screenshots/statistik/saisonstatistik-2.png', name: 'Saisonvergleich' },
                { url: 'images/screenshots/statistik/torwart-vergleich.png', name: 'Torwart Vergleich' }
            ],
            children: [
                {
                    id: 'ballbesitz',
                    label: 'Ballbesitz',
                    icon: 'percent',
                    description: 'Ballbesitz-Statistik',
                    children: [
                        { id: 'ballbesitz-gesamt', label: 'Gesamt', icon: 'circle', description: 'Ballbesitz über das gesamte Spiel' },
                        { id: 'ballbesitz-1hz', label: '1. Halbzeit', icon: 'chevron-left', description: 'Ballbesitz erste Halbzeit' },
                        { id: 'ballbesitz-2hz', label: '2. Halbzeit', icon: 'chevron-right', description: 'Ballbesitz zweite Halbzeit' }
                    ]
                },
                { id: 'positionen', label: 'Durchschn. Positionen', icon: 'map-pin', description: 'Durchschnittliche Spielerpositionen / Real Taktiken' },
                {
                    id: 'touchmap',
                    label: 'Touchmap',
                    icon: 'hand',
                    description: 'Ballberührungen, chronologisch animiert'
                },
                {
                    id: 'passmap',
                    label: 'Passmap',
                    icon: 'git-branch',
                    description: 'Passübersicht',
                    children: [
                        { id: 'passmap-angekommene', label: 'Angekommene', icon: 'check', description: 'Erfolgreiche Pässe' },
                        { id: 'passmap-fehlpaesse', label: 'Fehlpässe', icon: 'x', description: 'Nicht angekommene Pässe' },
                        { id: 'passmap-vorlagen', label: 'Torschussvorlagen', icon: 'target', description: 'Pässe die zu Torschüssen führten' }
                    ]
                },
                { id: 'angriffszonen', label: 'Angriffszonen', icon: 'crosshair', description: 'Attacking zones zwischen Teams' },
                {
                    id: 'shotplot',
                    label: 'Shotplot',
                    icon: 'target',
                    description: 'Torschuss-Übersicht',
                    children: [
                        { id: 'shotplot-tor', label: 'Tor', icon: 'check-circle', description: 'Erzielte Tore' },
                        { id: 'shotplot-vorbei', label: 'Vorbei', icon: 'x-circle', description: 'Schüsse am Tor vorbei' },
                        { id: 'shotplot-paraden', label: 'Paraden', icon: 'shield', description: 'Gehaltene Schüsse' },
                        { id: 'shotplot-geblockt', label: 'Abgeblockt', icon: 'slash', description: 'Geblockte Schüsse' }
                    ]
                },
                {
                    id: 'heatmap',
                    label: 'Heatmap',
                    icon: 'thermometer',
                    description: 'Aktivitätszonen auf dem Spielfeld',
                    children: [
                        { id: 'heatmap-spieler', label: 'Spieler', icon: 'user', description: 'Heatmap einzelner Spieler' },
                        { id: 'heatmap-team', label: 'Team', icon: 'users', description: 'Heatmap des gesamten Teams' },
                        { id: 'heatmap-1hz', label: '1. Halbzeit', icon: 'chevron-left', description: 'Heatmap erste Halbzeit' },
                        { id: 'heatmap-2hz', label: '2. Halbzeit', icon: 'chevron-right', description: 'Heatmap zweite Halbzeit' },
                        { id: 'heatmap-gesamt', label: 'Gesamt', icon: 'circle', description: 'Heatmap gesamtes Spiel' }
                    ]
                },
                { id: 'tacklemap', label: 'Tackle Map', icon: 'shield', description: 'Übersicht aller Tackles' }
            ]
        },
        {
            id: 'multiview',
            label: 'Multiview',
            icon: 'grid',
            description: '4 Live-Input Fenster, Full HD, einzeln vergrößerbar'
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
            description: 'Info-Grafiken mit Team Logo, editierbar, mehrere Layouts'
        },
        {
            id: 'twitter',
            label: 'Twitter',
            icon: 'twitter',
            description: 'Tweet-Anzeige groß/klein animiert, Web-App gesteuert'
        },
        {
            id: 'sidebar',
            label: 'Sidebar',
            icon: 'sidebar',
            description: 'Seitenleiste mit Einstellungen und Bookmarks',
            children: [
                { id: 'sidebar-settings', label: 'Einstellungen', icon: 'settings', description: 'Konfigurationsoptionen' },
                { id: 'sidebar-bookmarks', label: 'Bookmarks', icon: 'bookmark', description: 'Gespeicherte Ansichten' }
            ]
        }
    ],

    // Weitere Shows
    shows: [
        { id: 'bundesliga', label: 'Bundesliga', icon: 'flag', active: true },
        { id: 'bundesliga-2', label: '2. Bundesliga', icon: 'flag' },
        { id: 'premier-league', label: 'Premier League', icon: 'flag' },
        { id: 'champions-league', label: 'Champions League', icon: 'star', hasKoPhase: true },
        { id: 'europa-league', label: 'Europa League', icon: 'star' },
        { id: 'conference-league', label: 'Conference League', icon: 'star' },
        { id: 'austrian-bundesliga', label: 'Austrian Bundesliga', icon: 'flag' },
        { id: 'dfb-pokal', label: 'DFB Pokal', icon: 'trophy' },
        { id: 'frauen-bundesliga', label: 'Frauen Bundesliga', icon: 'flag', design: 'generic' },
        { id: 'matchplan', label: 'Matchplan', icon: 'calendar' }
    ],

    // Datensätze
    dataSources: [
        {
            id: 'opta',
            label: 'Opta',
            icon: 'database',
            competitions: ['Champions League', 'Premier League', 'Europa League', 'Conference League', 'DFB Pokal', 'EM']
        },
        {
            id: 'sporttec',
            label: 'Sport Tec',
            icon: 'database',
            competitions: ['1. Bundesliga', '2. Bundesliga']
        }
    ],

    // AKI Paint
    akiPaint: {
        id: 'aki-paint',
        label: 'AKI Paint',
        icon: 'edit-2',
        description: 'Marker Tools für EVS-Integration',
        sports: [
            { id: 'f1', label: 'Formel 1', icon: 'flag' },
            { id: 'motogp', label: 'MotoGP', icon: 'flag' },
            { id: 'tennis', label: 'Tennis', icon: 'circle' },
            { id: 'eishockey', label: 'Eishockey', icon: 'circle' }
        ],
        features: [
            'Direkte EVS-Verbindung',
            'Clips schneiden & abspielen',
            'Farbpalette',
            'Vordefinierte Libero Elemente',
            'Pfeile, Spielermarker, Linien, Spots, Lupe',
            'Undo einzeln / Alles löschen',
            'Bildschirmschoner/Logo',
            'Kameraperspektiven (Libero-programmiert)'
        ]
    },

    // RCS Webapplikation
    webApp: {
        home: {
            settings: ['Show Info', 'Date/Time', 'Display', 'Rights', 'Navigation', 'Sponsor'],
            content: ['Headlines', 'Multiview', 'Bookmarks', 'Social Media']
        },
        sports: {
            competitions: ['Bundesliga', 'Soccer', 'Teams', 'Venues', 'Labels']
        }
    },

    // Sidebar Konfiguration
    sidebar: {
        settings: {
            preferences: ['Formation', 'Standings', 'Match up'],
            shows: ['Bundesliga', 'CL', 'PL', 'etc.'],
            modes: ['Normal', 'Bookmark', 'Hide Nav'],
            debug: ['Debug', 'Colorbar', 'Watermark']
        },
        bookmarks: {
            actions: ['ADD', 'EDIT']
        }
    }
};

// Icon SVG Paths (Feather Icons Style)
const ICONS = {
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    'grid': '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    'video': '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    'type': '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    'twitter': '<path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>',
    'edit-3': '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    'layout': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    'award': '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'crosshair': '<circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>',
    'shuffle': '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
    'percent': '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    'hand': '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    'git-branch': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    'thermometer': '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    'check': '<polyline points="20 6 9 17 4 12"/>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    'slash': '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
    'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'hash': '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
    'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
    'shield-off': '<path d="M19.69 14a6.9 6.9 0 0 0 .31-2V5l-8-3-3.16 1.18"/><path d="M4.73 4.73L4 5v7c0 6 8 10 8 10a20.29 20.29 0 0 0 5.62-4.38"/><line x1="1" y1="1" x2="23" y2="23"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    'circle': '<circle cx="12" cy="12" r="10"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'corner-up-right': '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
    'trophy': '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    'edit-2': '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    'sidebar': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>',
    'bookmark': '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
};

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SKY_DATA, ICONS };
}
