
// libs
var KeyboardJS = require('./lib/keyboard');
var Locale = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');
var usLocale = require('./locales/us');

var keyboardJS = new KeyboardJS();
keyboardJS.setLocale(usLocale);

exports = module.exports = keyboardJS;
exports.KeyboardJS = KeyboardJS;
exports.Locale = Locale;
exports.KeyCombo = KeyCombo;
