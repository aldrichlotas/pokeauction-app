export interface PokemonDetails {
  id: number;
  name: string;
  spriteUrl: string;
  types: string[];
  ability: string;
}

const typeColors: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705898',
  steel: '#B7B7CE',
  fairy: '#D685AD',
};

export const getTypeColor = (type: string) => typeColors[type.toLowerCase()] || '#777';

export const fetchPokemonDetails = async (id: number): Promise<PokemonDetails> => {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  const data = await res.json();
  
  return {
    id: data.id,
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    spriteUrl: data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '',
    types: data.types.map((t: any) => t.type.name),
    ability: data.abilities[0]?.ability?.name.replace('-', ' ') || 'Unknown',
  };
};

export const generateShowdownText = (pokemonList: PokemonDetails[]): string => {
  return pokemonList.map(p => {
    return `${p.name}
Ability: ${p.ability.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
EVs: 252 HP / 252 Atk / 4 SpD
Serious Nature
- Tackle
- Protect
- Substitute
- Return
`;
  }).join('\n');
};
