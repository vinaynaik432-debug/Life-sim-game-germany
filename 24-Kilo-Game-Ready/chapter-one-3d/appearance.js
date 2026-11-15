export const DEFAULT_APPEARANCE = Object.freeze({
  name: 'Ari', gender: 'female', skin: 0, hair: 0, hairstyle: 0, outfit: 0
});

export const PALETTES = {
  skin: [
    {name: 'Warm brown', color: '#b47d60'},
    {name: 'Deep brown', color: '#74503f'},
    {name: 'Mahogany', color: '#8f5c47'},
    {name: 'Golden', color: '#c99b72'},
    {name: 'Olive', color: '#cdac8c'},
    {name: 'Fair', color: '#e6c3ac'}
  ],
  hair: [
    {name: 'Dark brown', color: '#462f27'},
    {name: 'Black', color: '#242329'},
    {name: 'Chestnut', color: '#885438'},
    {name: 'Blond', color: '#b99765'},
    {name: 'Silver', color: '#aca7a2'}
  ],
  outfit: [
    {name: 'Teal', color: '#547772'},
    {name: 'Terracotta', color: '#9e624b'},
    {name: 'Indigo', color: '#536887'},
    {name: 'Moss', color: '#72805c'}
  ],
  hairstyle: [
    {name: 'Original'}, {name: 'Shorter'}, {name: 'Fuller'}
  ]
};

export function cleanAppearance(input) {
  const value = input && typeof input === 'object' ? input : {};
  const rawName = typeof value.name === 'string' ? value.name : DEFAULT_APPEARANCE.name;
  const name = Array.from(rawName.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 20).join('');
  const profile = {name: name || DEFAULT_APPEARANCE.name,
    gender: value.gender === 'male' ? 'male' : 'female'};
  for (const key of ['skin','hair','hairstyle','outfit']) {
    const index = value[key];
    profile[key] = Number.isInteger(index) && index >= 0 && index < PALETTES[key].length
      ? index : DEFAULT_APPEARANCE[key];
  }
  return profile;
}
