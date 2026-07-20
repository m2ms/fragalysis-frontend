const COLOUR_NAMES = Object.freeze({
  black: '#000000',
  blue: '#0000ff',
  cyan: '#00ffff',
  green: '#008000',
  lightgreen: '#90ee90',
  mediumseagreen: '#3cb371',
  orange: '#ffa500',
  red: '#ff0000',
  tomato: '#ff6347',
  white: '#ffffff',
  yellow: '#ffff00'
});

const REPRESENTATION_STYLES = Object.freeze({
  axes: 'unitCell',
  backbone: 'CAs',
  'ball+stick': 'ligands',
  base: 'DishyBases',
  buffer: 'CBs',
  cartoon: 'CRs',
  contact: 'contact_dots',
  distance: 'allHBonds',
  helixorient: 'Calpha',
  hyperball: 'VdwSpheres',
  label: 'CBs',
  licorice: 'CBs',
  line: 'CBs',
  point: 'VdwSpheres',
  ribbon: 'CRs',
  rocket: 'CRs',
  rope: 'Calpha',
  spacefill: 'VdwSpheres',
  surface: 'MolecularSurface',
  trace: 'CAs',
  tube: 'Calpha',
  unitcell: 'unitCell',
  validation: 'ligand_validation'
});

const clampColourChannel = value => Math.max(0, Math.min(255, Math.round(value)));

const expandHex = value =>
  value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value.slice(0, 7);

