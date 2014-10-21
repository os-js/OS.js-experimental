/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2014, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
(function(Utils, VFS, API) {

  function getMessage(id, cb) {
    var request = gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: id
    });
    request.execute(function(resp) {
      if ( resp.id === id ) {
        cb(resp);
        return;
      }
      cb(false);
    });
  }

  function getMessageData(list, callback, cbProgress) {
    var index  = 0;

    function _next() {
      if ( index >= list.length ) {
        callback(list);
        return;
      }

      var iter = list[index];
      cbProgress(index, list.length-1, iter);
      getMessage(iter.id, function(result) {
        if ( result ) {
          iter.setPayload(result.payload);
          iter.setFolders(iter.labelIds);
        } else {
          iter.subject = '!!! ERROR !!!';
        }
        index++;
        _next();
      });
    }

    _next();
  }

  /////////////////////////////////////////////////////////////////////////////
  // Folder
  /////////////////////////////////////////////////////////////////////////////

  function Folder(id, name, opts) {
    this.id = id;
    this.name = name;
    this.opts = opts;
  }

  /////////////////////////////////////////////////////////////////////////////
  // Message
  /////////////////////////////////////////////////////////////////////////////

  function Message(id, threadId, subject) {
    this.id = id;
    this.threadId = threadId;
    this.subject = subject || '';
    this.from = '';
    this.date = null;
    this.mimeType = 'text/plain';
    this.headers = [];
    this.folders = [];
  }

  Message.prototype.setHeaders = function(arr) {
    if ( !arr ) { return; }
    this.headers = arr;

    var self = this;
    this.headers.forEach(function(iter) {
      switch ( iter.name ) {
        case 'From' :
          self.from = iter.value;
        break;

        case 'Date' :
          self.date = iter.value;
        break;

        case 'Subject' :
          self.subject = iter.value;
        break;

        default :
        break;
      }
    });
  };

  Message.prototype.setPayload = function(p) {
    if ( p ) {
      this.mimeType = p.mimeType;
      if ( p.headers ) {
        this.setHeaders(p.headers);
      }
    }
  };

  Message.prototype.setFolders = function(f) {
    this.folders = f || [];
  };

  Message.prototype.toObject = function() {
    return {
      id: this.id,
      threadId: this.threadId,
      subject: this.subject,
      from: this.from,
      date: this.date,
      mimeType: this.mimeType,
      headers: this.headers,
      folders: this.folders
    };
  };

  Message.createFromObject = function(o) {
    var msg = new Message();
    Object.keys(o).forEach(function(i) {
      msg[i] = o[i];
    });
    return msg;
  };


  /////////////////////////////////////////////////////////////////////////////
  // Mailer
  /////////////////////////////////////////////////////////////////////////////

  function Mailer() {
    this.database   = null;
    this.userName   = '';
    this.userEmail  = '';
    this.database   = null;
    this.dbOptions  = {
      dbName: 'ApplicationMailerDB',
      version: '3',
      onupgrade: function(db, cb) {
        if ( db.objectStoreNames.contains('Messages') ) {
          db.deleteObjectStore('Messages');
        }
        db.createObjectStore('Messages', {keyPath: 'id'});

        if ( db.objectStoreNames.contains('Settings') ) {
          db.deleteObjectStore('Settings');
        }
        db.createObjectStore('Settings', {keyPath: 'name'});

        cb();
      }
    };
  }

  Mailer.prototype.init = function(callback) {
    callback = callback || function() {};
    var self = this;

    function initDatabase() {
      self.database = OSjs.Drivers.createInstance('IndexedDB', self.dbOptions, function(error, result) {
        if ( error ) {
          console.error('Mailer::init() error', error); // FIXME
          callback(false);
          return;
        }

        callback(true);
      });
    }

    var iargs = {load: [], scope: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/plus.profile.emails.read',
      'https://mail.google.com',
      'openid'
    ]};
    OSjs.Drivers.createInstance('GoogleAPI', iargs, function(error, result) {
      if ( error ) {
        return callback(error);
      }
      gapi.client.load('plus', 'v1', function() {
        gapi.client.plus.people.get({
          userId: 'me'
        }).execute(function(resp) {
          if ( resp ) {
            if ( resp.emails ) {
              resp.emails.forEach(function(i) {
                if ( i.type === 'account' ) {
                  self.userEmail = i.value;
                  return false;
                }
                return true;
              });
            }
            self.userId = resp.id;
            self.userName = resp.displayName;
          }

          gapi.client.load('gmail', 'v1', function(resp) {
            initDatabase();
          });
        });
      });
    });
  };

  Mailer.prototype.destroy = function() {
  };

  Mailer.prototype.sendMessage = function(message, callback) {
    var lines = [];
    lines.push('From: "' + this.userName + '" <' + this.userEmail + '>');
    lines.push('To: ' + opts.to);
    lines.push('Content-type: text/html;charset=iso8859-1');
    lines.push('MIME-Version: 1.0');
    lines.push('Subject: ' + opts.subject);
    lines.push('');
    lines.push(opts.body);

    var raw = lines.join('\r\n');
    var encoded = Utils.urlsafe_b64encode(raw);

    var request = gapi.client.gmail.users.messages.send({
      userId: 'me',
      raw: encoded
    });

    request.execute(function(resp) {
      console.info('Mailer::sendMessage()', '=>', resp);
      if ( resp && resp.id ) {
        callback(false, resp);
      } else {
        callback('Failed to send message');
      }
    });
  };

  Mailer.prototype.getFolderList = function(opts, callback) {
    function getFolders(cb) {
      var request = gapi.client.gmail.users.labels.list({
        userId: 'me'
      });

      request.execute(function(resp) {
        console.info('Mailer::getFolderList()', '=>', resp);
        if ( typeof resp.labels === 'object' && (resp.labels instanceof Array) ) {
          cb(resp.labels);
          return;
        }
        callback('Failed to get mailbox');
      });
    }

    getFolders(function(list) {
      var result = [];
      list.forEach(function(iter) {
        result.push(new Folder(iter.id, iter.name, {
          messageListVisibility: iter.messageListVisibility || null,
          labelListVisibility: iter.labelListVisibility || null,
          type: iter.type || null
        }));
      });
      callback(false, list);
    });
  };

  Mailer.prototype.draftMessage = function(message, callback) {
    callback('Not implemented');
  };

  Mailer.prototype.updateMessages = function(opts, callback) {
    opts = opts || {};
    opts.onprogress = opts.onprogress || function() {};
    opts.onmetadataloaded = opts.onmetadataloaded || function() {};

    var self = this;
    var folder = opts.folder || null;
    var last;

    function findLastMessage(cb) {
      self.getMessages({folder: folder}, function(error, result) {
        if ( !error && result.length && !last ) {
          last = result[0].id;
        }
        cb();
      });
    }

    function retrieveAllMessages(cb) {
      var retrievePageOfMessages = function(request, result) {
        request.execute(function(resp) {
          console.info('Mailer::getMessages()', '=>', resp);

          if ( resp && resp.messages && last ) {
            var finished = false;
            resp.messages.forEach(function(iter) {
              if ( iter.id === last ) {
                return false;
              }
            });

            /*
            // TODO
            if ( finished ) {
              console.warn("YOU HAVE ALREADY FETCHED YOUR MAILBOX");
              return cb([]);
            }
            */
          }

          result = result.concat(resp.messages);
          var nextPageToken = resp.nextPageToken;
          if (nextPageToken) {
            request = gapi.client.gmail.users.messages.list({
              userId: 'me',
              labelIds: folder,
              pageToken: nextPageToken
            });
            retrievePageOfMessages(request, result);
          } else {
            cb(result);
          }
        });
      }
      try {
        var initialRequest = gapi.client.gmail.users.messages.list({
          userId: 'me',
          labelIds: folder
        });
        retrievePageOfMessages(initialRequest, []);
      } catch ( e ) {
        console.warn('Mailer::getMessages() exception', e, e.stack);
        console.warn('THIS ERROR OCCURS WHEN MULTIPLE REQUESTS FIRE AT ONCE ?!'); // FIXME
        cb([]);
      }
    }

    function storeItems(list, cb, all) {
      var index = 0;
      var save = [];

      if ( all ) {
        list.forEach(function(iter) {
          save.push(iter.toObject());
        });
        return self.database.insert({store: 'Messages', key: 'id'}, save, function() {
          cb();
        });
      }

      function _next() {
        if ( index >= list.length ) {
          self.database.insert({store: 'Messages', key: 'id'}, save, function() {
            cb();
          });
          return;
        }

        var idx = list[index].id;
        self.database.get({store: 'Messages'}, idx, function(error, result) {
          if ( error || !result ) {
            save.push(list[index].toObject());
          }

          index++;
          _next();
        });
      }

      _next();
    }

    function handleMessageList(list) {
      storeItems(list, function() {
        self.getMessages({folder: folder}, function(error, result) {
          if ( !error && result ) {
            opts.onmetadataloaded(result);
          }

          getMessageData(list, function() {
            storeItems(list, function() {
              callback(list);
            }, true);
          }, function(index, total, current) {
            opts.onprogress(index, total, current);
          });
        });
      });
    }

    findLastMessage(function() {
      retrieveAllMessages(function(list) {
        var result = [];
        list.forEach(function(iter, i) {
          result.push(new Message(iter.id, iter.threadId, 'Loading message \'' + iter.id + '\''));
        });

        handleMessageList(result);
      });
    });
  };

  Mailer.prototype.getMessages = function(opts, callback) {
    this.database.list({store: 'Messages'}, function(error, result) {
      var messages = [];
      if ( !error && result ) {
        result.forEach(function(iter) {
          messages.push(Message.createFromObject(iter));
        });
      }
      callback(error, messages);
    });
  };

  Mailer.prototype.getFolders = function(opts, callback) {
    function getFolders(cb) {
      var request = gapi.client.gmail.users.labels.list({
        userId: 'me'
      });

      request.execute(function(resp) {
        console.info('Mailer::getFolderList()', '=>', resp);
        if ( typeof resp.labels === 'object' && (resp.labels instanceof Array) ) {
          cb(resp.labels);
          return;
        }
        callback('Failed to get mailbox');
      });
    }

    getFolders(function(list) {
      var result = [];
      list.forEach(function(iter) {
        result.push(new Folder(iter.id, iter.name, {
          messageListVisibility: iter.messageListVisibility || null,
          labelListVisibility: iter.labelListVisibility || null,
          type: iter.type || null
        }));
      });
      callback(false, list);
    });
  };

  Mailer.prototype.getMessageData = function(id, callback) {
    getMessage(id, function(result) {
      callback(result);
    });
  };

  Mailer.prototype.getMessageBody = function(id, callback) {
    getMessage(id, function(result) {
      if ( result ) {
        var message = '';
        if ( result.payload && result.payload.body ) {
          var data = result.payload.body.data;
          message = Utils.urlsafe_b64decode(data);
        } else {
          callback('Message contains no data');
          return;
        }
        callback(false, message);
      } else {
        callback('Failed to fetch message: ' + id);
      }
    });
  };

  /////////////////////////////////////////////////////////////////////////////
  // Exports
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationMail = OSjs.Applications.ApplicationMail || {};
  OSjs.Applications.ApplicationMail.Mailer = Mailer;
  OSjs.Applications.ApplicationMail.Message = Message;
  OSjs.Applications.ApplicationMail.Folder = Folder;

})(OSjs.Utils, OSjs.VFS, OSjs.API);
