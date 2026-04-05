/**
 * Generate a simple but distinct SVG avatar from a name + gender.
 * No external API needed — purely deterministic from the seed.
 */

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const SKIN_TONES = ['#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#694D3D', '#F8D5C2'];
const HAIR_COLORS = ['#2C1B18', '#4A312C', '#A55728', '#B58143', '#D6B370', '#CB607B', '#28354B'];
const SHIRT_COLORS = ['#5C76AE', '#E8453C', '#3BAA6F', '#F0A030', '#9B59B6', '#1ABC9C', '#E67E22', '#2980B9'];

export function generateAvatar(name, gender) {
  const h = hashCode(name);
  const skin = SKIN_TONES[h % SKIN_TONES.length];
  const hair = HAIR_COLORS[(h >> 3) % HAIR_COLORS.length];
  const shirt = SHIRT_COLORS[(h >> 6) % SHIRT_COLORS.length];
  const eyeStyle = (h >> 9) % 3; // 0=normal, 1=narrow, 2=wide
  const mouthStyle = (h >> 11) % 3;

  const isFemale = gender === 'female';

  // Hair path varies by gender
  const hairPath = isFemale
    ? `<path d="M20 22c0-8 5-14 15-14s15 6 15 14" fill="${hair}" />
       <path d="M15 22c-2 0-3 4-3 10h6c0-6-1-10-3-10z" fill="${hair}" />
       <path d="M55 22c-2 0-3 4-3 10h6c0-6-1-10-3-10z" fill="${hair}" />`
    : `<path d="M22 24c0-7 4-12 13-12s13 5 13 12" fill="${hair}" />`;

  // Eyes
  const eyeW = eyeStyle === 2 ? 4 : 3;
  const eyeH = eyeStyle === 1 ? 2 : 3;

  // Mouth
  const mouth = mouthStyle === 0
    ? `<path d="M30 44c2 2 6 2 8 0" stroke="#333" stroke-width="1.5" fill="none" />`
    : mouthStyle === 1
      ? `<ellipse cx="34" cy="44" rx="3" ry="1.5" fill="#333" />`
      : `<line x1="31" y1="44" x2="37" y2="44" stroke="#333" stroke-width="1.5" />`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70">
    <rect width="70" height="70" rx="35" fill="#292524" />
    <circle cx="35" cy="38" r="18" fill="${skin}" />
    ${hairPath}
    <rect x="${35 - eyeW - 5}" y="36" width="${eyeW}" height="${eyeH}" rx="1" fill="#333" />
    <rect x="${35 + 5 - eyeW + 2}" y="36" width="${eyeW}" height="${eyeH}" rx="1" fill="#333" />
    ${mouth}
    <rect x="25" y="52" width="20" height="18" rx="3" fill="${shirt}" />
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
