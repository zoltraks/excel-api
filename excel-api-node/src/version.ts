// Single source of truth for the package version.

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const PACKAGE_VERSION = pkg.version;
