import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIKI_INDEX_URL =
  'https://pixelmonmod.com/w/index.php?title=Available_Pok%C3%A9mon&action=raw';
const WIKI_RAW_BASE_URL = 'https://pixelmonmod.com/w/index.php';
const OUTPUT_PATH = resolve(
  __dirname,
  '..',
  'src',
  'data',
  'pixelmon_pokemon.json'
);
const TYPE_ICONS_OUTPUT_PATH = resolve(
  __dirname,
  '..',
  'src',
  'data',
  'pixelmon_type_effectiveness_icons.json'
);
const CHECKPOINT_EVERY = 50;
const MAX_RETRIES = 5;
const MAX_REDIRECTS = 5;
const REQUEST_DELAY_MS = 1200;
const REQUEST_JITTER_MS = 400;
const RATE_LIMIT_DELAY_MS = 15000;

const REQUEST_HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; proyecto-frontier pixelmon scraper)',
  accept: 'text/plain, text/html, application/json;q=0.9, */*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
};

const TYPE_EFFECTIVENESS_CONFIG = [
  { key: 'bug', label: 'Bug', file: 'BugType.png' },
  { key: 'dark', label: 'Dark', file: 'DarkType.png' },
  { key: 'dragon', label: 'Dragon', file: 'DragonType.png' },
  { key: 'electric', label: 'Electric', file: 'ElectricType.png' },
  { key: 'fairy', label: 'Fairy', file: 'FairyType.png' },
  { key: 'fighting', label: 'Fighting', file: 'FightingType.png' },
  { key: 'fire', label: 'Fire', file: 'FireType.png' },
  { key: 'flying', label: 'Flying', file: 'FlyingType.png' },
  { key: 'ghost', label: 'Ghost', file: 'GhostType.png' },
  { key: 'grass', label: 'Grass', file: 'GrassType.png' },
  { key: 'ground', label: 'Ground', file: 'GroundType.png' },
  { key: 'ice', label: 'Ice', file: 'IceType.png' },
  { key: 'normal', label: 'Normal', file: 'NormalType.png' },
  { key: 'poison', label: 'Poison', file: 'PoisonType.png' },
  { key: 'psychic', label: 'Psychic', file: 'PsychicType.png' },
  { key: 'rock', label: 'Rock', file: 'RockType.png' },
  { key: 'steel', label: 'Steel', file: 'SteelType.png' },
  { key: 'water', label: 'Water', file: 'WaterType.png' },
];

const GENDER_RATIO_MAP = {
  100: '100% male, 0% female',
  87: '87.5% male, 12.5% female',
  75: '75% male, 25% female',
  50: '50% male, 50% female',
  25: '25% male, 75% female',
  12: '12.5% male, 87.5% female',
  0: '0% male, 100% female',
  [-1]: 'Genderless',
};

