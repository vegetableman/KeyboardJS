
// modules
var test = require('tape');

// libs
var KeyboardJS = require('../lib/keyboard');
var Locale = require('../lib/locale');

// test globals
var keyboardJS;


test('new KeyboardJS()', function(t) {
  keyboardJS = new KeyboardJS();
  t.pass('can construct an instance of KeyboardJS');
  t.end();
});

test('keyboardJS.setLocale(locale)', function(t) {
  var locale = new Locale('test-1');
  locale.bindKeyCode(1, 'a');
  locale.bindKeyCode(2, 'b');
  locale.bindKeyCode(3, 'c');
  keyboardJS.setLocale(locale);
  t.equal(keyboardJS._locales['test-1'], locale);
  t.equal(keyboardJS.locale, locale);
  t.end();
});

test('keyboardJS.setLocale(localName, localeBuilder(locale))', function(t) {
  var locale;
  keyboardJS.setLocale('test-2', function(_locale) {
    locale = _locale;
    t.equal(locale.constructor, Locale);
  });
  t.equal(keyboardJS._locales['test-2'], locale);
  t.equal(keyboardJS.locale, locale);
  t.end();
});

test('keyboardJS.setLocale(localName)', function(t) {
  keyboardJS.setLocale('test-1');
  t.equal(keyboardJS.locale, keyboardJS._locales['test-1']);
  t.end();
});

test('keyboardJS.pressKey(keyCode)', function(t) {
  keyboardJS.pressKey(1);
  keyboardJS.pressKey(2);
  keyboardJS.pressKey(3);
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'a', 'b', 'c' ],
    'adds the a key to pressed keys array'
  );
  t.end();
});

test('keyboardJS.releaseKey(keyCode)', function(t) {
  keyboardJS.releaseKey(1);
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'b', 'c' ],
    'removes the a key from pressed keys array'
  );
  t.end();
});

test('keyboardJS.pressKey(keyName)', function(t) {
  keyboardJS.locale.pressedKeys = [];
  keyboardJS.pressKey('a');
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [ 'a' ],
    'adds the a and b keys to pressed keys array'
  );
  t.end();
});

test('keyboardJS.releaseKey(keyName)', function(t) {
  keyboardJS.releaseKey('a');
  t.deepEqual(
    keyboardJS.locale.pressedKeys,
    [],
    'removes the a key from pressed keys array'
  );
  t.end();
});

test('keyboardJS.bind(keyCombo, handler(event))', function(t) {
  var bindingFired = false;
  keyboardJS.bind('a + b > c', function(event) {
    bindingFired = true;
  });
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('c');
  keyboardJS.pressKey('b');
  t.notOk(
    bindingFired,
    'not fired unless keys are pressed in the correct order'
  );
  keyboardJS.releaseAllKeys();
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.ok(bindingFired, 'fired when keys are pressed in the correct order');
  t.end();
});

test('keyboardJS.addListener() -> keyboardJS.bind()', function(t) {
  t.equal(keyboardJS.addListener, keyboardJS.bind, 'aliases keyboardJS.bind');
  t.end();
});

test('keyboardJS.on() -> keyboardJS.bind()', function(t) {
  t.equal(keyboardJS.on, keyboardJS.bind, 'aliases keyboardJS.bind');
  t.end();
});

test('keyboardJS.unbind(keyCombo, handler(event))', function(t) {
  var bindingFired = false;
  var listener = function(event) {
    bindingFired = true;
  };
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b > c', listener);
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.notOk(bindingFired, 'listener should be unbound');

  keyboardJS.releaseAllKeys();
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b > c');
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.notOk(bindingFired, 'listener should be unbound');

  keyboardJS.releaseAllKeys();
  keyboardJS.bind('a + b > c', listener);
  keyboardJS.unbind('a + b');
  keyboardJS.pressKey('a');
  keyboardJS.pressKey('b');
  keyboardJS.pressKey('c');
  t.ok(bindingFired, 'listener should be fired');
  t.end();
});