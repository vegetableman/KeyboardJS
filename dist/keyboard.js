!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.keyboardJS=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

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

},{"./lib/key-combo":2,"./lib/keyboard":3,"./lib/locale":4,"./locales/us":5}],2:[function(require,module,exports){

// modules
var guard = require('type-guard');


function KeyCombo(keyComboStr) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');

  self.sourceStr = keyComboStr;
  self.subCombos = KeyCombo.parseComboStr(keyComboStr);
  self.keyNames = self.subCombos.reduce(function(memo, nextSubCombo) {
    return memo.concat(nextSubCombo);
  });
}

KeyCombo.comboDeliminator = '>';
KeyCombo.keyDeliminator = '+';

KeyCombo.parseComboStr = function(keyComboStr) {
  guard('keyComboStr', keyComboStr, 'string');

  var subComboStrs = KeyCombo._splitStr(keyComboStr, KeyCombo.comboDeliminator);
  var combo = [];
  for (var i = 0 ; i < subComboStrs.length; i += 1) {
    combo.push(KeyCombo._splitStr(subComboStrs[i], KeyCombo.keyDeliminator));
  }
  return combo;
};

KeyCombo._splitStr = function(str, deliminator) {
  var s = str;
  var d = deliminator;
  var c = '';
  var ca = [];

  for (var ci = 0; ci < s.length; ci += 1) {
    if (ci > 0 && s[ci] === d && s[ci - 1] !== '\\') {
      ca.push(c.trim());
      c = '';
      ci += 1;
    }
    c += s[ci];
  }
  if (c) { ca.push(c.trim()); }

  return ca;
};

KeyCombo.prototype.check = function(pressedKeyNames) {
  var self = this;

  guard('pressedKeyNames', pressedKeyNames, 'array');

  var startingKeyNameIndex = 0;
  for (var i = 0; i < self.subCombos.length; i += 1) {
    startingKeyNameIndex = self._checkSubCombo(
      self.subCombos[i],
      startingKeyNameIndex,
      pressedKeyNames
    );
    if (startingKeyNameIndex === -1) { return false; }
  }
  return true;
};

KeyCombo.prototype.isEqual = function(otherKeyCombo) {
  var self = this;

  guard('otherKeyCombo', otherKeyCombo, [ 'object', 'string' ]);

  if (typeof otherKeyCombo === 'string') {
    otherKeyCombo = new KeyCombo(otherKeyCombo);
  } else {
    guard('otherKeyCombo.subCombos', otherKeyCombo.subCombos, 'array');
  }

  if (self.subCombos.length !== otherKeyCombo.subCombos.length) {
    return false;
  }
  for (var i = 0; i < self.subCombos.length; i += 1) {
    if (self.subCombos[i].length !== otherKeyCombo.subCombos[i].length) {
      return false;
    }
  }

  for (var i = 0; i < self.subCombos.length; i += 1) {
    var subCombo = self.subCombos[i];
    var otherSubCombo = otherKeyCombo.subCombos[i].slice(0);
    for (var j = 0; j < subCombo.length; j += 1) {
      var keyName = subCombo[j];
      var index = otherSubCombo.indexOf(keyName);
      if (index > -1) {
        otherSubCombo.splice(index, 1);
      }
    }
    if (otherSubCombo.length !== 0) {
      return false;
    }
  }

  return true;
};

KeyCombo.prototype._checkSubCombo = function(
  subCombo,
  startingKeyNameIndex,
  pressedKeyNames
) {
  var self = this;

  guard('subCombo', subCombo, 'array');
  guard('startingKeyNameIndex', startingKeyNameIndex, 'number');
  guard('pressedKeyNames', pressedKeyNames, 'array');

  subCombo = subCombo.slice(0);
  pressedKeyNames = pressedKeyNames.slice(startingKeyNameIndex);

  var endIndex = startingKeyNameIndex;
  for (var i = 0; i < subCombo.length; i += 1) {

    var keyName = subCombo[i];
    if (keyName[0] === '\\') {
      var escapedKeyName = keyName.slice(1);
      if (
        escapedKeyName === KeyCombo.comboDeliminator ||
        escapedKeyName === KeyCombo.keyDeliminator
      ) {
        keyName = escapedKeyName;
      }
    }

    var index = pressedKeyNames.indexOf(keyName);
    if (index > -1) {
      subCombo.splice(i, 1);
      i -= 1;
      if (index > endIndex) {
        endIndex = index;
      }
      if (subCombo.length === 0) {
        return endIndex;
      }
    }
  }
  return -1;
};


module.exports = KeyCombo;

},{"type-guard":6}],3:[function(require,module,exports){
(function (global){

// modules
var guard = require('type-guard');

// libs
var Locale = require('./locale');
var KeyCombo = require('./key-combo');


function KeyboardJS(targetWindow) {
  var self = this;

  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  self.locale = null;
  self._listeners = [];
  self._appliedListeners = [];
  self._locales = {};
  self._targetDocument = null;
  self._targetWindow = null;

  self.watch();
}

KeyboardJS.prototype.bind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, 'function');
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined' ]);

  if (typeof keyComboStr === 'string') {
    self._listeners.push({
      keyCombo: new KeyCombo(keyComboStr),
      pressHandler: pressHandler,
      releaseHandler: releaseHandler || null
    });
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.addListener = KeyboardJS.prototype.bind;
KeyboardJS.prototype.on = KeyboardJS.prototype.bind;

KeyboardJS.prototype.unbind = function(keyComboStr, pressHandler, releaseHandler) {
  var self = this;

  guard('keyComboStr', keyComboStr, [ 'string', 'array' ]);
  guard('pressHandler', pressHandler, [ 'function', 'undefined' ]);
  guard('releaseHandler', releaseHandler, [ 'function', 'undefined' ]);

  if (typeof keyComboStr === 'string') {
    for (var i = 0; i < self._listeners.length; i += 1) {
      var listener = self._listeners[i];

      var comboMatches = listener.keyCombo.isEqual(keyComboStr);
      var pressHandlerMatches = !pressHandler ||
        pressHandler === listener.pressHandler;
      var releaseHandlerMatches = listener.releaseHandler === null ||
        releaseHandler === listener.releaseHandler;

      if (comboMatches && pressHandlerMatches && releaseHandlerMatches) {
        self._listeners.splice(i, 1);
        i -= 1;
      }
    }
  } else {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      self.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
  }
};
KeyboardJS.prototype.removeListener = KeyboardJS.prototype.unbind;
KeyboardJS.prototype.off = KeyboardJS.prototype.unbind;

KeyboardJS.prototype.setLocale = function(localeName, localeBuilder) {
  var self = this;

  var locale = null;
  if (typeof localeName === 'string') {

    guard('localeName', localeName, [ 'string', 'null' ]);
    guard('localeBuilder', localeBuilder, [ 'function', 'undefined' ]);

    if (localeBuilder) {
      locale = new Locale(localeName);
      localeBuilder(locale);
    } else {
      locale = self._locales[localeName] || null;
    }
  } else {

    guard('locale', localeName, 'object');
    guard('locale.localeName', localeName.localeName, 'string');
    guard('locale.pressKey', localeName.pressKey, 'function');
    guard('locale.releaseKey', localeName.releaseKey, 'function');
    guard('locale.pressedKeys', localeName.pressedKeys, 'array');

    locale = localeName;
    localeName = locale.localeName;
  }

  self.locale = locale;
  self._locales[localeName] = locale;
};

KeyboardJS.prototype._bindEvent = function(targetElement, event, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.addEventListener(event, handler, false) :
    targetElement.attachEvent('on' + event, handler);
};

KeyboardJS.prototype._unbindEvent = function(targetElement, event, handler) {
  var self = this;
  return self._isModernBrowser ?
    targetElement.removeEventListener(event, handler, false):
    targetElement.detachEvent('on' + event, handler);
};

KeyboardJS.prototype.watch = function(targetDocument, targetWindow) {
  var self = this;

  self.stop();

  guard('targetDocument', targetDocument, [ 'object', 'undefined' ]);
  guard('targetWindow', targetWindow, [ 'object', 'undefined' ]);

  if (targetDocument && targetDocument.document && !targetWindow) {
    targetWindow = targetDocument;
  }
  if (!targetWindow) {
    targetWindow = global.window;
  }
  if (targetWindow && !targetDocument) {
    targetDocument = targetWindow.document;
  }

  if (targetDocument && targetWindow) {
    self._isModernBrowser = !!targetWindow.addEventListener;

    self._bindEvent(targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._bindEvent(targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._bindEvent(targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._bindEvent(targetWindow, 'blur', self.releaseAllKeys.bind(self));

    self._targetDocument = targetDocument;
    self._targetWindow = targetWindow;
  }
};

KeyboardJS.prototype.stop = function() {
  var self = this;
  if (self._targetDocument) {
    self._unbindEvent(self._targetDocument, 'keydown', function(event) {
      self.pressKey(event.keyCode, event);
    });
    self._unbindEvent(self._targetDocument, 'keyup', function(event) {
      self.releaseKey(event.keyCode, event);
    });
    self._targetDocument = null;
  }
  if (self._targetWindow) {
    self._unbindEvent(self._targetWindow, 'focus', self.releaseAllKeys.bind(self));
    self._unbindEvent(self._targetWindow, 'blur', self.releaseAllKeys.bind(self));
    self._targetWindow = null;
  }
};

KeyboardJS.prototype.pressKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.pressKey(keyCode);
  self._applyBindings(event);
};

KeyboardJS.prototype.releaseKey = function(keyCode, event) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);
  guard('event', event, [ 'object', 'undefined' ]);

  self.locale.releaseKey(keyCode);
  self._clearBindings(event);
};

KeyboardJS.prototype.releaseAllKeys = function() {
  var self = this;
  self.locale.pressedKeys.length = 0;
  self._clearBindings();
};

KeyboardJS.prototype.reset = function() {
  var self = this;
  self.releaseAllKeys();
  self._listeners.length = 0;
};

KeyboardJS.prototype._applyBindings = function(event) {
  var self = this;

  var pressedKeys = self.locale.pressedKeys.slice(0);
  var listeners = self._listeners.slice(0).sort(function(a, b) {
    return a.keyNames.length > b.keyNames.length;
  });

  for (var i = 0; i < listeners.length; i += 1) {
    var listener = listeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.pressHandler;
    if (keyCombo.check(pressedKeys)) {

      handler.apply(self, event);

      for (var j = 0; j < keyCombo.keyNames.length; j += 1) {
        var index = pressedKeys.indexOf(keyCombo.keyNames[j]);
        if (index !== -1) {
          pressedKeys.splice(index, 1);
          j -= 1;
        }
      }

      if (listener.releaseHandler) {
        if (self._appliedListeners.indexOf(listener) === -1) {
          self._appliedListeners.push(listener);
        }
      }
    }
  }
};

KeyboardJS.prototype._clearBindings = function(event) {
  var self = this;
  for (var i = 0; i < self._appliedListeners.length; i += 1) {
    var listener = self._appliedListeners[i];
    var keyCombo = listener.keyCombo;
    var handler = listener.releaseHandler;
    if (!keyCombo.check(self.locale.pressedKeys)) {
      handler.apply(self, event);
      self._appliedListeners.splice(i, 1);
      i -= 1;
    }
  }
};

module.exports = KeyboardJS;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./key-combo":2,"./locale":4,"type-guard":6}],4:[function(require,module,exports){

// modules
var guard = require('type-guard');

// libs
var KeyCombo = require('./key-combo');


function Locale(name) {
  var self = this;

  guard('name', name, 'string');

  self.localeName = name;
  self.pressedKeys = [];
  self._appliedMacros = [];
  self._keyMap = {};
  self._macros = [];
}

Locale.prototype.bindKeyCode = function(keyCode, keyNames) {
  var self = this;

  guard('keyCode', keyCode, 'number');
  guard('keyNames', keyNames, [ 'array', 'string' ]);

  if (typeof keyNames === 'string') {
    keyNames = [keyNames];
  }

  self._keyMap[keyCode] = keyNames;
};

Locale.prototype.bindMacro = function(keyComboStr, keyNames) {
  var self = this;

  guard('keyComboStr', keyComboStr, 'string');
  guard('keyNames', keyNames, [ 'function', 'string', 'array' ]);

  if (typeof keyNames === 'string') {
    keyNames = [ keyNames ];
  }

  var macro = {
    keyCombo: new KeyCombo(keyComboStr),
    keyNames: null,
    handler: null
  };

  if (typeof keyNames === 'function') {
    macro.handler = keyNames;
  } else {
    macro.keyNames = keyNames;
  }

  self._macros.push(macro);
};

Locale.prototype.getKeyCodes = function(keyName) {
  var self = this;

  guard('keyName', keyName, 'string');

  var keyCodes = [];
  for (var keyCode in self._keyMap) {
    var index = self._keyMap[keyCode].indexOf(keyName);
    if (index > -1) { keyCodes.push(keyCode|0); }
  }
  return keyCodes;
};

Locale.prototype.getKeyNames = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, 'number');

  return self._keyMap[keyCode] || [];
};

Locale.prototype.pressKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.pressKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      if (self.pressedKeys.indexOf(keyNames[i]) === -1) {
        self.pressedKeys.push(keyNames[i]);
      }
    }

    self._applyMacros();
  }
};

