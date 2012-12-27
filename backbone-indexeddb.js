// Generated by CoffeeScript 1.4.0
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  IndexedDBBackbone.Driver = (function() {

    function Driver(schema, ready, nolog) {
      this._migrate_next = __bind(this._migrate_next, this);

      this.migrate = __bind(this.migrate, this);

      var _this = this;
      this.schema = schema;
      this.ready = ready;
      this.error = null;
      this.transactions = [];
      this.db = null;
      this.nolog = nolog;
      this.logger = function() {
        var _ref;
        if (nolog) {
          if ((typeof window !== "undefined" && window !== null ? (_ref = window.console) != null ? _ref.log : void 0 : void 0) != null) {
            return window.console.log.apply(window.console, arguments);
          } else if ((typeof console !== "undefined" && console !== null ? console.log : void 0) != null) {
            return console.log(apply(console, arguments));
          }
        }
      };
      this.supportOnUpgradeNeeded = false;
      this.lastMigrationPathVersion = _.last(schema.migrations).version;
      this.launchMigrationPath = function(dbVersion) {
        var clonedMigrations,
          _this = this;
        clonedMigrations = _.clone(schema.migrations);
        return this.migrate(clonedMigrations, dbVersion, {
          success: function() {
            return _this.ready();
          },
          error: function() {
            return _this.error = "Database not up to date. " + dbVersion + " expected was " + _this.lastMigrationPathVersion;
          }
        });
      };
      this.logger("opening database", schema.id, "in version #", this.lastMigrationPathVersion);
      this.dbRequest = IndexedDBBackbone.indexedDB.open(schema.id, this.lastMigrationPathVersion);
      this.dbRequest.onblocked = function(e) {
        return _this.logger("blocked");
      };
      this.dbRequest.onsuccess = function(e) {
        var currentIntDBVersion, lastMigrationInt;
        _this.db = e.target.result;
        if (!_this.supportOnUpgradeNeeded) {
          currentIntDBVersion = parseInt(_this.db.version, 10) || 0;
          lastMigrationInt = parseInt(_this.lastMigrationPathVersion, 10) || 0;
          if (currentIntDBVersion === lastMigrationInt) {
            return _this.ready();
          } else if (currentIntDBVersion < lastMigrationInt) {
            return _this.launchMigrationPath(currentIntDBVersion);
          } else {
            return _this.error = "Database version is greater than current code " + currentIntDBVersion + " expected was " + lastMigrationInt;
          }
        }
      };
      this.dbRequest.onerror = function(e) {
        return _this.error = "Couldn't not connect to the database";
      };
      this.dbRequest.onabort = function(e) {
        return _this.error = "Connection to the database aborted";
      };
      this.dbRequest.onupgradeneeded = function(iDBVersionChangeEvent) {
        _this.db = iDBVersionChangeEvent.target.transaction.db;
        _this.supportOnUpgradeNeeded = true;
        if (!_this.nolog) {
          _this.logger("onupgradeneeded = " + iDBVersionChangeEvent.oldVersion + " => " + iDBVersionChangeEvent.newVersion);
        }
        return _this.launchMigrationPath(iDBVersionChangeEvent.oldVersion);
      };
    }

    Driver.prototype.close = function() {
      if (this.db != null) {
        return this.db.close();
      }
    };

    Driver.prototype.migrate = function(migrations, version, options) {
      this.logger("Starting migrations from ", version);
      return this._migrate_next(migrations, version, options);
    };

    Driver.prototype._migrate_next = function(migrations, version, options) {
      var migration, that,
        _this = this;
      this.logger("_migrate_next begin version from #" + version);
      that = this;
      migration = migrations.shift();
      if (migration) {
        if (!version || version < migration.version) {
          if (typeof migration.before === "undefined") {
            migration.before = function(next) {
              return next();
            };
          }
          if (typeof migration.after === "undefined") {
            migration.after = function(next) {
              return next();
            };
          }
          this.logger("_migrate_next begin before version #" + migration.version);
          return migration.before(function() {
            var continueMigration, versionRequest;
            _this.logger("_migrate_next done before version #" + migration.version);
            continueMigration = function(e) {
              var transaction;
              _this.logger("_migrate_next continueMigration version #" + migration.version);
              transaction = _this.dbRequest.transaction || versionRequest.result;
              _this.logger("_migrate_next begin migrate version #" + migration.version);
              return migration.migrate(transaction, function() {
                _this.logger("_migrate_next done migrate version #" + migration.version);
                _this.logger("_migrate_next begin after version #" + migration.version);
                return migration.after(function() {
                  _this.logger("_migrate_next done after version #" + migration.version);
                  _this.logger("Migrated to " + migration.version);
                  if (migrations.length === 0) {
                    _this.logger("_migrate_next setting transaction.oncomplete to finish  version #" + migration.version);
                    return transaction.oncomplete = function() {
                      _this.logger("_migrate_next done transaction.oncomplete version #" + migration.version);
                      _this.logger("Done migrating");
                      return options.success();
                    };
                  } else {
                    _this.logger("_migrate_next setting transaction.oncomplete to recursive _migrate_next  version #" + migration.version);
                    return transaction.oncomplete = function() {
                      _this.logger("_migrate_next end from version #" + version + " to " + migration.version);
                      return that._migrate_next(migrations, version, options);
                    };
                  }
                });
              });
            };
            if (!_this.supportOnUpgradeNeeded) {
              _this.logger("_migrate_next begin setVersion version #" + migration.version);
              versionRequest = _this.db.setVersion(migration.version);
              versionRequest.onsuccess = continueMigration;
              return versionRequest.onerror = options.error;
            } else {
              return continueMigration();
            }
          });
        } else {
          this.logger("Skipping migration " + migration.version);
          return this._migrate_next(migrations, version, options);
        }
      }
    };

    return Driver;

  })();

  IndexedDBBackbone.Driver.Request = (function() {

    function Request(transaction, storeName, objectJSON, options) {
      this.objectJSON = objectJSON;
      this.options = options;
      this.store = transaction.objectStore(storeName);
    }

    Request.prototype.execute = function() {
      var request;
      request = this.run();
      return this.bindCallbacks(request);
    };

    Request.prototype.bindCallbacks = function(request) {
      var _this = this;
      request.onerror = function(e) {
        return _this.options.error(e);
      };
      return request.onsuccess = function(e) {
        return _this.options.success(_this.objectJSON);
      };
    };

    return Request;

  })();

  IndexedDBBackbone.Driver.AddRequest = (function(_super) {

    __extends(AddRequest, _super);

    function AddRequest() {
      return AddRequest.__super__.constructor.apply(this, arguments);
    }

    AddRequest.prototype.run = function() {
      if (this.objectJSON.id === void 0) {
        this.objectJSON.id = guid();
      }
      if (this.objectJSON.id === null) {
        delete this.objectJSON.id;
      }
      if (this.store.keyPath) {
        return this.store.add(this.objectJSON);
      } else {
        return this.store.add(this.objectJSON, this.objectJSON.id);
      }
    };

    return AddRequest;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver.PutRequest = (function(_super) {

    __extends(PutRequest, _super);

    function PutRequest() {
      return PutRequest.__super__.constructor.apply(this, arguments);
    }

    PutRequest.prototype.run = function() {
      if (this.objectJSON.id == null) {
        this.objectJSON.id = guid();
      }
      if (this.store.keyPath) {
        return this.store.put(this.objectJSON);
      } else {
        return this.store.put(this.objectJSON, this.objectJSON.id);
      }
    };

    return PutRequest;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver.DeleteRequest = (function(_super) {

    __extends(DeleteRequest, _super);

    function DeleteRequest() {
      return DeleteRequest.__super__.constructor.apply(this, arguments);
    }

    DeleteRequest.prototype.execute = function() {
      var request,
        _this = this;
      request = this.store["delete"](this.objectJSON.id);
      request.onsuccess = function(event) {
        return _this.options.success(null);
      };
      return request.onerror = function(event) {
        return _this.options.error("Not Deleted");
      };
    };

    return DeleteRequest;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver.ClearRequest = (function(_super) {

    __extends(ClearRequest, _super);

    function ClearRequest() {
      return ClearRequest.__super__.constructor.apply(this, arguments);
    }

    ClearRequest.prototype.execute = function() {
      var request,
        _this = this;
      request = this.store.clear();
      request.onsuccess = function(e) {
        return _this.options.success(null);
      };
      return request.onerror = function(e) {
        return _this.options.error("Not Cleared");
      };
    };

    return ClearRequest;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver.GetRequest = (function(_super) {

    __extends(GetRequest, _super);

    function GetRequest() {
      return GetRequest.__super__.constructor.apply(this, arguments);
    }

    GetRequest.prototype.execute = function() {
      var getRequest,
        _this = this;
      if (this.objectJSON.id) {
        getRequest = this.store.get(this.objectJSON.id);
      } else {
        _.each(this.store.indexNames, function(key, index) {
          index = _this.store.index(key);
          if (_this.objectJSON[index.keyPath]) {
            return getRequest = index.get(_this.objectJSON[index.keyPath]);
          }
        });
      }
      if (getRequest) {
        getRequest.onsuccess = function(e) {
          if (e.target.result) {
            return _this.options.success(e.target.result);
          } else {
            return _this.options.error("Not Found");
          }
        };
        return getRequest.onerror = function() {
          return _this.options.error("Not Found");
        };
      } else {
        return this.options.error("Not Found");
      }
    };

    return GetRequest;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver.Query = (function(_super) {

    __extends(Query, _super);

    function Query() {
      return Query.__super__.constructor.apply(this, arguments);
    }

    return Query;

  })(IndexedDBBackbone.Driver.Request);

  IndexedDBBackbone.Driver = (function(_super) {

    __extends(Driver, _super);

    function Driver() {
      return Driver.__super__.constructor.apply(this, arguments);
    }

    Driver.prototype._track_transaction = function(transaction) {
      var removeIt,
        _this = this;
      this.transactions.push(transaction);
      removeIt = function() {
        var idx;
        idx = _this.transactions.indexOf(transaction);
        if (idx !== -1) {
          return _this.transactions.splice(idx);
        }
      };
      transaction.oncomplete = removeIt;
      transaction.onabort = removeIt;
      return transaction.onerror = removeIt;
    };

    Driver.prototype.execute = function(storeName, method, object, options) {
      var request, transaction;
      this.logger("execute : " + method + " on " + storeName + " for " + object.id);
      switch (method) {
        case "create":
          transaction = this.db.transaction([storeName], 'readwrite');
          request = new IndexedDBBackbone.Driver.AddRequest(transaction, storeName, object.toJSON(), options);
          break;
        case "read":
          if (object.id || object.cid) {
            transaction = this.db.transaction([storeName], "readonly");
            request = new IndexedDBBackbone.Driver.GetRequest(transaction, storeName, object.toJSON(), options);
          } else {
            this.query(storeName, object, options);
          }
          break;
        case "update":
          transaction = this.db.transaction([storeName], 'readwrite');
          request = new IndexedDBBackbone.Driver.PutRequest(transaction, storeName, object.toJSON(), options);
          break;
        case "delete":
          transaction = this.db.transaction([storeName], 'readwrite');
          if (object.id || object.cid) {
            request = new IndexedDBBackbone.Driver.DeleteRequest(transaction, storeName, object.toJSON(), options);
          } else {
            request = new IndexedDBBackbone.Driver.ClearRequest(transaction, storeName, object.toJSON(), options);
          }
          break;
        default:
          this.logger("Unknown method", method, "is called for", object);
      }
      if (request) {
        return request.execute();
      }
    };

    Driver.prototype.query = function(storeName, collection, options) {
      var bounds, elements, index, lower, processed, queryTransaction, readCursor, skipped, store, upper;
      elements = [];
      skipped = 0;
      processed = 0;
      queryTransaction = this.db.transaction([storeName], "readonly");
      readCursor = null;
      store = queryTransaction.objectStore(storeName);
      index = null;
      lower = null;
      upper = null;
      bounds = null;
      if (options.conditions) {
        _.each(store.indexNames, function(key) {
          if (!readCursor) {
            index = store.index(key);
            if (options.conditions[index.keyPath] instanceof Array) {
              lower = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][1] : options.conditions[index.keyPath][0];
              upper = options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1] ? options.conditions[index.keyPath][0] : options.conditions[index.keyPath][1];
              bounds = IndexedDBBackbone.IDBKeyRange.bound(lower, upper, true, true);
              if (options.conditions[index.keyPath][0] > options.conditions[index.keyPath][1]) {
                return readCursor = index.openCursor(bounds, IndexedDBBackbone.IDBCursor.PREV || "prev");
              } else {
                return readCursor = index.openCursor(bounds, IndexedDBBackbone.IDBCursor.NEXT || "next");
              }
            } else if (options.conditions[index.keyPath] !== void 0) {
              bounds = IndexedDBBackbone.IDBKeyRange.only(options.conditions[index.keyPath]);
              return readCursor = index.openCursor(bounds);
            }
          }
        });
      } else {
        if (options.range) {
          lower = options.range[0] > options.range[1] ? options.range[1] : options.range[0];
          upper = options.range[0] > options.range[1] ? options.range[0] : options.range[1];
          bounds = IndexedDBBackbone.IDBKeyRange.bound(lower, upper);
          if (options.range[0] > options.range[1]) {
            readCursor = store.openCursor(bounds, IndexedDBBackbone.IDBCursor.PREV || "prev");
          } else {
            readCursor = store.openCursor(bounds, IndexedDBBackbone.IDBCursor.NEXT || "next");
          }
        } else {
          readCursor = store.openCursor();
        }
      }
      if (typeof readCursor === "undefined" || !readCursor) {
        return options.error("No Cursor");
      } else {
        readCursor.onerror = function(e) {
          return options.error("readCursor error", e);
        };
        return readCursor.onsuccess = function(e) {
          var cursor, deleteRequest;
          cursor = e.target.result;
          if (!cursor) {
            if (options.addIndividually || options.clear) {
              return collection.trigger("reset");
            } else {
              return options.success(elements);
            }
          } else {
            if (options.limit && processed >= options.limit) {
              if (bounds && options.conditions[index.keyPath]) {
                return cursor["continue"](options.conditions[index.keyPath][1] + 1);
              } else {
                return cursor["continue"]();
              }
            } else if (options.offset && options.offset > skipped) {
              skipped++;
              return cursor["continue"]();
            } else {
              if (options.addIndividually) {
                collection.add(cursor.value);
              } else if (options.clear) {
                deleteRequest = store["delete"](cursor.value.id);
                deleteRequest.onsuccess = function(event) {
                  return elements.push(cursor.value);
                };
                deleteRequest.onerror = function(event) {
                  return elements.push(cursor.value);
                };
              } else {
                elements.push(cursor.value);
              }
              processed++;
              return cursor["continue"]();
            }
          }
        };
      }
    };

    return Driver;

  })(IndexedDBBackbone.Driver);

  window.IndexedDBBackbone = {
    S4: function() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    },
    guid: function() {
      return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }
  };

  if (typeof exports !== 'undefined') {
    window._ = require('underscore');
    window.Backbone = require('backbone');
  }

  IndexedDBBackbone.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;

  IndexedDBBackbone.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || {
    READ_WRITE: "readwrite"
  };

  IndexedDBBackbone.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;

  IndexedDBBackbone.IDBCursor = window.IDBCursor || window.webkitIDBCursor || window.mozIDBCursor || window.msIDBCursor;

  IndexedDBBackbone.ExecutionQueue = (function() {

    function ExecutionQueue(schema, next, nolog) {
      this.driver = new IndexedDBBackbone.Driver(schema, this.ready.bind(this), nolog);
      this.started = false;
      this.stack = [];
      this.version = _.last(schema.migrations).version;
      this.next = next;
    }

    ExecutionQueue.prototype.ready = function() {
      var _this = this;
      this.started = true;
      _.each(this.stack, function(message) {
        return _this.execute(message);
      });
      return this.next();
    };

    ExecutionQueue.prototype.execute = function(message) {
      if (this.started) {
        return this.driver.execute(message[1].storeName, message[0], message[1], message[2]);
      } else {
        return this.stack.push(message);
      }
    };

    ExecutionQueue.prototype.close = function() {
      return this.driver.close();
    };

    return ExecutionQueue;

  })();

  IndexedDBBackbone.Databases = {};

  IndexedDBBackbone.sync = function(method, object, options) {
    var Databases, next, schema;
    Databases = IndexedDBBackbone.Databases;
    if (method === "closeall") {
      _.each(Databases, function(database) {
        return database.close();
      });
      Databases = {};
      return;
    }
    schema = object.database;
    if (Databases[schema.id]) {
      if (Databases[schema.id].version !== _.last(schema.migrations).version) {
        Databases[schema.id].close();
        delete Databases[schema.id];
      }
    }
    next = function() {
      return Databases[schema.id].execute([method, object, options]);
    };
    if (!Databases[schema.id]) {
      return Databases[schema.id] = new IndexedDBBackbone.ExecutionQueue(schema, next, schema.nolog);
    } else {
      return next();
    }
  };

  if (typeof exports === 'undefined') {
    Backbone.ajaxSync = Backbone.sync;
    Backbone.sync = IndexedDBBackbone.sync;
  } else {
    exports.sync = IndexedDBBackbone.sync;
  }

}).call(this);
