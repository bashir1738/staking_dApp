const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

// Resolve a package's compiled output using its "main" field.
function resolveMain(moduleName) {
  const pkgJsonPath = require.resolve(moduleName + '/package.json');
  const pkg = require(pkgJsonPath);
  const main = pkg.main || 'index.js';
  return { type: 'sourceFile', filePath: path.resolve(path.dirname(pkgJsonPath), main) };
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @reown packages expose TypeScript source via their "react-native" field,
  // which Metro can't resolve (relative .ts imports in node_modules).
  // Force the compiled CommonJS output instead.
  if (moduleName.startsWith('@reown/')) {
    try { return resolveMain(moduleName); } catch {}
  }

  // cross-fetch's browser ponyfill (loaded when Metro follows the "browser"
  // field of some @walletconnect packages) uses whatwg-fetch/XHR instead of
  // React Native's native fetch, causing "Network request failed" errors.
  // Force the react-native ponyfill which simply re-exports global.fetch.
  if (moduleName === 'cross-fetch' || moduleName === 'cross-fetch/polyfill') {
    try {
      const pkgDir = path.dirname(require.resolve('cross-fetch/package.json'));
      return { type: 'sourceFile', filePath: path.join(pkgDir, 'dist/react-native-ponyfill.js') };
    } catch {}
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