Locale.prototype.releaseKey = function(keyCode) {
  var self = this;

  guard('keyCode', keyCode, [ 'number', 'string' ]);

  if (typeof keyCode === 'string') {
    var keyCodes = self.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      self.releaseKey(keyCodes[i]);
    }
  }

  else {
    var keyNames = self.getKeyNames(keyCode);
    for (var i = 0; i < keyNames.length; i += 1) {
      var index = self.pressedKeys.indexOf(keyNames[i]);
      if (index > -1) {
        self.pressedKeys.splice(index, 1);
      }
    }

    self._clearMacros();
  }
};

Locale.prototype._applyMacros = function() {
  var self = this;

  var macros = self._macros.slice(0);
  for (var i = 0; i < macros.length; i += 1) {
    var macro = macros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        if (self.pressedKeys.indexOf(keyNames[j]) === -1) {
          self.pressedKeys.push(keyNames[j]);
        }
      }
      self._appliedMacros.push(macro);
    }
  }
};

Locale.prototype._clearMacros = function() {
  var self = this;

  for (var i = 0; i < self._appliedMacros.length; i += 1) {
    var macro = self._appliedMacros[i];
    var keyCombo = macro.keyCombo;
    var keyNames = macro.keyNames;
    if (!keyCombo.check(self.pressedKeys)) {
      for (var j = 0; j < keyNames.length; j += 1) {
        var index = self.pressedKeys.indexOf(keyNames[j]);
        if (index > -1) {
          self.pressedKeys.splice(index, 1);
        }
      }
      self._appliedMacros.splice(i, 1);
      i -= 1;
    }
  }
};


