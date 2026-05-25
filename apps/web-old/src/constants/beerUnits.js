
export const BEER_UNITS = {
  Flasche: {
    name: 'Flasche',
    emoji: '🍺',
    plural: 'Flaschen'
  },
  Kiste: {
    name: 'Kiste',
    emoji: '📦',
    plural: 'Kisten'
  },
  Spritzer: {
    name: 'Spritzer',
    emoji: '🍷',
    plural: 'Spritzer'
  },
  Doppler: {
    name: 'Doppler',
    emoji: '🍾',
    plural: 'Doppler'
  },
  Weinflasche: {
    name: 'Weinflasche',
    emoji: '🍷',
    plural: 'Weinflaschen'
  },
  Weinkiste: {
    name: 'Weinkiste',
    emoji: '📦',
    plural: 'Weinkisten'
  }
};

export const getBeerUnitDisplay = (unit) => {
  return BEER_UNITS[unit] || { name: unit, emoji: '🍺', plural: unit };
};
