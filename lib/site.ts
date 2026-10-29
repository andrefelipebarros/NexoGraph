import pkg from '@/package.json';

export const GITHUB_URL = 'https://github.com/andrefelipebarros/NexoGraph';
export const APP_VERSION = pkg.version;
export const APP_VERSION_SHORT = APP_VERSION.split('.').slice(0, 2).join('.');
