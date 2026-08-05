const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support monorepo-style imports if we add shared packages later.
config.resolver.nodeModulesPaths = [
  `${__dirname}/node_modules`,
];

// Stable SVG/font handling — recommended by Expo for SDK 57.
config.resolver.assetExts = config.resolver.assetExts.filter(
  (ext) => ext !== 'svg'
);

module.exports = config;
