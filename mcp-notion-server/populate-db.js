#!/usr/bin/env node

/**
 * Füllt die Notion-Datenbank mit den SKY_DATA Elementen
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const vars = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      vars[key.trim()] = valueParts.join('=').trim();
    }
  });
  return vars;
}

const env = loadEnv();
const notion = new Client({ auth: env.NOTION_TOKEN });
const DATABASE_ID = env.NOTION_DATABASE_ID;

// Mapping von IDs zu Notion Page IDs für Parent-Beziehungen
const idMap = new Map();

// Kategorie-Mapping
const kategorieMap = {
  'spiele': 'Spiele',
  'tabelle': 'Tabelle',
  'liga-info': 'Liga Info',
  'analyse': 'Analyse',
  'multiview': 'Multiview',
  'live': 'Live',
  'headlines': 'Headlines',
  'twitter': 'Twitter',
  'telestrator': 'Telestrator',
  'web-app': 'Web App'
};

async function createItem(item, parentId, ebene, kategorie, reihenfolge) {
  const properties = {
    'Name': {
      title: [{ text: { content: item.label } }]
    },
    'Beschreibung': {
      rich_text: [{ text: { content: item.description || '' } }]
    },
    'Symbol': {
      rich_text: [{ text: { content: item.icon || '' } }]
    },
    'Ebene': {
      number: ebene
    },
    'Reihenfolge': {
      number: reihenfolge
    },
    'Status': {
      select: { name: 'Entwurf' }
    }
  };

  // Kategorie nur für Hauptelemente und deren Kinder
  if (kategorie) {
    properties['Kategorie'] = {
      select: { name: kategorie }
    };
  }

  // Parent-Beziehung hinzufügen wenn vorhanden
  if (parentId) {
    properties['Übergeordnet'] = {
      relation: [{ id: parentId }]
    };
  }

  try {
    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties
    });

    idMap.set(item.id, response.id);
    console.log(`✓ ${' '.repeat((ebene - 1) * 2)}${item.label}`);
    return response.id;
  } catch (error) {
    console.error(`✗ ${item.label}: ${error.message}`);
    return null;
  }
}

async function processChildren(children, parentId, ebene, kategorie) {
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childId = await createItem(child, parentId, ebene, kategorie, i + 1);

    if (childId && child.children && child.children.length > 0) {
      await processChildren(child.children, childId, ebene + 1, kategorie);
    }
  }
}

async function populateDatabase() {
  console.log('Fülle Notion-Datenbank mit SkyGER Touchscreen Daten...\n');

  // Hauptmenü Elemente
  const mainMenu = [
    {
      id: 'spiele',
      label: 'Spiele',
      icon: 'calendar',
      description: 'Spielübersicht, Statistiken und Live-Daten',
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
      label: 'Liga Info',
      icon: 'info',
      description: 'Liga-Informationen, Top Teams und Top Spieler',
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
      id: 'analyse',
      label: 'Analyse',
      icon: 'pie-chart',
      description: 'Analyse-Tools für detaillierte Spielauswertung',
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
        { id: 'touchmap', label: 'Touchmap', icon: 'hand', description: 'Ballberührungen, chronologisch animiert' },
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
      id: 'telestrator',
      label: 'Telestrator',
      icon: 'edit-3',
      description: 'Zeichenwerkzeug (nicht mehr aktiv)'
    }
  ];

  // Hauptmenü-Elemente erstellen
  console.log('📁 Hauptmenü:\n');

  for (let i = 0; i < mainMenu.length; i++) {
    const item = mainMenu[i];
    const kategorie = kategorieMap[item.id] || item.label;
    const itemId = await createItem(item, null, 1, kategorie, i + 1);

    if (itemId && item.children && item.children.length > 0) {
      await processChildren(item.children, itemId, 2, kategorie);
    }
  }

  // Shows hinzufügen
  console.log('\n📺 Shows:\n');

  const shows = [
    { id: 'bundesliga', label: 'Bundesliga', icon: 'flag', description: 'Deutsche Bundesliga - Hauptwettbewerb' },
    { id: 'bundesliga-2', label: '2. Bundesliga', icon: 'flag', description: 'Deutsche 2. Bundesliga' },
    { id: 'premier-league', label: 'Premier League', icon: 'flag', description: 'Englische Premier League' },
    { id: 'champions-league', label: 'Champions League', icon: 'star', description: 'UEFA Champions League mit KO-Phase' },
    { id: 'europa-league', label: 'Europa League', icon: 'star', description: 'UEFA Europa League' },
    { id: 'conference-league', label: 'Conference League', icon: 'star', description: 'UEFA Conference League' },
    { id: 'austrian-bundesliga', label: 'Austrian Bundesliga', icon: 'flag', description: 'Österreichische Bundesliga' },
    { id: 'dfb-pokal', label: 'DFB Pokal', icon: 'trophy', description: 'Deutscher Pokalwettbewerb' },
    { id: 'frauen-bundesliga', label: 'Frauen Bundesliga', icon: 'flag', description: 'Deutsche Frauen-Bundesliga (Generic Design)' },
    { id: 'matchplan', label: 'Matchplan', icon: 'calendar', description: 'Spielplan-Übersicht' }
  ];

  // Erst Shows-Hauptelement erstellen
  const showsParent = await createItem(
    { id: 'shows', label: 'Shows', icon: 'tv', description: 'Verfügbare Wettbewerbe und Shows' },
    null, 1, null, 10
  );

  for (let i = 0; i < shows.length; i++) {
    await createItem(shows[i], showsParent, 2, null, i + 1);
  }

  // Datenquellen
  console.log('\n📊 Datenquellen:\n');

  const dataSourcesParent = await createItem(
    { id: 'datenquellen', label: 'Datenquellen', icon: 'database', description: 'Verfügbare Datenanbieter' },
    null, 1, null, 11
  );

  await createItem(
    { id: 'opta', label: 'Opta', icon: 'database', description: 'Champions League, Premier League, Europa League, Conference League, DFB Pokal, EM' },
    dataSourcesParent, 2, null, 1
  );

  await createItem(
    { id: 'sporttec', label: 'Sport Tec', icon: 'database', description: '1. Bundesliga, 2. Bundesliga' },
    dataSourcesParent, 2, null, 2
  );

  // AKI Paint
  console.log('\n🎨 AKI Paint:\n');

  const akiPaintParent = await createItem(
    { id: 'aki-paint', label: 'AKI Paint', icon: 'edit-2', description: 'Marker Tools für EVS-Integration' },
    null, 1, null, 12
  );

  const akiSports = [
    { id: 'f1', label: 'Formel 1', icon: 'flag', description: 'F1 Telestrator' },
    { id: 'motogp', label: 'MotoGP', icon: 'flag', description: 'MotoGP Telestrator' },
    { id: 'tennis', label: 'Tennis', icon: 'circle', description: 'Tennis Telestrator' },
    { id: 'eishockey', label: 'Eishockey', icon: 'circle', description: 'Eishockey Telestrator' }
  ];

  for (let i = 0; i < akiSports.length; i++) {
    await createItem(akiSports[i], akiPaintParent, 2, null, i + 1);
  }

  console.log('\n✅ Datenbank wurde erfolgreich gefüllt!');
  console.log(`\nInsgesamt ${idMap.size} Elemente erstellt.`);
}

populateDatabase().catch(console.error);
