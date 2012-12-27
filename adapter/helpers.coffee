window.IndexedDBBackbone =
  # Generate four random hex digits.
  S4: ->
    (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)

  # Generate a pseudo-GUID by concatenating random hexadecimal.
  guid: ->
    (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4())

if typeof exports != 'undefined'
  window._ = require('underscore')
  window.Backbone = require('backbone')

