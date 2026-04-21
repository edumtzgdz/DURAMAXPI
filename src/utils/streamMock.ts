// Mock for stream module to satisfy xlsx-js-style in browser
export const Readable = class {};
export const Writable = class {};
export const Transform = class {};
export const Duplex = class {};
export default {
  Readable,
  Writable,
  Transform,
  Duplex
};
