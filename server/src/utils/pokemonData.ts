const { Vibrant } = require('node-vibrant/node');

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

// In-memory cache for API requests
const cache: Record<string, any> = {};

async function fetchWithCache(url: string) {
  if (cache[url]) return cache[url];
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const data = await response.json();
  cache[url] = data;
  return data;
}

/**
 * Extracts the Pokemon ID from a PokeAPI URL (e.g. https://pokeapi.co/api/v2/pokemon/25/)
 */
function extractIdFromUrl(url: string): number {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

/**
 * Gets a list of Pokemon IDs matching the specified Type and/or Generation.
 * If both are null, returns the National Dex (1-1025).
 */
export async function getFilteredPokemonIds(types: string[], generations: string[]): Promise<number[]> {
  let typeIds: Set<number> | null = null;
  let genIds: Set<number> | null = null;

  if (types && types.length > 0 && !types.includes('Any')) {
    typeIds = new Set();
    for (const type of types) {
      try {
        const data = await fetchWithCache(`${POKEAPI_BASE}/type/${type.toLowerCase()}`);
        data.pokemon.forEach((p: any) => {
          const id = extractIdFromUrl(p.pokemon.url);
          if (id <= 1025) typeIds!.add(id);
        });
      } catch (e) {
        console.error(`Error fetching type ${type}:`, e);
      }
    }
  }

  if (generations && generations.length > 0 && !generations.includes('All')) {
    genIds = new Set();
    for (const gen of generations) {
      try {
        const genMatch = gen.match(/Gen (\d+)/i);
        if (genMatch) {
          const genNum = genMatch[1];
          const data = await fetchWithCache(`${POKEAPI_BASE}/generation/${genNum}`);
          data.pokemon_species.forEach((p: any) => {
            const id = extractIdFromUrl(p.url);
            if (id <= 1025) genIds!.add(id);
          });
        }
      } catch (e) {
        console.error(`Error fetching generation ${gen}:`, e);
      }
    }
  }

  // Intersect the sets if both exist, otherwise use one, otherwise return default 1-1025
  let finalIds: number[] = [];
  
  if (typeIds && genIds) {
    finalIds = Array.from(typeIds).filter(id => genIds!.has(id));
  } else if (typeIds) {
    finalIds = Array.from(typeIds);
  } else if (genIds) {
    finalIds = Array.from(genIds);
  } else {
    // Default national dex
    for (let i = 1; i <= 1025; i++) finalIds.push(i);
  }

  // Fallback to national dex if intersection is completely empty
  if (finalIds.length === 0) {
    console.warn('Filter resulted in 0 Pokemon, falling back to 1-1025');
    for (let i = 1; i <= 1025; i++) finalIds.push(i);
  }

  return finalIds;
}

/**
 * Extracts 4-5 dominant colors from a Pokemon's official artwork sprite using node-vibrant.
 */
export async function getPokemonColorPalette(pokemonId: number): Promise<string[]> {
  const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
  const cacheKey = `palette_${pokemonId}`;
  
  if (cache[cacheKey]) return cache[cacheKey];

  try {
    const palette = await Vibrant.from(imageUrl).getPalette();
    const colors: string[] = [];
    
    if (palette.Vibrant) colors.push(palette.Vibrant.hex);
    if (palette.LightVibrant) colors.push(palette.LightVibrant.hex);
    if (palette.DarkVibrant) colors.push(palette.DarkVibrant.hex);
    if (palette.Muted) colors.push(palette.Muted.hex);
    if (palette.LightMuted) colors.push(palette.LightMuted.hex);
    if (palette.DarkMuted && colors.length < 5) colors.push(palette.DarkMuted.hex);

    cache[cacheKey] = colors;
    return colors;
  } catch (e) {
    console.error(`Error extracting palette for ${pokemonId}:`, e);
    return ['#ffffff', '#000000']; // Fallback
  }
}
