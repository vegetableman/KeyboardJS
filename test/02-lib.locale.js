
// modules
var test = require('tape');

// libs
var Locale = require('../lib/locale');

// test globals
var locale;


test('new Locale(name)', function(t) {
  locale = new Locale('test');
  t.pass('can construct a new locale');
  t.equal(locale.localeName, 'test', 'sets the locale name correctly');
  t.end();
});

test('locale.bindKeyCode(keyCode, keyName)', function(t) {
  locale.bindKeyCode(0, 'a');
  t.deepEqual(
    locale._keyMap[0],
    [ 'a' ],
    'binds a single key to a key code correctly'
  );
  t.end();
});

test('locale.bindKeyCode(keyCode, keyNames)', function(t) {
  locale.bindKeyCode(1, [ 'b', 'B' ]);
  t.deepEqual(
    locale._keyMap[1],
    [ 'b', 'B' ],
    'binds multiple keys to a key code correctly'
  );
  t.end();
});

test('locale.bindMacro(keyCombo, keyName)', function(t) {
  locale.bindMacro('a + b > c', 'abc');
  t.deepEqual(
    locale._macros[0].keyCombo.subCombos,
    [ [ 'a', 'b' ], [ 'c' ] ],
    'constructs the macro\'s key combo correctly'
  );
  t.deepEqual(
    locale._macros[0].keyNames,
    [ 'abc' ],
    'attaches the macro\'s keyNames array correctly'
  );
  t.end();
});

test('locale.bindMacro(keyCombo, keyNames)', function(t) {
  locale.bindMacro('a + b > c', ['abc', 'ABC']);
  t.deepEqual(
    locale._macros[1].keyNames,
    [ 'abc', 'ABC' ],
    'attaches the macro\'s keyNames array correctly'
  );
  t.end();
});

test('locale.bindMacro(keyCombo, handler)', function(t) {
  function handler() {};
  locale.bindMacro('a + b > c', handler);
  t.deepEqual(
    locale._macros[2].handler,
    handler,
    'attaches the macro\'s handler correctly'
  );
  t.end();
});

test('locale.pressKey(keyCode)', function(t) {
  locale.pressKey(0);
  locale.pressKey(1);
  t.deepEqual(
    locale.pressedKeys,
    [ 'a', 'b', 'B' ],
    'adds the a key to pressed keys array'
  );
  t.end();
});

test('locale.releaseKey(keyCode)', function(t) {
  locale.releaseKey(0);
  t.deepEqual(
    locale.pressedKeys,
    [ 'b', 'B' ],
    'removes the a key from pressed keys array'
  );
  t.end();
});

test('locale.pressKey(keyName)', function(t) {
  locale.pressedKeys = [];
  locale.pressKey('a');
  locale.pressKey('b');
  t.deepEqual(
    locale.pressedKeys,
    [ 'a', 'b', 'B' ],
    'adds the b and B keys to pressed keys array'
  );
  t.end();
});

test('locale.releaseKey(keyName)', function(t) {
  locale.releaseKey('b');
  t.deepEqual(
    locale.pressedKeys,
    [ 'a' ],
    'removes the b and B keys from pressed keys array'
  );
  t.end();
});

test('locale.getKeyCodes(keyName)', function(t) {
  t.equal(locale.getKeyCodes('a')[0], 0, 'key name a is bound to key code 0');
  t.equal(locale.getKeyCodes('b')[0], 1, 'key name a is bound to key code 1');
  t.end();
});

test('locale.getKeyNames(keyCode)', function(t) {
  t.equal(locale.getKeyNames(0)[0], 'a', 'key code 0 is bound to key name a');
  t.equal(locale.getKeyNames(1)[0], 'b', 'key code 1 is bound to key name b');
  t.end();
});