export const normaliseMoorhenColour = (value, fallback = '#ffffff') => {
  let hex;

  if (Array.isArray(value)) {
    const channels = value.slice(0, 3).map(channel => clampColourChannel(channel <= 1 ? channel * 255 : channel));
    hex = `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    hex = `#${Math.max(0, Math.min(0xffffff, Math.round(value)))
      .toString(16)
      .padStart(6, '0')}`;
  } else if (typeof value === 'string') {
    const candidate = value.trim().toLowerCase();
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(candidate)) {
      hex = expandHex(candidate);
    } else {
      hex = COLOUR_NAMES[candidate];
    }
  }

  if (!hex) {
    return normaliseMoorhenColour(fallback, '#ffffff');
  }

  const integer = parseInt(hex.slice(1), 16);
  return {
    hex,
    integer,
    rgb: {
      r: (integer >> 16) & 0xff,
      g: (integer >> 8) & 0xff,
      b: integer & 0xff
    }
  };
};

export const getMoorhenRepresentationStyle = type => REPRESENTATION_STYLES[type] || type || 'CRs';

export const nglSelectionToMoorhenCid = selection => {
  if (!selection || ['*', 'all', 'polymer', 'not ligand', '/0', '/1'].includes(selection)) {
    return '/*/*/*/*';
  }
  if (selection === 'LIG' || selection === 'ligand') {
    return '/*/*/(LIG)/*';
  }
  if (selection.startsWith('/')) {
    return selection;
  }
  return '/*/*/*/*';
};

export const getMoorhenRepresentationTemplate = (type, isMap = false) => {
  const template = {
    visible: { type: 'boolean' },
    opacity: { type: 'range', min: 0, max: 1, step: 0.05 },
    colorValue: { type: 'color' }
  };

  if (isMap || type === 'surface') {
    return {
      ...template,
      isolevel: { type: 'number', min: -20, max: 20, precision: 0.1 },
      boxSize: { type: 'number', min: 1, max: 100, precision: 1 },
      contour: { type: 'boolean' }
    };
  }

  return template;
};

export const createMoorhenVector = ({ name, start, end, colour, arrow = false }) => {
  const vectorColour = normaliseMoorhenColour(colour, '#ff0000').rgb;
  const startCoordinates = Array.isArray(start) ? start : [start?.x, start?.y, start?.z];
  const endCoordinates = Array.isArray(end) ? end : [end?.x, end?.y, end?.z];
  return {
    coordsMode: 'points',
    labelMode: 'none',
    labelText: name,
    drawMode: 'cylinder',
    arrowMode: arrow ? 'end' : 'none',
    xFrom: Number(startCoordinates[0]),
    yFrom: Number(startCoordinates[1]),
    zFrom: Number(startCoordinates[2]),
    xTo: Number(endCoordinates[0]),
    yTo: Number(endCoordinates[1]),
    zTo: Number(endCoordinates[2]),
    cidFrom: '',
    cidTo: '',
    molNoFrom: -1,
    molNoTo: -1,
    uniqueId: name,
    vectorColour,
    textColour: vectorColour
  };
};

export const createSpherePdb = center => {
  const coordinates = Array.isArray(center) ? center : [center?.x, center?.y, center?.z];
  const [x, y, z] = coordinates.map(Number);
  const coordinate = value => value.toFixed(3).padStart(8, ' ');
  return `HETATM    1  C   SPH A   1    ${coordinate(x)}${coordinate(y)}${coordinate(
    z
  )}  1.00 20.00           C\nEND\n`;
};

const quaternionFromRotationMatrix = elements => {
  const m11 = elements[0];
  const m12 = elements[4];
  const m13 = elements[8];
  const m21 = elements[1];
  const m22 = elements[5];
  const m23 = elements[9];
  const m31 = elements[2];
  const m32 = elements[6];
  const m33 = elements[10];
  const trace = m11 + m22 + m33;
  let x;
  let y;
  let z;
  let w;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (m32 - m23) * s;
    y = (m13 - m31) * s;
    z = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    w = (m32 - m23) / s;
    x = 0.25 * s;
    y = (m12 + m21) / s;
    z = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    w = (m13 - m31) / s;
    x = (m12 + m21) / s;
    y = 0.25 * s;
    z = (m23 + m32) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
    w = (m21 - m12) / s;
    x = (m13 + m31) / s;
    y = (m23 + m32) / s;
    z = 0.25 * s;
  }

  const length = Math.hypot(x, y, z, w) || 1;
  return [x / length, y / length, z / length, w / length];
};

const legacyNglMatrixToMoorhenOrientation = value => {
  const elements = Array.from(value, Number);
  if (elements.some(element => !Number.isFinite(element))) return {};

  let scaleX = Math.hypot(elements[0], elements[1], elements[2]);
  const scaleY = Math.hypot(elements[4], elements[5], elements[6]);
  const scaleZ = Math.hypot(elements[8], elements[9], elements[10]);
  if (scaleX === 0 || scaleY === 0 || scaleZ === 0) return {};

  const determinant =
    elements[0] * (elements[5] * elements[10] - elements[9] * elements[6]) -
    elements[4] * (elements[1] * elements[10] - elements[9] * elements[2]) +
    elements[8] * (elements[1] * elements[6] - elements[5] * elements[2]);
  if (determinant < 0) scaleX = -scaleX;

  const rotation = [...elements];
  [0, 1, 2].forEach(index => {
    rotation[index] /= scaleX;
    rotation[index + 4] /= scaleY;
    rotation[index + 8] /= scaleZ;
  });

  return {
    quat4: quaternionFromRotationMatrix(rotation),
    origin: elements.slice(12, 15)
  };
};

export const normaliseMoorhenOrientation = orientation => {
  const value = orientation?.elements || orientation;
  if (value && typeof value.length === 'number' && value.length === 8) {
    const elements = Array.from(value);
    return {
      quat4: elements.slice(0, 4),
      origin: elements.slice(4, 7),
      zoom: elements[7]
    };
  }

  if (value && typeof value.length === 'number' && value.length === 16) {
    return legacyNglMatrixToMoorhenOrientation(value);
  }

  if (orientation && typeof orientation === 'object') {
    return {
      quat4: orientation.quat4 || orientation.quat,
      origin: orientation.origin,
      zoom: orientation.zoom
    };
  }

  return {};
};
