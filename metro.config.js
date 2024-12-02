const { getDefaultConfig } = require('@expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/using-metro/
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