function decodeHtmlEntities(value) {
  const namedEntities = {
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&mdash;': '—',
  };

  return value
    .replace(
      /&(?:amp|quot|#39|apos|lt|gt|nbsp|mdash);/g,
      (match) => namedEntities[match] || match
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function getRandomIntInclusive(min, max) {
  const normalizedMin = Math.ceil(min);
  const normalizedMax = Math.floor(max);

  return Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) + normalizedMin;
}

async function sleepWithJitter(baseMs, jitterMs = REQUEST_JITTER_MS) {
  const totalDelay = baseMs + getRandomIntInclusive(0, jitterMs);
  await sleep(totalDelay);
  return totalDelay;
}

function extractRedirectTarget(wikitext) {
  const redirectMatch = wikitext.match(/^#redirect\s*\[\[([^\]]+)\]\]/i);

  if (!redirectMatch) {
    return null;
  }

  const rawTarget = redirectMatch[1].trim();
  const redirectTarget = rawTarget.split('|')[0].trim();

  return redirectTarget || null;
}

function toTitleCase(value) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function extractTopLevelTemplates(text) {
  const templates = [];
  let depth = 0;
  let start = -1;

  for (let index = 0; index < text.length - 1; index += 1) {
    const token = text.slice(index, index + 2);

    if (token === '{{') {
      if (depth === 0) {
        start = index;
      }

      depth += 1;
      index += 1;
      continue;
    }

    if (token === '}}' && depth > 0) {
      depth -= 1;

      if (depth === 0 && start >= 0) {
        templates.push(text.slice(start, index + 2));
        start = -1;
      }

      index += 1;
    }
  }

  return templates;
}

function splitTopLevel(value, separator) {
  const parts = [];
  let current = '';
  let templateDepth = 0;
  let linkDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const twoChars = value.slice(index, index + 2);

    if (twoChars === '{{') {
      templateDepth += 1;
      current += twoChars;
      index += 1;
      continue;
    }

    if (twoChars === '}}' && templateDepth > 0) {
      templateDepth -= 1;
      current += twoChars;
      index += 1;
      continue;
    }

    if (twoChars === '[[') {
      linkDepth += 1;
      current += twoChars;
      index += 1;
      continue;
    }

    if (twoChars === ']]' && linkDepth > 0) {
      linkDepth -= 1;
      current += twoChars;
      index += 1;
      continue;
    }

    if (value[index] === separator && templateDepth === 0 && linkDepth === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += value[index];
  }

  parts.push(current);
  return parts;
}

function getTopLevelEqualsIndex(value) {
  let templateDepth = 0;
  let linkDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const twoChars = value.slice(index, index + 2);

    if (twoChars === '{{') {
      templateDepth += 1;
      index += 1;
      continue;
    }

    if (twoChars === '}}' && templateDepth > 0) {
      templateDepth -= 1;
      index += 1;
      continue;
    }

    if (twoChars === '[[') {
      linkDepth += 1;
      index += 1;
      continue;
    }

    if (twoChars === ']]' && linkDepth > 0) {
      linkDepth -= 1;
      index += 1;
      continue;
    }

    if (value[index] === '=' && templateDepth === 0 && linkDepth === 0) {
      return index;
    }
  }

  return -1;
}

function parseTemplate(templateText) {
  const inner = templateText.slice(2, -2).trim();
  const parts = splitTopLevel(inner, '|');
  const name = (parts.shift() || '').trim();
  const positional = [];
  const named = {};

  for (const part of parts) {
    const equalsIndex = getTopLevelEqualsIndex(part);

    if (equalsIndex > 0) {
      const key = part.slice(0, equalsIndex).trim();
      const rawValue = part.slice(equalsIndex + 1).trim();
      named[key] = rawValue;
      continue;
    }

    positional.push(part.trim());
  }

  return {
    name,
    positional,
    named,
    raw: templateText,
  };
}

function stripComments(value) {
  return value.replace(/<!--[\s\S]*?-->/g, '');
}

function cleanWikiText(value) {
  if (!value) {
    return '';
  }

  let cleaned = stripComments(value);

  cleaned = cleaned.replace(/<br\s*\/?>/gi, ' | ');
  cleaned = cleaned.replace(/{{-}}/g, ' / ');
  cleaned = cleaned.replace(/{{tt\|([^{}|]+?)\|[^{}]*}}/g, '$1');
  cleaned = cleaned.replace(/{{i\|([^{}|]+?)(?:\|[^{}]*)?}}/g, '$1');
  cleaned = cleaned.replace(/{{percent\|([^{}|]+?)\|[^{}]*}}/g, '$1%');
  cleaned = cleaned.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2');
  cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, '$1');
  cleaned = cleaned.replace(/\[(https?:\/\/[^\s\]]+)\s+([^\]]+)\]/g, '$2');
  cleaned = cleaned.replace(/\[(https?:\/\/[^\]]+)\]/g, '$1');

  while (/{{[^{}]*}}/.test(cleaned)) {
    cleaned = cleaned.replace(/{{[^{}]*}}/g, ' ');
  }

  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned.replace(/'{2,}/g, '');
  cleaned = decodeHtmlEntities(cleaned);
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function parseWikiList(value) {
  if (!value) {
    return [];
  }

  const linkMatches = [...value.matchAll(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)];

  if (linkMatches.length > 0) {
    return linkMatches
      .map((match) => cleanWikiText(match[2] || match[1]))
      .filter(Boolean);
  }

  return cleanWikiText(value)
    .replace(/\s+\|\s+/g, '|')
    .split(/\s*\|\s*|\s*\/\s*/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeHeadingTitle(value) {
  return cleanWikiText(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(text) {
  const headings = [];
  const headingPattern = /^([=]{2,})\s*(.*?)\s*\1\s*$/gm;

  for (const match of text.matchAll(headingPattern)) {
    headings.push({
      raw: match[2],
      title: normalizeHeadingTitle(match[2]),
      level: match[1].length,
      start: match.index,
      contentStart: match.index + match[0].length,
    });
  }

  return headings;
}

function getSectionContent(text, targetTitle) {
  const headings = extractHeadings(text);
  const heading = headings.find((entry) => entry.title === targetTitle);

  if (!heading) {
    return '';
  }

  const nextHeading = headings.find(
    (entry) => entry.start > heading.start && entry.level <= heading.level
  );

  const sectionEnd = nextHeading ? nextHeading.start : text.length;
  return text.slice(heading.contentStart, sectionEnd).trim();
}

function toNumberIfPossible(value) {
  const cleaned = cleanWikiText(value);

  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return Number(cleaned);
  }

  return cleaned || null;
}

function resolveGenderRatio(genderValue) {
  const cleaned = cleanWikiText(genderValue);

  if (!cleaned) {
    return GENDER_RATIO_MAP[50];
  }

  if (Object.prototype.hasOwnProperty.call(GENDER_RATIO_MAP, cleaned)) {
    return GENDER_RATIO_MAP[cleaned];
  }

  return cleaned;
}

function resolveMount(rideableValue) {
  const cleaned = cleanWikiText(rideableValue);

  if (!cleaned || cleaned.toLowerCase() === 'no') {
    return 'None';
  }

  return `${cleaned} mount`;
}

function resolveBehavior(namedArgs) {
  return [
    cleanWikiText(namedArgs.behavior2 || 'Timid 80%'),
    cleanWikiText(namedArgs.behavior1 || 'Neutral 0%'),
    cleanWikiText(namedArgs.behavior3 || 'Aggressive 20%'),
  ];
}

function buildTypeEffectivenessIcons() {
  return TYPE_EFFECTIVENESS_CONFIG.reduce((accumulator, entry) => {
    accumulator[entry.label] = {
      file: entry.file,
      url: `https://pixelmonmod.com/wiki/Special:Redirect/file/${entry.file}`,
    };

    return accumulator;
  }, {});
}

function parsePokemonList(indexWikitext) {
  const templates = extractTopLevelTemplates(indexWikitext).map(parseTemplate);

  return templates
    .filter((template) => template.name.toLowerCase() === 'p')
    .map((template, index) => {
      const title = cleanWikiText(template.positional[0]);

      return {
        id: index + 1,
        title,
      };
    });
}

function parseInfobox(pageWikitext, fallbackId, fallbackTitle) {
  const infoboxTemplate = extractTopLevelTemplates(pageWikitext)
    .map(parseTemplate)
    .find((template) => template.name === 'PokémonInfobox');

  if (!infoboxTemplate) {
    throw new Error(`No se encontro la plantilla PokémonInfobox en ${fallbackTitle}`);
  }

  const args = infoboxTemplate.named;
  const types = [args.type1, args.type2].map(cleanWikiText).filter(Boolean);
  const hiddenAbilities = parseWikiList(args.hidden).filter(
    (entry) => !/^coming soon$/i.test(entry) && !/^none$/i.test(entry)
  );

  return {
    id: toNumberIfPossible(args.ndex) ?? fallbackId,
    name: cleanWikiText(args.name) || fallbackTitle,
    type: types,
    catch_rate: toNumberIfPossible(args.catchrate),
    abilities: parseWikiList(args.abilities),
    hidden_ability: hiddenAbilities[0] || null,
    spawn_time: cleanWikiText(args.time || 'None'),
    level_range_in_wild: cleanWikiText(args.levels || 'None'),
    spawn_location: cleanWikiText(args.location || 'Land'),
    gender_ratio: resolveGenderRatio(args.gender),
    ev_yield: cleanWikiText(args.evyield || 'None'),
    mount: resolveMount(args.rideable),
    egg_groups: parseWikiList(args.egg),
    behavior: resolveBehavior(args),
  };
}

function parseSpawnBiomes(sectionWikitext) {
  return extractTopLevelTemplates(sectionWikitext)
    .map(parseTemplate)
    .filter((template) => /^Biome/i.test(template.name) && template.name === 'Biome')
    .map((template) => ({
      biome: cleanWikiText(template.positional[0]),
      mod_id: cleanWikiText(template.positional[1]),
      time: cleanWikiText(template.positional[2]),
      location: cleanWikiText(template.positional[3]),
      condition: cleanWikiText(template.positional[4]),
      rarity: cleanWikiText(template.positional[5]),
    }));
}

function formatPercentage(value) {
  const cleaned = cleanWikiText(value);

  if (/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return `${cleaned}%`;
  }

  return cleaned;
}

function parseDropTemplates(sectionWikitext) {
  return extractTopLevelTemplates(sectionWikitext)
    .map(parseTemplate)
    .filter((template) => template.name === 'Drop')
    .map((template) => ({
      item: cleanWikiText(template.positional[0]),
      chance: formatPercentage(template.positional[1]),
      quantity: cleanWikiText(template.positional[2]),
    }));
}

function parseTabbedDrops(sectionWikitext) {
  const tabberTemplate = extractTopLevelTemplates(sectionWikitext)
    .map(parseTemplate)
    .find((template) => template.name === '#tag:tabber');

  if (!tabberTemplate) {
    return null;
  }

  const firstPipeIndex = tabberTemplate.raw.indexOf('|');
  const innerContent = tabberTemplate.raw.slice(
    firstPipeIndex + 1,
    tabberTemplate.raw.length - 2
  );
  const tabBlocks = innerContent
    .split('{{!}}-{{!}}')
    .map((block) => block.trim())
    .filter(Boolean);
  const dropsByForm = {};

  for (const block of tabBlocks) {
    const equalsIndex = block.indexOf('=');

    if (equalsIndex <= 0) {
      continue;
    }

    const formName = cleanWikiText(block.slice(0, equalsIndex));
    const formContent = block.slice(equalsIndex + 1).trim();

    if (!formName) {
      continue;
    }

    dropsByForm[formName] = parseDropTemplates(formContent);
  }

  return Object.keys(dropsByForm).length > 0 ? dropsByForm : null;
}

function parseDrops(sectionWikitext) {
  const dropsByForm = parseTabbedDrops(sectionWikitext);

  if (dropsByForm) {
    return {
      drops: [],
      drops_by_form: dropsByForm,
    };
  }

  return {
    drops: parseDropTemplates(sectionWikitext),
    drops_by_form: null,
  };
}

function parseStats(pageWikitext) {
  const statsTemplate = extractTopLevelTemplates(pageWikitext)
    .map(parseTemplate)
    .find((template) => template.name === 'BaseStats');

  if (!statsTemplate) {
    return null;
  }

  const stats = {
    hp: Number(statsTemplate.named.HP || 0),
    attack: Number(statsTemplate.named.Attack || 0),
    defense: Number(statsTemplate.named.Defense || 0),
    sp_atk: Number(statsTemplate.named.SpAtk || 0),
    sp_def: Number(statsTemplate.named.SpDef || 0),
    speed: Number(statsTemplate.named.Speed || 0),
  };

  return {
    ...stats,
    total:
      stats.hp +
      stats.attack +
      stats.defense +
      stats.sp_atk +
      stats.sp_def +
      stats.speed,
  };
}

function parseTypeEffectiveness(pageWikitext) {
  const effectivenessTemplate = extractTopLevelTemplates(pageWikitext)
    .map(parseTemplate)
    .find((template) => template.name === 'Type effectiveness');

  if (!effectivenessTemplate) {
    return [];
  }

  return TYPE_EFFECTIVENESS_CONFIG.map((entry) => ({
    type: entry.label,
    multiplier: Number(effectivenessTemplate.named[entry.key] || 1),
  }));
}

function parseLevelMoves(sectionWikitext) {
  return extractTopLevelTemplates(sectionWikitext)
    .map(parseTemplate)
    .filter(
      (template) =>
        /^learnlist\/level/i.test(template.name) &&
        template.name !== 'learnlist/levelh' &&
        template.name !== 'learnlist/levelf'
    )
    .map((template) => ({
      level: cleanWikiText(template.positional[0]),
      move: cleanWikiText(template.positional[1]),
      type: cleanWikiText(template.positional[2]),
      category: cleanWikiText(template.positional[3]),
      power: cleanWikiText(template.positional[4]),
      accuracy: cleanWikiText(template.positional[5]),
      pp: cleanWikiText(template.positional[6]),
    }));
}

function parseTutorLikeMoves(sectionWikitext) {
  return extractTopLevelTemplates(sectionWikitext)
    .map(parseTemplate)
    .filter((template) => template.name === 'learnlist/tutor')
    .map((template) => ({
      move: cleanWikiText(template.positional[0]),
      type: cleanWikiText(template.positional[1]),
      category: cleanWikiText(template.positional[2]),
      power: cleanWikiText(template.positional[3]),
      accuracy: cleanWikiText(template.positional[4]),
      pp: cleanWikiText(template.positional[5]),
    }));
}

function parseTmTrMoves(sectionWikitext) {
  const templates = extractTopLevelTemplates(sectionWikitext).map(parseTemplate);
  const moves = [];
  let currentRegion = null;
  let currentMachineType = 'TM';

  for (const template of templates) {
    const name = template.name.toLowerCase();

    if (name === 'learnlist/tmtr') {
      currentMachineType = 'TR';
      currentRegion = 'Galar';
      continue;
    }

    if (
      /^learnlist\/tm[a-z]/.test(name) &&
      !['learnlist/tmhn', 'learnlist/tmh', 'learnlist/tmend', 'learnlist/tmregionf'].includes(
        name
      )
    ) {
      currentMachineType = 'TM';
      currentRegion = toTitleCase(name.replace('learnlist/tm', ''));
      continue;
    }

    if (/^learnlist\/tm\d+/.test(name)) {
      moves.push({
        machine_type: currentMachineType,
        region: currentRegion,
        machine: cleanWikiText(template.positional[0]),
        move: cleanWikiText(template.positional[1]),
        type: cleanWikiText(template.positional[2]),
        category: cleanWikiText(template.positional[3]),
        power: cleanWikiText(template.positional[4]),
        accuracy: cleanWikiText(template.positional[5]),
        pp: cleanWikiText(template.positional[6]),
      });
      continue;
    }

    if (name === 'learnlist/tr') {
      moves.push({
        machine_type: 'TR',
        region: currentRegion || 'Galar',
        machine: cleanWikiText(template.positional[0]),
        move: cleanWikiText(template.positional[1]),
        type: cleanWikiText(template.positional[2]),
        category: cleanWikiText(template.positional[3]),
        power: cleanWikiText(template.positional[4]),
        accuracy: cleanWikiText(template.positional[5]),
        pp: cleanWikiText(template.positional[6]),
      });
    }
  }

  return moves;
}

function parsePokemonPage(pageWikitext, fallbackId, fallbackTitle) {
  const infobox = parseInfobox(pageWikitext, fallbackId, fallbackTitle);
  const dropsInfo = parseDrops(getSectionContent(pageWikitext, 'Drops'));

  return {
    ...infobox,
    spawn_biomes: parseSpawnBiomes(getSectionContent(pageWikitext, 'Spawn Biomes')),
    drops: dropsInfo.drops,
    drops_by_form: dropsInfo.drops_by_form,
    stats: parseStats(pageWikitext),
    type_effectiveness: parseTypeEffectiveness(pageWikitext),
    moves: {
      by_level: parseLevelMoves(getSectionContent(pageWikitext, 'By level')),
      by_move_tutor: parseTutorLikeMoves(
        getSectionContent(pageWikitext, 'By move tutor')
      ),
      by_transfer: parseTutorLikeMoves(getSectionContent(pageWikitext, 'By transfer')),
      by_tm_tr: parseTmTrMoves(getSectionContent(pageWikitext, 'By TM/TR')),
    },
  };
}

async function fetchRawText(titleOrUrl, attempt = 1, redirectDepth = 0) {
  const url =
    titleOrUrl.startsWith('http://') || titleOrUrl.startsWith('https://')
      ? titleOrUrl
      : `${WIKI_RAW_BASE_URL}?title=${encodeURIComponent(titleOrUrl)}&action=raw`;

  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
  });

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = Number(retryAfterHeader);
    const retryAfterMs = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1000
      : 0;
    const shouldRetry = response.status === 429 || response.status >= 500;

    if (attempt < MAX_RETRIES && shouldRetry) {
      const waitMs =
        response.status === 429
          ? Math.max(retryAfterMs, RATE_LIMIT_DELAY_MS * attempt)
          : 2000 * attempt;

      console.warn(
        `Reintentando (${attempt}/${MAX_RETRIES - 1}) ${titleOrUrl} por respuesta ${response.status}. Esperando ${waitMs} ms. URL: ${url}`
      );

      await sleep(waitMs);
      return fetchRawText(titleOrUrl, attempt + 1, redirectDepth);
    }

    throw new Error(
      `No se pudo descargar ${titleOrUrl}: ${response.status}. URL: ${url}`
    );
  }

  const responseText = await response.text();
  const redirectTarget = extractRedirectTarget(responseText);

  if (redirectTarget) {
    if (redirectDepth >= MAX_REDIRECTS) {
      throw new Error(
        `Se excedio el maximo de redirects al descargar ${titleOrUrl}. Ultimo destino: ${redirectTarget}`
      );
    }

    console.log(
      `Redirect detectado para ${titleOrUrl} -> ${redirectTarget}. Siguiendo redirect...`
    );

    return fetchRawText(redirectTarget, 1, redirectDepth + 1);
  }

  return responseText;
}

async function loadExistingPokemonData() {
  try {
    const existingContent = await readFile(OUTPUT_PATH, 'utf8');
    const parsedContent = JSON.parse(existingContent);

    if (!Array.isArray(parsedContent)) {
      console.warn(
        `El archivo existente no contiene un array valido. Se ignorara: ${OUTPUT_PATH}`
      );
      return [];
    }

    return parsedContent;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }

    console.warn(
      `No se pudo leer el checkpoint existente. Se empezara desde cero. Motivo: ${error.message}`
    );
    return [];
  }
}

