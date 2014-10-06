
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