module.exports = Locale;

},{"./key-combo":2,"type-guard":6}],5:[function(require,module,exports){

// modules
var Locale = require('../lib/locale');


// create the locale
var locale = new Locale('us');

// general
locale.bindKeyCode(3, [ 'cancel' ]);
locale.bindKeyCode(8, [ 'backspace' ]);
locale.bindKeyCode(9, [ 'tab' ]);
locale.bindKeyCode(12, [ 'clear' ]);
locale.bindKeyCode(13, [ 'enter' ]);
locale.bindKeyCode(16, [ 'shift' ]);
locale.bindKeyCode(17, [ 'ctrl' ]);
locale.bindKeyCode(18, [ 'alt', 'menu' ]);
locale.bindKeyCode(19, [ 'pause', 'break' ]);
locale.bindKeyCode(20, [ 'capslock' ]);
locale.bindKeyCode(27, [ 'escape', 'esc' ]);
locale.bindKeyCode(32, [ 'space', 'spacebar' ]);
locale.bindKeyCode(33, [ 'pageup' ]);
locale.bindKeyCode(34, [ 'pagedown' ]);
locale.bindKeyCode(35, [ 'end' ]);
locale.bindKeyCode(36, [ 'home' ]);
locale.bindKeyCode(37, [ 'left' ]);
locale.bindKeyCode(38, [ 'up' ]);
locale.bindKeyCode(39, [ 'right' ]);
locale.bindKeyCode(40, [ 'down' ]);
locale.bindKeyCode(41, [ 'select' ]);
locale.bindKeyCode(42, [ 'printscreen' ]);
locale.bindKeyCode(43, [ 'execute' ]);
locale.bindKeyCode(44, [ 'snapshot' ]);
locale.bindKeyCode(45, [ 'insert', 'ins' ]);
locale.bindKeyCode(46, [ 'delete', 'del' ]);
locale.bindKeyCode(47, [ 'help' ]);
locale.bindKeyCode(91, [ 'command', 'windows', 'win', 'super', 'leftcommand', 'leftwindows', 'leftwin', 'leftsuper' ]);
locale.bindKeyCode(92, [ 'command', 'windows', 'win', 'super', 'rightcommand', 'rightwindows', 'rightwin', 'rightsuper' ]);
locale.bindKeyCode(145, [ 'scrolllock', 'scroll' ]);
locale.bindKeyCode(186, [ 'semicolon', ';' ]);
locale.bindKeyCode(187, [ 'equal', 'equalsign', '=' ]);
locale.bindKeyCode(188, [ 'comma', ',' ]);
locale.bindKeyCode(189, [ 'dash', '-' ]);
locale.bindKeyCode(190, [ 'period', '.' ]);
locale.bindKeyCode(191, [ 'slash', 'forwardslash', '/' ]);
locale.bindKeyCode(192, [ 'graveaccent', '`' ]);
locale.bindKeyCode(219, [ 'openbracket', '[' ]);
locale.bindKeyCode(220, [ 'backslash', '\\' ]);
locale.bindKeyCode(221, [ 'closebracket', ']' ]);
locale.bindKeyCode(222, [ 'apostrophe', '\'' ]);

// 0-9
locale.bindKeyCode(48, [ 'zero', '0' ]);
locale.bindKeyCode(49, [ 'one', '1' ]);
locale.bindKeyCode(50, [ 'two', '2' ]);
locale.bindKeyCode(51, [ 'three', '3' ]);
locale.bindKeyCode(52, [ 'four', '4' ]);
locale.bindKeyCode(53, [ 'five', '5' ]);
locale.bindKeyCode(54, [ 'six', '6' ]);
locale.bindKeyCode(55, [ 'seven', '7' ]);
locale.bindKeyCode(56, [ 'eight', '8' ]);
locale.bindKeyCode(57, [ 'nine', '9' ]);

// numpad
locale.bindKeyCode(96, [ 'numzero', 'num0' ]);
locale.bindKeyCode(97, [ 'numone', 'num1' ]);
locale.bindKeyCode(98, [ 'numtwo', 'num2' ]);
locale.bindKeyCode(99, [ 'numthree', 'num3' ]);
locale.bindKeyCode(100, [ 'numfour', 'num4' ]);
locale.bindKeyCode(101, [ 'numfive', 'num5' ]);
locale.bindKeyCode(102, [ 'numsix', 'num6' ]);
locale.bindKeyCode(103, [ 'numseven', 'num7' ]);
locale.bindKeyCode(104, [ 'numeight', 'num8' ]);
locale.bindKeyCode(105, [ 'numnine', 'num9' ]);
locale.bindKeyCode(106, [ 'nummultiply', 'num*' ]);
locale.bindKeyCode(107, [ 'numadd', 'num+' ]);
locale.bindKeyCode(108, [ 'numenter' ]);
locale.bindKeyCode(109, [ 'numsubtract', 'num-' ]);
locale.bindKeyCode(110, [ 'numdecimal', 'num.' ]);
locale.bindKeyCode(111, [ 'numdivide', 'num/' ]);
locale.bindKeyCode(144, [ 'numlock', 'num' ]);

// function keys
locale.bindKeyCode(112, [ 'f1' ]);
locale.bindKeyCode(113, [ 'f2' ]);
locale.bindKeyCode(114, [ 'f3' ]);
locale.bindKeyCode(115, [ 'f4' ]);
locale.bindKeyCode(116, [ 'f5' ]);
locale.bindKeyCode(117, [ 'f6' ]);
locale.bindKeyCode(118, [ 'f7' ]);
locale.bindKeyCode(119, [ 'f8' ]);
locale.bindKeyCode(120, [ 'f9' ]);
locale.bindKeyCode(121, [ 'f10' ]);
locale.bindKeyCode(122, [ 'f11' ]);
locale.bindKeyCode(123, [ 'f12' ]);

// secondary key symbols
locale.bindMacro('shift + `', [ 'tilde', '~' ]);
locale.bindMacro('shift + 1', [ 'exclamation', 'exclamationpoint', '!' ]);
locale.bindMacro('shift + 2', [ 'at', '@' ]);
locale.bindMacro('shift + 3', [ 'number', '#' ]);
locale.bindMacro('shift + 4', [ 'dollar', 'dollars', 'dollarsign', '$' ]);
locale.bindMacro('shift + 5', [ 'percent', '%' ]);
locale.bindMacro('shift + 6', [ 'caret', '^' ]);
locale.bindMacro('shift + 7', [ 'ampersand', 'and', '&' ]);
locale.bindMacro('shift + 8', [ 'asterisk', '*' ]);
locale.bindMacro('shift + 9', [ 'openparen', '(' ]);
locale.bindMacro('shift + 0', [ 'closeparen', ')' ]);
locale.bindMacro('shift + -', [ 'underscore', '_' ]);
locale.bindMacro('shift + =', [ 'plus', '+' ]);
locale.bindMacro('shift + [', [ 'opencurlybrace', 'opencurlybracket', '{' ]);
locale.bindMacro('shift + ]', [ 'closecurlybrace', 'closecurlybracket', '}' ]);
locale.bindMacro('shift + \\', [ 'verticalbar', '|' ]);
locale.bindMacro('shift + ;', [ 'colon', ':' ]);
locale.bindMacro('shift + \'', [ 'quotationmark', '\'' ]);
locale.bindMacro('shift + !,', [ 'openanglebracket', '<' ]);
locale.bindMacro('shift + .', [ 'closeanglebracket', '>' ]);
locale.bindMacro('shift + /', [ 'questionmark', '?' ]);

//a-z and A-Z
for (var keyCode = 65; keyCode <= 90; keyCode += 1) {
  var keyName = String.fromCharCode(keyCode + 32);
  var capitalKeyName = String.fromCharCode(keyCode);
	locale.bindKeyCode(keyCode, keyName);
	locale.bindMacro('shift + ' + keyName, capitalKeyName);
	locale.bindMacro('capslock + ' + keyName, capitalKeyName);
}


module.exports = locale;

},{"../lib/locale":4}],6:[function(require,module,exports){


// libs
var GuardError = require('./lib/guard-error');
var guard = require('./lib/guard');


exports = module.exports = function(    ) {
  return guard.check.apply(guard, arguments);
};
exports.GuardError = GuardError;
exports.guard = guard;
exports.types = guard.types;

},{"./lib/guard":8,"./lib/guard-error":7}],7:[function(require,module,exports){

// modules
var inherits = require('inherits');


function GuardError(message, fileName, lineNumber) {
  Error.call(this, message, fileName, lineNumber);

  this.message = message;
  this.name = this.constructor.name;
  if (fileName) { this.fileName = fileName; }
  if (lineNumber) { this.lineNumber = lineNumber; }

  Error.captureStackTrace(this, this.constructor);
  this._setStackOffset(1);
}
inherits(GuardError, Error);

GuardError.prototype._setStackOffset = function(stackOffset) {
  try {
    throw new Error();
  } catch(dummyErr) {
    var firstLine = this.stack.split('\n')[0];
    var lines = dummyErr.stack.split('\n');
    var line = lines[stackOffset + 2];
    var lineChunks = line.match(/\(([^\)]+)\)/)[1].split(':');
    this.stack = [firstLine].concat(lines.slice(stackOffset + 2)).join('\n');
    this.fileName = lineChunks[0];
    this.lineNumber = lineChunks[1];
    this.columnNumber = lineChunks[2];
  }
};


module.exports = GuardError;

},{"inherits":9}],8:[function(require,module,exports){

// libs
var GuardError = require('./guard-error');


exports.types = [
  'object',
  'string',
  'boolean',
  'number',
  'array',
  'regexp',
  'date',
  'stream',
  'read-stream',
  'write-stream',
  'emitter',
  'function',
  'null',
  'undefined'
];

exports.check = function(key, val, type) {
  var self = this;

  if (typeof key !== 'string') {
    throw new TypeError('key must be a string');
  }
  if (typeof type !== 'string' && (
    type === null ||
    typeof type !== 'object' ||
    typeof type.length !== 'number'
  )) {
    throw new TypeError('type must be a string or array');
  }

  var typeErr = self._validateType(type);
  if (typeErr) {
    typeErr._setStackOffset(self._stackOffset);
    throw typeErr;
  }

  var valErr = self._validateVal(key, type, val);
  if (valErr) {
    valErr._setStackOffset(self._stackOffset);
    throw valErr;
  }

  return null;
};

exports._validateType = function(type) {
  var self = this;

  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    for (var i = 0; i < type.length; i += 1) {
      var err = self._validateType(type[i]);
      if (err) { return err; }
    }
    return null;
  }
  if (self.types.indexOf(type) === -1) {
    return new GuardError(
      'type must be one of the following values: ' + self.types.join(', ')
    );
  }
};

// validates the value against the type
exports._validateVal = function(key, type, val) {
  var self = this;

  // recursive
  if (
    type !== null &&
    typeof type === 'object' &&
    typeof type.length === 'number'
  ) {
    var ok = false;
    for (var i = 0; i < type.length; i += 1) {
      if (!self._validateVal(key, type[i], val)) {
        ok = true;
        break;
      }
    }
    if (ok) {
      return null;
    } else {
      return new GuardError(
        key + ' must be one of the following types: ' + type.join(', ')
      );
    }
  }

  // object
  if (type === 'object' && (
    val === null ||
    typeof val !== 'object'
  )) {
    return new GuardError(key + ' must be an object');
  }

  // string
  else if (type === 'string' && typeof val !== 'string') {
    return new GuardError(key + ' must be a string');
  }

  // boolean
  else if (type === 'boolean' && typeof val !== 'boolean') {
    return new GuardError(key + ' must be a boolean');
  }

  // number
  else if (type === 'number' && typeof val !== 'number') {
    return new GuardError(key + ' must be a number');
  }

  // array
  else if (type === 'array' && (
    val === null ||
    typeof val !== 'object' ||
    typeof val.length !== 'number'
  )) {
    return new GuardError(key + ' must be an array');
  }

  // regex
  else if (type === 'regexp' && val.constructor !== RegExp) {
    return new GuardError(key + ' must be a regexp');
  }

  // date
  else if (type === 'date' && val.constructor !== Date) {
    return new GuardError(key + ' must be a date');
  }

  // emitter
  else if (type === 'emitter' && (
    typeof val.addListener !== 'function' ||
    typeof val.emit !== 'function'
  )) {
    return new GuardError(key + ' must be an emitter');
  }

  // stream
  else if (type === 'stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function'
  )) {
    return new GuardError(key + ' must be a stream');
  }

  // read stream
  else if (type === 'read-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.read !== 'function'
  )) {
    return new GuardError(key + ' must be a read-stream');
  }

  // write stream
  else if (type === 'write-stream' && (
    typeof val.on !== 'function' ||
    typeof val.pipe !== 'function' ||
    typeof val.write !== 'function' ||
    typeof val.end !== 'function'
  )) {
    return new GuardError(key + ' must be a write-stream');
  }

  // function
  else if (type === 'function' && typeof val !== 'function') {
    return new GuardError(key + ' must be a function');
  }

  // null
  else if (type === 'null' && val !== null) {
    return new GuardError(key + ' must be a null');
  }

  // undefined
  else if (type === 'undefined' && val !== undefined) {
    return new GuardError(key + ' must be a undefined');
  }

  return null;
};