async function writeJsonFile(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function scrapePokemon() {
  console.log('Descargando indice de Pokémon disponibles...');
  const indexWikitext = await fetchRawText(WIKI_INDEX_URL);
  const pokemonEntries = parsePokemonList(indexWikitext);

  console.log(`Indice cargado: ${pokemonEntries.length} Pokémon encontrados.`);

  if (pokemonEntries.length === 0) {
    throw new Error('No se encontro ningun Pokémon en la pagina de indice.');
  }

  const existingPokemonData = await loadExistingPokemonData();
  const pokemonData = [...existingPokemonData];
  const startIndex = pokemonData.length;
  const typeIcons = buildTypeEffectivenessIcons();

  await writeJsonFile(TYPE_ICONS_OUTPUT_PATH, typeIcons);
  console.log(
    `JSON de iconos de efectividad guardado en ${TYPE_ICONS_OUTPUT_PATH}`
  );

  if (startIndex > 0) {
    const lastPokemon = pokemonData[startIndex - 1];
    console.log(
      `Reanudando desde el checkpoint: ${startIndex} Pokémon ya guardados. Ultimo: ${lastPokemon?.name || 'desconocido'}`
    );
  }

  if (startIndex >= pokemonEntries.length) {
    console.log('El archivo de salida ya contiene todos los Pokémon del indice.');
    await writeJsonFile(TYPE_ICONS_OUTPUT_PATH, typeIcons);

    return {
      total: pokemonData.length,
      iconsPath: TYPE_ICONS_OUTPUT_PATH,
      outputPath: OUTPUT_PATH,
    };
  }

  for (let index = startIndex; index < pokemonEntries.length; index += 1) {
    const entry = pokemonEntries[index];
    const progressLabel = `[${index + 1}/${pokemonEntries.length}]`;

    try {
      if (index > startIndex) {
        const delayMs = await sleepWithJitter(REQUEST_DELAY_MS);
        console.log(`${progressLabel} Espera anti-rate-limit: ${delayMs} ms`);
      }

      console.log(`${progressLabel} Descargando ${entry.title}...`);

      const pageWikitext = await fetchRawText(entry.title);
      const parsedPokemon = parsePokemonPage(pageWikitext, entry.id, entry.title);

      pokemonData.push(parsedPokemon);

      console.log(
        `${progressLabel} OK ${parsedPokemon.name} (#${String(parsedPokemon.id).padStart(3, '0')}) | biomas: ${parsedPokemon.spawn_biomes.length} | drops: ${parsedPokemon.drops.length} | nivel: ${parsedPokemon.moves.by_level.length} | tutor: ${parsedPokemon.moves.by_move_tutor.length} | transfer: ${parsedPokemon.moves.by_transfer.length} | tm/tr: ${parsedPokemon.moves.by_tm_tr.length}`
      );

      if ((index + 1) % CHECKPOINT_EVERY === 0) {
        await writeJsonFile(OUTPUT_PATH, pokemonData);
        console.log(
          `${progressLabel} Checkpoint guardado (${pokemonData.length} Pokémon) en ${OUTPUT_PATH}`
        );
      }
    } catch (error) {
      await writeJsonFile(OUTPUT_PATH, pokemonData);
      console.log(
        `${progressLabel} Checkpoint de emergencia guardado (${pokemonData.length} Pokémon) en ${OUTPUT_PATH}`
      );
      throw error;
    }
  }

  await writeJsonFile(OUTPUT_PATH, pokemonData);
  return {
    total: pokemonData.length,
    iconsPath: TYPE_ICONS_OUTPUT_PATH,
    outputPath: OUTPUT_PATH,
  };
}

async function main() {
  try {
    console.log('Iniciando scraping de Pokémon de Pixelmon...');
    const result = await scrapePokemon();
    console.log(
      `Scraping completado. ${result.total} Pokémon guardados en ${result.outputPath}`
    );
    console.log(`Iconos de efectividad guardados en ${result.iconsPath}`);
  } catch (error) {
    console.error('Error durante el scraping:', error);
    process.exitCode = 1;
  }
}

main();
