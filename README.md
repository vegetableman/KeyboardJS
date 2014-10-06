
KeyboardJS
==========

![NPM Version](http://img.shields.io/npm/v/keyboardjs.svg?style=flat)
![Downloads This Week](http://img.shields.io/npm/dm/keyboardjs.svg?style=flat)
![License](http://img.shields.io/npm/l/keyboardjs.svg?style=flat)

[ ![Browser Support](https://ci.testling.com/RobertWHurst/KeyboardJS.png) ](https://ci.testling.com/RobertWHurst/KeyboardJS)

As most web developers and engineers know, setting up key combos for you
web application can be a challenge. You can easily bind an event handler to
the `keyup` and `keydown` events, but browser only gives you a key code, not
the name of the key pressed, and when it comes to key combos, well forget about
it.

This is where KeyboardJS, and libraries like it come in. There are plently of
decent libraries that serve this purpose more or less, but KeyboardJS really
stands out in a couple of areas.

Firstly it's really flexable and lets you bind almost any key on the keyboard,
even secondary (shift) keys like `?` and `&`.

```javascript
keyboardJS.bind('ctrl > a', function() { ... })
keyboardJS.bind('command + i', function() { ... })
keyboardJS.bind('`', function() { ... })
keyboardJS.bind('a + b > c', function() { ... })
```