exports._stackOffset = 2;


},{"./guard-error":7}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9rZXktY29tYm8uanMiLCJsaWIva2V5Ym9hcmQuanMiLCJsaWIvbG9jYWxlLmpzIiwibG9jYWxlcy91cy5qcyIsIm5vZGVfbW9kdWxlcy90eXBlLWd1YXJkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLWVycm9yLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbGliL2d1YXJkLmpzIiwibm9kZV9tb2R1bGVzL3R5cGUtZ3VhcmQvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vLyBsaWJzXG52YXIgS2V5Ym9hcmRKUyA9IHJlcXVpcmUoJy4vbGliL2tleWJvYXJkJyk7XG52YXIgTG9jYWxlID0gcmVxdWlyZSgnLi9saWIvbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2xpYi9rZXktY29tYm8nKTtcbnZhciB1c0xvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlcy91cycpO1xuXG52YXIga2V5Ym9hcmRKUyA9IG5ldyBLZXlib2FyZEpTKCk7XG5rZXlib2FyZEpTLnNldExvY2FsZSh1c0xvY2FsZSk7XG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGtleWJvYXJkSlM7XG5leHBvcnRzLktleWJvYXJkSlMgPSBLZXlib2FyZEpTO1xuZXhwb3J0cy5Mb2NhbGUgPSBMb2NhbGU7XG5leHBvcnRzLktleUNvbWJvID0gS2V5Q29tYm87XG4iLCJcbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuXG5mdW5jdGlvbiBLZXlDb21ibyhrZXlDb21ib1N0cikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcblxuICBzZWxmLnNvdXJjZVN0ciA9IGtleUNvbWJvU3RyO1xuICBzZWxmLnN1YkNvbWJvcyA9IEtleUNvbWJvLnBhcnNlQ29tYm9TdHIoa2V5Q29tYm9TdHIpO1xuICBzZWxmLmtleU5hbWVzID0gc2VsZi5zdWJDb21ib3MucmVkdWNlKGZ1bmN0aW9uKG1lbW8sIG5leHRTdWJDb21ibykge1xuICAgIHJldHVybiBtZW1vLmNvbmNhdChuZXh0U3ViQ29tYm8pO1xuICB9KTtcbn1cblxuS2V5Q29tYm8uY29tYm9EZWxpbWluYXRvciA9ICc+JztcbktleUNvbWJvLmtleURlbGltaW5hdG9yID0gJysnO1xuXG5LZXlDb21iby5wYXJzZUNvbWJvU3RyID0gZnVuY3Rpb24oa2V5Q29tYm9TdHIpIHtcbiAgZ3VhcmQoJ2tleUNvbWJvU3RyJywga2V5Q29tYm9TdHIsICdzdHJpbmcnKTtcblxuICB2YXIgc3ViQ29tYm9TdHJzID0gS2V5Q29tYm8uX3NwbGl0U3RyKGtleUNvbWJvU3RyLCBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yKTtcbiAgdmFyIGNvbWJvID0gW107XG4gIGZvciAodmFyIGkgPSAwIDsgaSA8IHN1YkNvbWJvU3Rycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbWJvLnB1c2goS2V5Q29tYm8uX3NwbGl0U3RyKHN1YkNvbWJvU3Ryc1tpXSwgS2V5Q29tYm8ua2V5RGVsaW1pbmF0b3IpKTtcbiAgfVxuICByZXR1cm4gY29tYm87XG59O1xuXG5LZXlDb21iby5fc3BsaXRTdHIgPSBmdW5jdGlvbihzdHIsIGRlbGltaW5hdG9yKSB7XG4gIHZhciBzID0gc3RyO1xuICB2YXIgZCA9IGRlbGltaW5hdG9yO1xuICB2YXIgYyA9ICcnO1xuICB2YXIgY2EgPSBbXTtcblxuICBmb3IgKHZhciBjaSA9IDA7IGNpIDwgcy5sZW5ndGg7IGNpICs9IDEpIHtcbiAgICBpZiAoY2kgPiAwICYmIHNbY2ldID09PSBkICYmIHNbY2kgLSAxXSAhPT0gJ1xcXFwnKSB7XG4gICAgICBjYS5wdXNoKGMudHJpbSgpKTtcbiAgICAgIGMgPSAnJztcbiAgICAgIGNpICs9IDE7XG4gICAgfVxuICAgIGMgKz0gc1tjaV07XG4gIH1cbiAgaWYgKGMpIHsgY2EucHVzaChjLnRyaW0oKSk7IH1cblxuICByZXR1cm4gY2E7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbihwcmVzc2VkS2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdwcmVzc2VkS2V5TmFtZXMnLCBwcmVzc2VkS2V5TmFtZXMsICdhcnJheScpO1xuXG4gIHZhciBzdGFydGluZ0tleU5hbWVJbmRleCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5zdWJDb21ib3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBzdGFydGluZ0tleU5hbWVJbmRleCA9IHNlbGYuX2NoZWNrU3ViQ29tYm8oXG4gICAgICBzZWxmLnN1YkNvbWJvc1tpXSxcbiAgICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICAgICAgcHJlc3NlZEtleU5hbWVzXG4gICAgKTtcbiAgICBpZiAoc3RhcnRpbmdLZXlOYW1lSW5kZXggPT09IC0xKSB7IHJldHVybiBmYWxzZTsgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuS2V5Q29tYm8ucHJvdG90eXBlLmlzRXF1YWwgPSBmdW5jdGlvbihvdGhlcktleUNvbWJvKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgnb3RoZXJLZXlDb21ibycsIG90aGVyS2V5Q29tYm8sIFsgJ29iamVjdCcsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Ygb3RoZXJLZXlDb21ibyA9PT0gJ3N0cmluZycpIHtcbiAgICBvdGhlcktleUNvbWJvID0gbmV3IEtleUNvbWJvKG90aGVyS2V5Q29tYm8pO1xuICB9IGVsc2Uge1xuICAgIGd1YXJkKCdvdGhlcktleUNvbWJvLnN1YkNvbWJvcycsIG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLCAnYXJyYXknKTtcbiAgfVxuXG4gIGlmIChzZWxmLnN1YkNvbWJvcy5sZW5ndGggIT09IG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHNlbGYuc3ViQ29tYm9zW2ldLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBzdWJDb21ibyA9IHNlbGYuc3ViQ29tYm9zW2ldO1xuICAgIHZhciBvdGhlclN1YkNvbWJvID0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0uc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdWJDb21iby5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgdmFyIGtleU5hbWUgPSBzdWJDb21ib1tqXTtcbiAgICAgIHZhciBpbmRleCA9IG90aGVyU3ViQ29tYm8uaW5kZXhPZihrZXlOYW1lKTtcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIG90aGVyU3ViQ29tYm8uc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG90aGVyU3ViQ29tYm8ubGVuZ3RoICE9PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuX2NoZWNrU3ViQ29tYm8gPSBmdW5jdGlvbihcbiAgc3ViQ29tYm8sXG4gIHN0YXJ0aW5nS2V5TmFtZUluZGV4LFxuICBwcmVzc2VkS2V5TmFtZXNcbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ3N1YkNvbWJvJywgc3ViQ29tYm8sICdhcnJheScpO1xuICBndWFyZCgnc3RhcnRpbmdLZXlOYW1lSW5kZXgnLCBzdGFydGluZ0tleU5hbWVJbmRleCwgJ251bWJlcicpO1xuICBndWFyZCgncHJlc3NlZEtleU5hbWVzJywgcHJlc3NlZEtleU5hbWVzLCAnYXJyYXknKTtcblxuICBzdWJDb21ibyA9IHN1YkNvbWJvLnNsaWNlKDApO1xuICBwcmVzc2VkS2V5TmFtZXMgPSBwcmVzc2VkS2V5TmFtZXMuc2xpY2Uoc3RhcnRpbmdLZXlOYW1lSW5kZXgpO1xuXG4gIHZhciBlbmRJbmRleCA9IHN0YXJ0aW5nS2V5TmFtZUluZGV4O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN1YkNvbWJvLmxlbmd0aDsgaSArPSAxKSB7XG5cbiAgICB2YXIga2V5TmFtZSA9IHN1YkNvbWJvW2ldO1xuICAgIGlmIChrZXlOYW1lWzBdID09PSAnXFxcXCcpIHtcbiAgICAgIHZhciBlc2NhcGVkS2V5TmFtZSA9IGtleU5hbWUuc2xpY2UoMSk7XG4gICAgICBpZiAoXG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yIHx8XG4gICAgICAgIGVzY2FwZWRLZXlOYW1lID09PSBLZXlDb21iby5rZXlEZWxpbWluYXRvclxuICAgICAgKSB7XG4gICAgICAgIGtleU5hbWUgPSBlc2NhcGVkS2V5TmFtZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBwcmVzc2VkS2V5TmFtZXMuaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgc3ViQ29tYm8uc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgICAgaWYgKGluZGV4ID4gZW5kSW5kZXgpIHtcbiAgICAgICAgZW5kSW5kZXggPSBpbmRleDtcbiAgICAgIH1cbiAgICAgIGlmIChzdWJDb21iby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVuZEluZGV4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Q29tYm87XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cbi8vIG1vZHVsZXNcbnZhciBndWFyZCA9IHJlcXVpcmUoJ3R5cGUtZ3VhcmQnKTtcblxuLy8gbGlic1xudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIEtleWJvYXJkSlModGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgndGFyZ2V0V2luZG93JywgdGFyZ2V0V2luZG93LCBbICdvYmplY3QnLCAndW5kZWZpbmVkJyBdKTtcblxuICBzZWxmLmxvY2FsZSA9IG51bGw7XG4gIHNlbGYuX2xpc3RlbmVycyA9IFtdO1xuICBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzID0gW107XG4gIHNlbGYuX2xvY2FsZXMgPSB7fTtcbiAgc2VsZi5fdGFyZ2V0RG9jdW1lbnQgPSBudWxsO1xuICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuXG4gIHNlbGYud2F0Y2goKTtcbn1cblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgWyAnc3RyaW5nJywgJ2FycmF5JyBdKTtcbiAgZ3VhcmQoJ3ByZXNzSGFuZGxlcicsIHByZXNzSGFuZGxlciwgJ2Z1bmN0aW9uJyk7XG4gIGd1YXJkKCdyZWxlYXNlSGFuZGxlcicsIHJlbGVhc2VIYW5kbGVyLCBbICdmdW5jdGlvbicsICd1bmRlZmluZWQnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VsZi5fbGlzdGVuZXJzLnB1c2goe1xuICAgICAga2V5Q29tYm86IG5ldyBLZXlDb21ibyhrZXlDb21ib1N0ciksXG4gICAgICBwcmVzc0hhbmRsZXI6IHByZXNzSGFuZGxlcixcbiAgICAgIHJlbGVhc2VIYW5kbGVyOiByZWxlYXNlSGFuZGxlciB8fCBudWxsXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb21ib1N0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5iaW5kKGtleUNvbWJvU3RyW2ldLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKTtcbiAgICB9XG4gIH1cbn07XG5LZXlib2FyZEpTLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEtleWJvYXJkSlMucHJvdG90eXBlLmJpbmQ7XG5LZXlib2FyZEpTLnByb3RvdHlwZS5vbiA9IEtleWJvYXJkSlMucHJvdG90eXBlLmJpbmQ7XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29tYm9TdHInLCBrZXlDb21ib1N0ciwgWyAnc3RyaW5nJywgJ2FycmF5JyBdKTtcbiAgZ3VhcmQoJ3ByZXNzSGFuZGxlcicsIHByZXNzSGFuZGxlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcbiAgZ3VhcmQoJ3JlbGVhc2VIYW5kbGVyJywgcmVsZWFzZUhhbmRsZXIsIFsgJ2Z1bmN0aW9uJywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgaWYgKHR5cGVvZiBrZXlDb21ib1N0ciA9PT0gJ3N0cmluZycpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2xpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIGxpc3RlbmVyID0gc2VsZi5fbGlzdGVuZXJzW2ldO1xuXG4gICAgICB2YXIgY29tYm9NYXRjaGVzID0gbGlzdGVuZXIua2V5Q29tYm8uaXNFcXVhbChrZXlDb21ib1N0cik7XG4gICAgICB2YXIgcHJlc3NIYW5kbGVyTWF0Y2hlcyA9ICFwcmVzc0hhbmRsZXIgfHxcbiAgICAgICAgcHJlc3NIYW5kbGVyID09PSBsaXN0ZW5lci5wcmVzc0hhbmRsZXI7XG4gICAgICB2YXIgcmVsZWFzZUhhbmRsZXJNYXRjaGVzID0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXIgPT09IG51bGwgfHxcbiAgICAgICAgcmVsZWFzZUhhbmRsZXIgPT09IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyO1xuXG4gICAgICBpZiAoY29tYm9NYXRjaGVzICYmIHByZXNzSGFuZGxlck1hdGNoZXMgJiYgcmVsZWFzZUhhbmRsZXJNYXRjaGVzKSB7XG4gICAgICAgIHNlbGYuX2xpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGkgLT0gMTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb21ib1N0ci5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgc2VsZi5iaW5kKGtleUNvbWJvU3RyW2ldLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKTtcbiAgICB9XG4gIH1cbn07XG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcbktleWJvYXJkSlMucHJvdG90eXBlLm9mZiA9IEtleWJvYXJkSlMucHJvdG90eXBlLnVuYmluZDtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuc2V0TG9jYWxlID0gZnVuY3Rpb24obG9jYWxlTmFtZSwgbG9jYWxlQnVpbGRlcikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIGxvY2FsZSA9IG51bGw7XG4gIGlmICh0eXBlb2YgbG9jYWxlTmFtZSA9PT0gJ3N0cmluZycpIHtcblxuICAgIGd1YXJkKCdsb2NhbGVOYW1lJywgbG9jYWxlTmFtZSwgWyAnc3RyaW5nJywgJ251bGwnIF0pO1xuICAgIGd1YXJkKCdsb2NhbGVCdWlsZGVyJywgbG9jYWxlQnVpbGRlciwgWyAnZnVuY3Rpb24nLCAndW5kZWZpbmVkJyBdKTtcblxuICAgIGlmIChsb2NhbGVCdWlsZGVyKSB7XG4gICAgICBsb2NhbGUgPSBuZXcgTG9jYWxlKGxvY2FsZU5hbWUpO1xuICAgICAgbG9jYWxlQnVpbGRlcihsb2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbGUgPSBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdIHx8IG51bGw7XG4gICAgfVxuICB9IGVsc2Uge1xuXG4gICAgZ3VhcmQoJ2xvY2FsZScsIGxvY2FsZU5hbWUsICdvYmplY3QnKTtcbiAgICBndWFyZCgnbG9jYWxlLmxvY2FsZU5hbWUnLCBsb2NhbGVOYW1lLmxvY2FsZU5hbWUsICdzdHJpbmcnKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzS2V5JywgbG9jYWxlTmFtZS5wcmVzc0tleSwgJ2Z1bmN0aW9uJyk7XG4gICAgZ3VhcmQoJ2xvY2FsZS5yZWxlYXNlS2V5JywgbG9jYWxlTmFtZS5yZWxlYXNlS2V5LCAnZnVuY3Rpb24nKTtcbiAgICBndWFyZCgnbG9jYWxlLnByZXNzZWRLZXlzJywgbG9jYWxlTmFtZS5wcmVzc2VkS2V5cywgJ2FycmF5Jyk7XG5cbiAgICBsb2NhbGUgPSBsb2NhbGVOYW1lO1xuICAgIGxvY2FsZU5hbWUgPSBsb2NhbGUubG9jYWxlTmFtZTtcbiAgfVxuXG4gIHNlbGYubG9jYWxlID0gbG9jYWxlO1xuICBzZWxmLl9sb2NhbGVzW2xvY2FsZU5hbWVdID0gbG9jYWxlO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUuX2JpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSkgOlxuICAgIHRhcmdldEVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50LCBoYW5kbGVyKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl91bmJpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50LCBoYW5kbGVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2lzTW9kZXJuQnJvd3NlciA/XG4gICAgdGFyZ2V0RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyLCBmYWxzZSk6XG4gICAgdGFyZ2V0RWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgZXZlbnQsIGhhbmRsZXIpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbih0YXJnZXREb2N1bWVudCwgdGFyZ2V0V2luZG93KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBzZWxmLnN0b3AoKTtcblxuICBndWFyZCgndGFyZ2V0RG9jdW1lbnQnLCB0YXJnZXREb2N1bWVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG4gIGd1YXJkKCd0YXJnZXRXaW5kb3cnLCB0YXJnZXRXaW5kb3csIFsgJ29iamVjdCcsICd1bmRlZmluZWQnIF0pO1xuXG4gIGlmICh0YXJnZXREb2N1bWVudCAmJiB0YXJnZXREb2N1bWVudC5kb2N1bWVudCAmJiAhdGFyZ2V0V2luZG93KSB7XG4gICAgdGFyZ2V0V2luZG93ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gIH1cbiAgaWYgKCF0YXJnZXRXaW5kb3cpIHtcbiAgICB0YXJnZXRXaW5kb3cgPSBnbG9iYWwud2luZG93O1xuICB9XG4gIGlmICh0YXJnZXRXaW5kb3cgJiYgIXRhcmdldERvY3VtZW50KSB7XG4gICAgdGFyZ2V0RG9jdW1lbnQgPSB0YXJnZXRXaW5kb3cuZG9jdW1lbnQ7XG4gIH1cblxuICBpZiAodGFyZ2V0RG9jdW1lbnQgJiYgdGFyZ2V0V2luZG93KSB7XG4gICAgc2VsZi5faXNNb2Rlcm5Ccm93c2VyID0gISF0YXJnZXRXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcjtcblxuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXREb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5wcmVzc0tleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gICAgfSk7XG4gICAgc2VsZi5fYmluZEV2ZW50KHRhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAnZm9jdXMnLCBzZWxmLnJlbGVhc2VBbGxLZXlzLmJpbmQoc2VsZikpO1xuICAgIHNlbGYuX2JpbmRFdmVudCh0YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcblxuICAgIHNlbGYuX3RhcmdldERvY3VtZW50ID0gdGFyZ2V0RG9jdW1lbnQ7XG4gICAgc2VsZi5fdGFyZ2V0V2luZG93ID0gdGFyZ2V0V2luZG93O1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3RhcmdldERvY3VtZW50KSB7XG4gICAgc2VsZi5fdW5iaW5kRXZlbnQoc2VsZi5fdGFyZ2V0RG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIH0pO1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldERvY3VtZW50LCAna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgc2VsZi5yZWxlYXNlS2V5KGV2ZW50LmtleUNvZGUsIGV2ZW50KTtcbiAgICB9KTtcbiAgICBzZWxmLl90YXJnZXREb2N1bWVudCA9IG51bGw7XG4gIH1cbiAgaWYgKHNlbGYuX3RhcmdldFdpbmRvdykge1xuICAgIHNlbGYuX3VuYmluZEV2ZW50KHNlbGYuX3RhcmdldFdpbmRvdywgJ2ZvY3VzJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl91bmJpbmRFdmVudChzZWxmLl90YXJnZXRXaW5kb3csICdibHVyJywgc2VsZi5yZWxlYXNlQWxsS2V5cy5iaW5kKHNlbGYpKTtcbiAgICBzZWxmLl90YXJnZXRXaW5kb3cgPSBudWxsO1xuICB9XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5wcmVzc0tleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuICBndWFyZCgnZXZlbnQnLCBldmVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgc2VsZi5sb2NhbGUucHJlc3NLZXkoa2V5Q29kZSk7XG4gIHNlbGYuX2FwcGx5QmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmRKUy5wcm90b3R5cGUucmVsZWFzZUtleSA9IGZ1bmN0aW9uKGtleUNvZGUsIGV2ZW50KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuICBndWFyZCgnZXZlbnQnLCBldmVudCwgWyAnb2JqZWN0JywgJ3VuZGVmaW5lZCcgXSk7XG5cbiAgc2VsZi5sb2NhbGUucmVsZWFzZUtleShrZXlDb2RlKTtcbiAgc2VsZi5fY2xlYXJCaW5kaW5ncyhldmVudCk7XG59O1xuXG5LZXlib2FyZEpTLnByb3RvdHlwZS5yZWxlYXNlQWxsS2V5cyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYubG9jYWxlLnByZXNzZWRLZXlzLmxlbmd0aCA9IDA7XG4gIHNlbGYuX2NsZWFyQmluZGluZ3MoKTtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5yZWxlYXNlQWxsS2V5cygpO1xuICBzZWxmLl9saXN0ZW5lcnMubGVuZ3RoID0gMDtcbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl9hcHBseUJpbmRpbmdzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBwcmVzc2VkS2V5cyA9IHNlbGYubG9jYWxlLnByZXNzZWRLZXlzLnNsaWNlKDApO1xuICB2YXIgbGlzdGVuZXJzID0gc2VsZi5fbGlzdGVuZXJzLnNsaWNlKDApLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLmtleU5hbWVzLmxlbmd0aCA+IGIua2V5TmFtZXMubGVuZ3RoO1xuICB9KTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lciA9IGxpc3RlbmVyc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBsaXN0ZW5lci5rZXlDb21ibztcbiAgICB2YXIgaGFuZGxlciA9IGxpc3RlbmVyLnByZXNzSGFuZGxlcjtcbiAgICBpZiAoa2V5Q29tYm8uY2hlY2socHJlc3NlZEtleXMpKSB7XG5cbiAgICAgIGhhbmRsZXIuYXBwbHkoc2VsZiwgZXZlbnQpO1xuXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleUNvbWJvLmtleU5hbWVzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHByZXNzZWRLZXlzLmluZGV4T2Yoa2V5Q29tYm8ua2V5TmFtZXNbal0pO1xuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgcHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICBqIC09IDE7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyKSB7XG4gICAgICAgIGlmIChzZWxmLl9hcHBsaWVkTGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpID09PSAtMSkge1xuICAgICAgICAgIHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbktleWJvYXJkSlMucHJvdG90eXBlLl9jbGVhckJpbmRpbmdzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlbGYuX2FwcGxpZWRMaXN0ZW5lcnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBzZWxmLl9hcHBsaWVkTGlzdGVuZXJzW2ldO1xuICAgIHZhciBrZXlDb21ibyA9IGxpc3RlbmVyLmtleUNvbWJvO1xuICAgIHZhciBoYW5kbGVyID0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXI7XG4gICAgaWYgKCFrZXlDb21iby5jaGVjayhzZWxmLmxvY2FsZS5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGhhbmRsZXIuYXBwbHkoc2VsZiwgZXZlbnQpO1xuICAgICAgc2VsZi5fYXBwbGllZExpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEtleWJvYXJkSlM7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlxuLy8gbW9kdWxlc1xudmFyIGd1YXJkID0gcmVxdWlyZSgndHlwZS1ndWFyZCcpO1xuXG4vLyBsaWJzXG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIExvY2FsZShuYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgnbmFtZScsIG5hbWUsICdzdHJpbmcnKTtcblxuICBzZWxmLmxvY2FsZU5hbWUgPSBuYW1lO1xuICBzZWxmLnByZXNzZWRLZXlzID0gW107XG4gIHNlbGYuX2FwcGxpZWRNYWNyb3MgPSBbXTtcbiAgc2VsZi5fa2V5TWFwID0ge307XG4gIHNlbGYuX21hY3JvcyA9IFtdO1xufVxuXG5Mb2NhbGUucHJvdG90eXBlLmJpbmRLZXlDb2RlID0gZnVuY3Rpb24oa2V5Q29kZSwga2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb2RlJywga2V5Q29kZSwgJ251bWJlcicpO1xuICBndWFyZCgna2V5TmFtZXMnLCBrZXlOYW1lcywgWyAnYXJyYXknLCAnc3RyaW5nJyBdKTtcblxuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnc3RyaW5nJykge1xuICAgIGtleU5hbWVzID0gW2tleU5hbWVzXTtcbiAgfVxuXG4gIHNlbGYuX2tleU1hcFtrZXlDb2RlXSA9IGtleU5hbWVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5iaW5kTWFjcm8gPSBmdW5jdGlvbihrZXlDb21ib1N0ciwga2V5TmFtZXMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGd1YXJkKCdrZXlDb21ib1N0cicsIGtleUNvbWJvU3RyLCAnc3RyaW5nJyk7XG4gIGd1YXJkKCdrZXlOYW1lcycsIGtleU5hbWVzLCBbICdmdW5jdGlvbicsICdzdHJpbmcnLCAnYXJyYXknIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5TmFtZXMgPT09ICdzdHJpbmcnKSB7XG4gICAga2V5TmFtZXMgPSBbIGtleU5hbWVzIF07XG4gIH1cblxuICB2YXIgbWFjcm8gPSB7XG4gICAga2V5Q29tYm86IG5ldyBLZXlDb21ibyhrZXlDb21ib1N0ciksXG4gICAga2V5TmFtZXM6IG51bGwsXG4gICAgaGFuZGxlcjogbnVsbFxuICB9O1xuXG4gIGlmICh0eXBlb2Yga2V5TmFtZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICBtYWNyby5oYW5kbGVyID0ga2V5TmFtZXM7XG4gIH0gZWxzZSB7XG4gICAgbWFjcm8ua2V5TmFtZXMgPSBrZXlOYW1lcztcbiAgfVxuXG4gIHNlbGYuX21hY3Jvcy5wdXNoKG1hY3JvKTtcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuZ2V0S2V5Q29kZXMgPSBmdW5jdGlvbihrZXlOYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5TmFtZScsIGtleU5hbWUsICdzdHJpbmcnKTtcblxuICB2YXIga2V5Q29kZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5Q29kZSBpbiBzZWxmLl9rZXlNYXApIHtcbiAgICB2YXIgaW5kZXggPSBzZWxmLl9rZXlNYXBba2V5Q29kZV0uaW5kZXhPZihrZXlOYW1lKTtcbiAgICBpZiAoaW5kZXggPiAtMSkgeyBrZXlDb2Rlcy5wdXNoKGtleUNvZGV8MCk7IH1cbiAgfVxuICByZXR1cm4ga2V5Q29kZXM7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLmdldEtleU5hbWVzID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCAnbnVtYmVyJyk7XG5cbiAgcmV0dXJuIHNlbGYuX2tleU1hcFtrZXlDb2RlXSB8fCBbXTtcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUucHJlc3NLZXkgPSBmdW5jdGlvbihrZXlDb2RlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBndWFyZCgna2V5Q29kZScsIGtleUNvZGUsIFsgJ251bWJlcicsICdzdHJpbmcnIF0pO1xuXG4gIGlmICh0eXBlb2Yga2V5Q29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YXIga2V5Q29kZXMgPSBzZWxmLmdldEtleUNvZGVzKGtleUNvZGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29kZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHNlbGYucHJlc3NLZXkoa2V5Q29kZXNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHZhciBrZXlOYW1lcyA9IHNlbGYuZ2V0S2V5TmFtZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlOYW1lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tpXSkgPT09IC0xKSB7XG4gICAgICAgIHNlbGYucHJlc3NlZEtleXMucHVzaChrZXlOYW1lc1tpXSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZi5fYXBwbHlNYWNyb3MoKTtcbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZ3VhcmQoJ2tleUNvZGUnLCBrZXlDb2RlLCBbICdudW1iZXInLCAnc3RyaW5nJyBdKTtcblxuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gc2VsZi5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICBzZWxmLnJlbGVhc2VLZXkoa2V5Q29kZXNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHZhciBrZXlOYW1lcyA9IHNlbGYuZ2V0S2V5TmFtZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlOYW1lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIGluZGV4ID0gc2VsZi5wcmVzc2VkS2V5cy5pbmRleE9mKGtleU5hbWVzW2ldKTtcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHNlbGYucHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBzZWxmLl9jbGVhck1hY3JvcygpO1xuICB9XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLl9hcHBseU1hY3JvcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIG1hY3JvcyA9IHNlbGYuX21hY3Jvcy5zbGljZSgwKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYWNyb3MubGVuZ3RoOyBpICs9IDEpIHtcbiAgICB2YXIgbWFjcm8gPSBtYWNyb3NbaV07XG4gICAgdmFyIGtleUNvbWJvID0gbWFjcm8ua2V5Q29tYm87XG4gICAgdmFyIGtleU5hbWVzID0gbWFjcm8ua2V5TmFtZXM7XG4gICAgaWYgKGtleUNvbWJvLmNoZWNrKHNlbGYucHJlc3NlZEtleXMpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleU5hbWVzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIGlmIChzZWxmLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbal0pID09PSAtMSkge1xuICAgICAgICAgIHNlbGYucHJlc3NlZEtleXMucHVzaChrZXlOYW1lc1tqXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlbGYuX2FwcGxpZWRNYWNyb3MucHVzaChtYWNybyk7XG4gICAgfVxuICB9XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLl9jbGVhck1hY3JvcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxmLl9hcHBsaWVkTWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gc2VsZi5fYXBwbGllZE1hY3Jvc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBtYWNyby5rZXlDb21ibztcbiAgICB2YXIga2V5TmFtZXMgPSBtYWNyby5rZXlOYW1lcztcbiAgICBpZiAoIWtleUNvbWJvLmNoZWNrKHNlbGYucHJlc3NlZEtleXMpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleU5hbWVzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHNlbGYucHJlc3NlZEtleXMuaW5kZXhPZihrZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgc2VsZi5wcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzZWxmLl9hcHBsaWVkTWFjcm9zLnNwbGljZShpLCAxKTtcbiAgICAgIGkgLT0gMTtcbiAgICB9XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGU7XG4iLCJcbi8vIG1vZHVsZXNcbnZhciBMb2NhbGUgPSByZXF1aXJlKCcuLi9saWIvbG9jYWxlJyk7XG5cblxuLy8gY3JlYXRlIHRoZSBsb2NhbGVcbnZhciBsb2NhbGUgPSBuZXcgTG9jYWxlKCd1cycpO1xuXG4vLyBnZW5lcmFsXG5sb2NhbGUuYmluZEtleUNvZGUoMywgWyAnY2FuY2VsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg4LCBbICdiYWNrc3BhY2UnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDksIFsgJ3RhYicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIsIFsgJ2NsZWFyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMywgWyAnZW50ZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE2LCBbICdzaGlmdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTcsIFsgJ2N0cmwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDE4LCBbICdhbHQnLCAnbWVudScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTksIFsgJ3BhdXNlJywgJ2JyZWFrJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMCwgWyAnY2Fwc2xvY2snIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDI3LCBbICdlc2NhcGUnLCAnZXNjJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzMiwgWyAnc3BhY2UnLCAnc3BhY2ViYXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDMzLCBbICdwYWdldXAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM0LCBbICdwYWdlZG93bicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzUsIFsgJ2VuZCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMzYsIFsgJ2hvbWUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM3LCBbICdsZWZ0JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgzOCwgWyAndXAnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDM5LCBbICdyaWdodCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDAsIFsgJ2Rvd24nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQxLCBbICdzZWxlY3QnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQyLCBbICdwcmludHNjcmVlbicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDMsIFsgJ2V4ZWN1dGUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ0LCBbICdzbmFwc2hvdCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNDUsIFsgJ2luc2VydCcsICdpbnMnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDQ2LCBbICdkZWxldGUnLCAnZGVsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0NywgWyAnaGVscCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTEsIFsgJ2NvbW1hbmQnLCAnd2luZG93cycsICd3aW4nLCAnc3VwZXInLCAnbGVmdGNvbW1hbmQnLCAnbGVmdHdpbmRvd3MnLCAnbGVmdHdpbicsICdsZWZ0c3VwZXInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDkyLCBbICdjb21tYW5kJywgJ3dpbmRvd3MnLCAnd2luJywgJ3N1cGVyJywgJ3JpZ2h0Y29tbWFuZCcsICdyaWdodHdpbmRvd3MnLCAncmlnaHR3aW4nLCAncmlnaHRzdXBlcicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTQ1LCBbICdzY3JvbGxsb2NrJywgJ3Njcm9sbCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg2LCBbICdzZW1pY29sb24nLCAnOycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg3LCBbICdlcXVhbCcsICdlcXVhbHNpZ24nLCAnPScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTg4LCBbICdjb21tYScsICcsJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxODksIFsgJ2Rhc2gnLCAnLScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTkwLCBbICdwZXJpb2QnLCAnLicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTkxLCBbICdzbGFzaCcsICdmb3J3YXJkc2xhc2gnLCAnLycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTkyLCBbICdncmF2ZWFjY2VudCcsICdgJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgyMTksIFsgJ29wZW5icmFja2V0JywgJ1snIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIyMCwgWyAnYmFja3NsYXNoJywgJ1xcXFwnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIyMSwgWyAnY2xvc2VicmFja2V0JywgJ10nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDIyMiwgWyAnYXBvc3Ryb3BoZScsICdcXCcnIF0pO1xuXG4vLyAwLTlcbmxvY2FsZS5iaW5kS2V5Q29kZSg0OCwgWyAnemVybycsICcwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg0OSwgWyAnb25lJywgJzEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUwLCBbICd0d28nLCAnMicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTEsIFsgJ3RocmVlJywgJzMnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUyLCBbICdmb3VyJywgJzQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDUzLCBbICdmaXZlJywgJzUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU0LCBbICdzaXgnLCAnNicgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoNTUsIFsgJ3NldmVuJywgJzcnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDU2LCBbICdlaWdodCcsICc4JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg1NywgWyAnbmluZScsICc5JyBdKTtcblxuLy8gbnVtcGFkXG5sb2NhbGUuYmluZEtleUNvZGUoOTYsIFsgJ251bXplcm8nLCAnbnVtMCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoOTcsIFsgJ251bW9uZScsICdudW0xJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSg5OCwgWyAnbnVtdHdvJywgJ251bTInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDk5LCBbICdudW10aHJlZScsICdudW0zJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDAsIFsgJ251bWZvdXInLCAnbnVtNCcgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTAxLCBbICdudW1maXZlJywgJ251bTUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMiwgWyAnbnVtc2l4JywgJ251bTYnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEwMywgWyAnbnVtc2V2ZW4nLCAnbnVtNycgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA0LCBbICdudW1laWdodCcsICdudW04JyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDUsIFsgJ251bW5pbmUnLCAnbnVtOScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTA2LCBbICdudW1tdWx0aXBseScsICdudW0qJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDcsIFsgJ251bWFkZCcsICdudW0rJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDgsIFsgJ251bWVudGVyJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMDksIFsgJ251bXN1YnRyYWN0JywgJ251bS0nIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExMCwgWyAnbnVtZGVjaW1hbCcsICdudW0uJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMTEsIFsgJ251bWRpdmlkZScsICdudW0vJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxNDQsIFsgJ251bWxvY2snLCAnbnVtJyBdKTtcblxuLy8gZnVuY3Rpb24ga2V5c1xubG9jYWxlLmJpbmRLZXlDb2RlKDExMiwgWyAnZjEnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExMywgWyAnZjInIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExNCwgWyAnZjMnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExNSwgWyAnZjQnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExNiwgWyAnZjUnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExNywgWyAnZjYnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExOCwgWyAnZjcnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDExOSwgWyAnZjgnIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMCwgWyAnZjknIF0pO1xubG9jYWxlLmJpbmRLZXlDb2RlKDEyMSwgWyAnZjEwJyBdKTtcbmxvY2FsZS5iaW5kS2V5Q29kZSgxMjIsIFsgJ2YxMScgXSk7XG5sb2NhbGUuYmluZEtleUNvZGUoMTIzLCBbICdmMTInIF0pO1xuXG4vLyBzZWNvbmRhcnkga2V5IHN5bWJvbHNcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgYCcsIFsgJ3RpbGRlJywgJ34nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAxJywgWyAnZXhjbGFtYXRpb24nLCAnZXhjbGFtYXRpb25wb2ludCcsICchJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMicsIFsgJ2F0JywgJ0AnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAzJywgWyAnbnVtYmVyJywgJyMnIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA0JywgWyAnZG9sbGFyJywgJ2RvbGxhcnMnLCAnZG9sbGFyc2lnbicsICckJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNScsIFsgJ3BlcmNlbnQnLCAnJScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDYnLCBbICdjYXJldCcsICdeJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNycsIFsgJ2FtcGVyc2FuZCcsICdhbmQnLCAnJicgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDgnLCBbICdhc3RlcmlzaycsICcqJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgOScsIFsgJ29wZW5wYXJlbicsICcoJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMCcsIFsgJ2Nsb3NlcGFyZW4nLCAnKScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC0nLCBbICd1bmRlcnNjb3JlJywgJ18nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA9JywgWyAncGx1cycsICcrJyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgWycsIFsgJ29wZW5jdXJseWJyYWNlJywgJ29wZW5jdXJseWJyYWNrZXQnLCAneycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIF0nLCBbICdjbG9zZWN1cmx5YnJhY2UnLCAnY2xvc2VjdXJseWJyYWNrZXQnLCAnfScgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFxcXFwnLCBbICd2ZXJ0aWNhbGJhcicsICd8JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgOycsIFsgJ2NvbG9uJywgJzonIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBcXCcnLCBbICdxdW90YXRpb25tYXJrJywgJ1xcJycgXSk7XG5sb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArICEsJywgWyAnb3BlbmFuZ2xlYnJhY2tldCcsICc8JyBdKTtcbmxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLicsIFsgJ2Nsb3NlYW5nbGVicmFja2V0JywgJz4nIF0pO1xubG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAvJywgWyAncXVlc3Rpb25tYXJrJywgJz8nIF0pO1xuXG4vL2EteiBhbmQgQS1aXG5mb3IgKHZhciBrZXlDb2RlID0gNjU7IGtleUNvZGUgPD0gOTA7IGtleUNvZGUgKz0gMSkge1xuICB2YXIga2V5TmFtZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSArIDMyKTtcbiAgdmFyIGNhcGl0YWxLZXlOYW1lID0gU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKTtcblx0bG9jYWxlLmJpbmRLZXlDb2RlKGtleUNvZGUsIGtleU5hbWUpO1xuXHRsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArICcgKyBrZXlOYW1lLCBjYXBpdGFsS2V5TmFtZSk7XG5cdGxvY2FsZS5iaW5kTWFjcm8oJ2NhcHNsb2NrICsgJyArIGtleU5hbWUsIGNhcGl0YWxLZXlOYW1lKTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvY2FsZTtcbiIsIlxuXG4vLyBsaWJzXG52YXIgR3VhcmRFcnJvciA9IHJlcXVpcmUoJy4vbGliL2d1YXJkLWVycm9yJyk7XG52YXIgZ3VhcmQgPSByZXF1aXJlKCcuL2xpYi9ndWFyZCcpO1xuXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCAgICApIHtcbiAgcmV0dXJuIGd1YXJkLmNoZWNrLmFwcGx5KGd1YXJkLCBhcmd1bWVudHMpO1xufTtcbmV4cG9ydHMuR3VhcmRFcnJvciA9IEd1YXJkRXJyb3I7XG5leHBvcnRzLmd1YXJkID0gZ3VhcmQ7XG5leHBvcnRzLnR5cGVzID0gZ3VhcmQudHlwZXM7XG4iLCJcbi8vIG1vZHVsZXNcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cblxuZnVuY3Rpb24gR3VhcmRFcnJvcihtZXNzYWdlLCBmaWxlTmFtZSwgbGluZU51bWJlcikge1xuICBFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UsIGZpbGVOYW1lLCBsaW5lTnVtYmVyKTtcblxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICB0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWU7XG4gIGlmIChmaWxlTmFtZSkgeyB0aGlzLmZpbGVOYW1lID0gZmlsZU5hbWU7IH1cbiAgaWYgKGxpbmVOdW1iZXIpIHsgdGhpcy5saW5lTnVtYmVyID0gbGluZU51bWJlcjsgfVxuXG4gIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB0aGlzLl9zZXRTdGFja09mZnNldCgxKTtcbn1cbmluaGVyaXRzKEd1YXJkRXJyb3IsIEVycm9yKTtcblxuR3VhcmRFcnJvci5wcm90b3R5cGUuX3NldFN0YWNrT2Zmc2V0ID0gZnVuY3Rpb24oc3RhY2tPZmZzZXQpIHtcbiAgdHJ5IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoKTtcbiAgfSBjYXRjaChkdW1teUVycikge1xuICAgIHZhciBmaXJzdExpbmUgPSB0aGlzLnN0YWNrLnNwbGl0KCdcXG4nKVswXTtcbiAgICB2YXIgbGluZXMgPSBkdW1teUVyci5zdGFjay5zcGxpdCgnXFxuJyk7XG4gICAgdmFyIGxpbmUgPSBsaW5lc1tzdGFja09mZnNldCArIDJdO1xuICAgIHZhciBsaW5lQ2h1bmtzID0gbGluZS5tYXRjaCgvXFwoKFteXFwpXSspXFwpLylbMV0uc3BsaXQoJzonKTtcbiAgICB0aGlzLnN0YWNrID0gW2ZpcnN0TGluZV0uY29uY2F0KGxpbmVzLnNsaWNlKHN0YWNrT2Zmc2V0ICsgMikpLmpvaW4oJ1xcbicpO1xuICAgIHRoaXMuZmlsZU5hbWUgPSBsaW5lQ2h1bmtzWzBdO1xuICAgIHRoaXMubGluZU51bWJlciA9IGxpbmVDaHVua3NbMV07XG4gICAgdGhpcy5jb2x1bW5OdW1iZXIgPSBsaW5lQ2h1bmtzWzJdO1xuICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gR3VhcmRFcnJvcjtcbiIsIlxuLy8gbGlic1xudmFyIEd1YXJkRXJyb3IgPSByZXF1aXJlKCcuL2d1YXJkLWVycm9yJyk7XG5cblxuZXhwb3J0cy50eXBlcyA9IFtcbiAgJ29iamVjdCcsXG4gICdzdHJpbmcnLFxuICAnYm9vbGVhbicsXG4gICdudW1iZXInLFxuICAnYXJyYXknLFxuICAncmVnZXhwJyxcbiAgJ2RhdGUnLFxuICAnc3RyZWFtJyxcbiAgJ3JlYWQtc3RyZWFtJyxcbiAgJ3dyaXRlLXN0cmVhbScsXG4gICdlbWl0dGVyJyxcbiAgJ2Z1bmN0aW9uJyxcbiAgJ251bGwnLFxuICAndW5kZWZpbmVkJ1xuXTtcblxuZXhwb3J0cy5jaGVjayA9IGZ1bmN0aW9uKGtleSwgdmFsLCB0eXBlKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdrZXkgbXVzdCBiZSBhIHN0cmluZycpO1xuICB9XG4gIGlmICh0eXBlb2YgdHlwZSAhPT0gJ3N0cmluZycgJiYgKFxuICAgIHR5cGUgPT09IG51bGwgfHxcbiAgICB0eXBlb2YgdHlwZSAhPT0gJ29iamVjdCcgfHxcbiAgICB0eXBlb2YgdHlwZS5sZW5ndGggIT09ICdudW1iZXInXG4gICkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0eXBlIG11c3QgYmUgYSBzdHJpbmcgb3IgYXJyYXknKTtcbiAgfVxuXG4gIHZhciB0eXBlRXJyID0gc2VsZi5fdmFsaWRhdGVUeXBlKHR5cGUpO1xuICBpZiAodHlwZUVycikge1xuICAgIHR5cGVFcnIuX3NldFN0YWNrT2Zmc2V0KHNlbGYuX3N0YWNrT2Zmc2V0KTtcbiAgICB0aHJvdyB0eXBlRXJyO1xuICB9XG5cbiAgdmFyIHZhbEVyciA9IHNlbGYuX3ZhbGlkYXRlVmFsKGtleSwgdHlwZSwgdmFsKTtcbiAgaWYgKHZhbEVycikge1xuICAgIHZhbEVyci5fc2V0U3RhY2tPZmZzZXQoc2VsZi5fc3RhY2tPZmZzZXQpO1xuICAgIHRocm93IHZhbEVycjtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuZXhwb3J0cy5fdmFsaWRhdGVUeXBlID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKFxuICAgIHR5cGUgIT09IG51bGwgJiZcbiAgICB0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcgJiZcbiAgICB0eXBlb2YgdHlwZS5sZW5ndGggPT09ICdudW1iZXInXG4gICkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdmFyIGVyciA9IHNlbGYuX3ZhbGlkYXRlVHlwZSh0eXBlW2ldKTtcbiAgICAgIGlmIChlcnIpIHsgcmV0dXJuIGVycjsgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAoc2VsZi50eXBlcy5pbmRleE9mKHR5cGUpID09PSAtMSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihcbiAgICAgICd0eXBlIG11c3QgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgdmFsdWVzOiAnICsgc2VsZi50eXBlcy5qb2luKCcsICcpXG4gICAgKTtcbiAgfVxufTtcblxuLy8gdmFsaWRhdGVzIHRoZSB2YWx1ZSBhZ2FpbnN0IHRoZSB0eXBlXG5leHBvcnRzLl92YWxpZGF0ZVZhbCA9IGZ1bmN0aW9uKGtleSwgdHlwZSwgdmFsKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyByZWN1cnNpdmVcbiAgaWYgKFxuICAgIHR5cGUgIT09IG51bGwgJiZcbiAgICB0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcgJiZcbiAgICB0eXBlb2YgdHlwZS5sZW5ndGggPT09ICdudW1iZXInXG4gICkge1xuICAgIHZhciBvayA9IGZhbHNlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHlwZS5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKCFzZWxmLl92YWxpZGF0ZVZhbChrZXksIHR5cGVbaV0sIHZhbCkpIHtcbiAgICAgICAgb2sgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9rKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKFxuICAgICAgICBrZXkgKyAnIG11c3QgYmUgb25lIG9mIHRoZSBmb2xsb3dpbmcgdHlwZXM6ICcgKyB0eXBlLmpvaW4oJywgJylcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gb2JqZWN0XG4gIGlmICh0eXBlID09PSAnb2JqZWN0JyAmJiAoXG4gICAgdmFsID09PSBudWxsIHx8XG4gICAgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCdcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gIH1cblxuICAvLyBzdHJpbmdcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIHZhbCAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gIH1cblxuICAvLyBib29sZWFuXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdib29sZWFuJyAmJiB0eXBlb2YgdmFsICE9PSAnYm9vbGVhbicpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGEgYm9vbGVhbicpO1xuICB9XG5cbiAgLy8gbnVtYmVyXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmIHR5cGVvZiB2YWwgIT09ICdudW1iZXInKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIG51bWJlcicpO1xuICB9XG5cbiAgLy8gYXJyYXlcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2FycmF5JyAmJiAoXG4gICAgdmFsID09PSBudWxsIHx8XG4gICAgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcgfHxcbiAgICB0eXBlb2YgdmFsLmxlbmd0aCAhPT0gJ251bWJlcidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgfVxuXG4gIC8vIHJlZ2V4XG4gIGVsc2UgaWYgKHR5cGUgPT09ICdyZWdleHAnICYmIHZhbC5jb25zdHJ1Y3RvciAhPT0gUmVnRXhwKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHJlZ2V4cCcpO1xuICB9XG5cbiAgLy8gZGF0ZVxuICBlbHNlIGlmICh0eXBlID09PSAnZGF0ZScgJiYgdmFsLmNvbnN0cnVjdG9yICE9PSBEYXRlKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIGRhdGUnKTtcbiAgfVxuXG4gIC8vIGVtaXR0ZXJcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ2VtaXR0ZXInICYmIChcbiAgICB0eXBlb2YgdmFsLmFkZExpc3RlbmVyICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5lbWl0ICE9PSAnZnVuY3Rpb24nXG4gICkpIHtcbiAgICByZXR1cm4gbmV3IEd1YXJkRXJyb3Ioa2V5ICsgJyBtdXN0IGJlIGFuIGVtaXR0ZXInKTtcbiAgfVxuXG4gIC8vIHN0cmVhbVxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyZWFtJyAmJiAoXG4gICAgdHlwZW9mIHZhbC5vbiAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwucGlwZSAhPT0gJ2Z1bmN0aW9uJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHN0cmVhbScpO1xuICB9XG5cbiAgLy8gcmVhZCBzdHJlYW1cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3JlYWQtc3RyZWFtJyAmJiAoXG4gICAgdHlwZW9mIHZhbC5vbiAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwucGlwZSAhPT0gJ2Z1bmN0aW9uJyB8fFxuICAgIHR5cGVvZiB2YWwucmVhZCAhPT0gJ2Z1bmN0aW9uJ1xuICApKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIHJlYWQtc3RyZWFtJyk7XG4gIH1cblxuICAvLyB3cml0ZSBzdHJlYW1cbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3dyaXRlLXN0cmVhbScgJiYgKFxuICAgIHR5cGVvZiB2YWwub24gIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLnBpcGUgIT09ICdmdW5jdGlvbicgfHxcbiAgICB0eXBlb2YgdmFsLndyaXRlICE9PSAnZnVuY3Rpb24nIHx8XG4gICAgdHlwZW9mIHZhbC5lbmQgIT09ICdmdW5jdGlvbidcbiAgKSkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSB3cml0ZS1zdHJlYW0nKTtcbiAgfVxuXG4gIC8vIGZ1bmN0aW9uXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIHZhbCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgLy8gbnVsbFxuICBlbHNlIGlmICh0eXBlID09PSAnbnVsbCcgJiYgdmFsICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIG5ldyBHdWFyZEVycm9yKGtleSArICcgbXVzdCBiZSBhIG51bGwnKTtcbiAgfVxuXG4gIC8vIHVuZGVmaW5lZFxuICBlbHNlIGlmICh0eXBlID09PSAndW5kZWZpbmVkJyAmJiB2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBuZXcgR3VhcmRFcnJvcihrZXkgKyAnIG11c3QgYmUgYSB1bmRlZmluZWQnKTtcbiAgfVxuXG4gIHJldHVybiBudWxsO1xufTtcblxuZXhwb3J0cy5fc3RhY2tPZmZzZXQgPSAyO1xuXG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiJdfQ==
