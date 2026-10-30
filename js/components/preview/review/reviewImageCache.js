// Runtime-only SVG results, including highlighted thumbnails and failures. Never retain RDKit handles here.
const MAX_IMAGES = 128;
const images = new Map();

export const getReviewImage = key => {
  if (!images.has(key)) return undefined;
  const svg = images.get(key);
  images.delete(key);
  images.set(key, svg);
  return svg;
};

export const rememberReviewImage = (key, svg) => {
  images.delete(key);
  images.set(key, svg);
  if (images.size > MAX_IMAGES) images.delete(images.keys().next().value);
};
