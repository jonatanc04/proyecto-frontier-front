import { mkdir, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://zukan.inazuma.jp/en/chara_list/';
const LAST_PAGE = 110;
const OUTPUT_PATH = resolve(
  __dirname,
  '..',
  'src',
  'data',
  'inazuma_characters.json'
);

const ELEMENT_MAP = {
  Mountain: 'MON',
  Forest: 'BOS',
  Wind: 'AIR',
  Fire: 'FUE',
};

const POSITION_MAP = {
  GK: 'POR',
  DF: 'DEF',
  MF: 'MED',
  FW: 'DEL',
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
  };

  return value
    .replace(
      /&(?:amp|quot|#39|apos|lt|gt|nbsp);/g,
      (match) => namedEntities[match] || match
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ');
}

function normalizeText(value) {
  return decodeHtmlEntities(stripTags(value))
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPageUrl(page) {
  const url = new URL(BASE_URL);

  if (page > 1) {
    url.searchParams.set('page', String(page));
  }

  return url.toString();
}

async function fetchPageHtml(page) {
  const pageUrl = buildPageUrl(page);

  console.log(`[${page}/${LAST_PAGE}] Descargando ${pageUrl}`);

  const response = await fetch(pageUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; proyecto-frontier scraper)',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo descargar la pagina ${page}: ${response.status}`);
  }

  return response.text();
}

function extractCharactersFromHtml(html) {
  const characters = [];
  const rowPattern =
    /<tr>\s*<td rowspan="2">[\s\S]*?<\/td>\s*<td rowspan="2">\d+<\/td>\s*<td rowspan="2">[\s\S]*?<source type="image\/webp" srcset="([^"]+)"[\s\S]*?<span class="name">([\s\S]*?)<\/span>[\s\S]*?<\/td>\s*<td rowspan="2">\s*([\s\S]*?)\s*<\/td>\s*<td colspan="9">[\s\S]*?<\/td>\s*<td rowspan="2">(Male|Female)<\/td>\s*<td rowspan="2">(Mountain|Forest|Wind|Fire)<\/td>\s*<td rowspan="2">(GK|DF|MF|FW)<\/td>/g;

  for (const match of html.matchAll(rowPattern)) {
    const [, imageUrl, rawName, rawNickname, rawGender, rawElement, rawPosition] =
      match;

    characters.push({
      img: imageUrl.trim(),
      name: normalizeText(rawName),
      nickname: normalizeText(rawNickname),
      gender: rawGender.toLowerCase(),
      element: ELEMENT_MAP[rawElement] || rawElement,
      position: POSITION_MAP[rawPosition] || rawPosition,
      active: true,
    });
  }

  return characters;
}

async function scrapeCharacters() {
  const dedupeKeys = new Set();
  const scrapedCharacters = [];

  for (let page = 1; page <= LAST_PAGE; page += 1) {
    const currentPageHtml = await fetchPageHtml(page);
    const currentCharacters = extractCharactersFromHtml(currentPageHtml);
    let addedCount = 0;

    for (const character of currentCharacters) {
      const dedupeKey = `${character.name}::${character.img}`;

      if (dedupeKeys.has(dedupeKey)) {
        continue;
      }

      dedupeKeys.add(dedupeKey);
      scrapedCharacters.push({
        id: scrapedCharacters.length + 1,
        ...character,
      });
      addedCount += 1;
    }

    console.log(
      `[${page}/${LAST_PAGE}] Extraidos ${currentCharacters.length} personajes, añadidos ${addedCount}, acumulado ${scrapedCharacters.length}`
    );
  }

  return scrapedCharacters;
}

async function writeCharactersFile(characters) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(characters, null, 2) + '\n', 'utf8');
}

async function main() {
  try {
    console.log(`Iniciando scraping de personajes de Inazuma (1-${LAST_PAGE})...`);
    const characters = await scrapeCharacters();
    await writeCharactersFile(characters);
    console.log(
      `Scraping completado. ${characters.length} personajes guardados en ${OUTPUT_PATH}`
    );
  } catch (error) {
    console.error('Error durante el scraping:', error);
    process.exitCode = 1;
  }
}

main();
