
// modules
var test = require('tape');

// libs
var KeyCombo = require('../lib/key-combo');

// test globals
var keyCombo;


test('new KeyCombo(keyCombo)', function(t) {
  keyCombo = new KeyCombo('a + b > c');
  t.deepEqual(
    keyCombo.subCombos,
    [ [ 'a', 'b' ], [ 'c' ] ],
    'can construct a new keyCombo'
  );
  t.end();
});

test('KeyCombo.parseComboStr(keyCombo)', function(t) {
  var combo = KeyCombo.parseComboStr('a + b > c');
  t.deepEqual(
    combo,
    [ [ 'a', 'b' ], [ 'c' ] ],
    'parses a key combo correctly'
  );
  t.end();
});

test('keyCombo.check(keyCombo)', function(t) {
  keyCombo = new KeyCombo('a+  b >c');
  t.ok(
    keyCombo.check([ 'a', 'b', 'c' ]),
    'passes with keys pressed in the correct order'
  );
  t.ok(
    keyCombo.check([ 'x', 'b', 'y', 'a', 'z', 'c' ]),
    'passes with keys pressed in the correct order even with extras'
  );
  t.notOk(
    keyCombo.check([ 'a', 'c', 'b' ]),
    'fails with keys pressed in the wrong order'
  );
  t.notOk(
    keyCombo.check([ 'a', 'b' ]),
    'fails with when keys from the second sub combo are missing'
  );
  t.notOk(
    keyCombo.check([ 'c' ]),
    'fails with when keys from the first sub combo are missing'
  );
  var otherKeyCombo = new KeyCombo('\\+ > \\>');
  t.ok(
    otherKeyCombo.check([ '+', '>' ]),
    'works with combos containing escaped keys'
  );
  t.end();
});

test('keyCombo.isEqual(keyCombo)', function(t) {
  t.ok(
    keyCombo.isEqual(new KeyCombo('a + b > c')),
    'matches an equivient key combo'
  );
  t.ok(
    keyCombo.isEqual(new KeyCombo('b + a > c')),
    'matches an equivient key combo even if the key order is different'
  );
  t.notOk(
    keyCombo.isEqual(new KeyCombo('b + a > d')),
    'does not match a not equivient key combo'
  );
  t.notOk(
    keyCombo.isEqual(new KeyCombo('b + a')),
    'does not match a not equivient key combo'
  );
  t.end();
});

test('keyCombo.isEqual(keyComboStr)', function(t) {
  t.ok(
    keyCombo.isEqual('a + b > c'),
    'matches an equivient key combo'
  );
  t.ok(
    keyCombo.isEqual('b + a > c'),
    'matches an equivient key combo even if the key order is different'
  );
  t.notOk(
    keyCombo.isEqual('b + a > d'),
    'does not match a not equivient key combo'
  );
  t.notOk(
    keyCombo.isEqual('b + a'),
    'does not match a not equivient key combo'
  );
  t.end();
});
