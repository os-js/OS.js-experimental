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

  function getMessageData(list, callback) {
    var index  = 0;

    function _next() {
      if ( index >= list.length ) {
        callback(list);
        return;
      }

      var iter = list[index];
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
    this.loaded = false;
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
    msg.loaded = true;
    Object.keys(o).forEach(function(i) {
      msg[i] = o[i];
    });
    return msg;
  };

  /////////////////////////////////////////////////////////////////////////////
  // Gmail
  /////////////////////////////////////////////////////////////////////////////

  function GmailMailer() {
    this.userName   = '';
    this.userEmail  = '';
  }

  GmailMailer.prototype.destroy = function() {};

  GmailMailer.prototype.init = function(callback) {
    callback = callback || function() {};
    var self = this;
    var scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/plus.profile.emails.read',
      'https://mail.google.com',
      'openid'
    ];

    OSjs.Handlers.getGoogleAPI([], scopes, function(error, result) {
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
            callback(true);
          });
        });
      });
    });
  };

  GmailMailer.prototype.sendMessage = function(opts, callback) {
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
      console.info('GmailMailer::sendMessage()', '=>', resp);
      if ( resp && resp.id ) {
        callback(false, resp);
      } else {
        callback('Failed to send message');
      }
    });
  };

  GmailMailer.prototype.getFolderList = function(opts, callback) {
    function getFolders(cb) {
      var request = gapi.client.gmail.users.labels.list({
        userId: 'me'
      });

      request.execute(function(resp) {
        console.info('GmailMailer::getFolderList()', '=>', resp);
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

  GmailMailer.prototype.getMailboxList = function(opts, callback) {
    var folder = opts.folder || null;

    function retrieveAllMessages(cb) {
      var retrievePageOfMessages = function(request, result) {
        request.execute(function(resp) {
          console.info('GmailMailer::getMailboxList()', '=>', resp);

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
        console.warn('GmailMailer::getMailboxList() exception', e, e.stack);
        console.warn('THIS ERROR OCCURS WHEN MULTIPLE REQUESTS FIRE AT ONCE ?!'); // FIXME
        cb([]);
      }
    }

    retrieveAllMessages(function(list) {
      var result = [];
      var finished = false;

      list.forEach(function(iter, i) {
        if ( iter.id === opts.last ) {
          console.warn("YOU ALREADY HAVE ALL MESSAGES IN CACHE :-)");
          finished = true;
          return false;
        }

        result.push(new Message(iter.id, iter.threadId, 'Loading message \'' + iter.id + '\''));
        return true;
      });

      if ( finished ) {
        callback(false, [], finished);
      } else {
        callback(false, result, false);
      }
    });
  };

  GmailMailer.prototype.getMessageData = function(id, callback) {
    getMessage(id, function(result) {
      callback(result);
    });
  };

  GmailMailer.prototype.getMessageBody = function(id, callback) {
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
  // Mailer
  /////////////////////////////////////////////////////////////////////////////

  function Mailer() {
    this.module = new GmailMailer();
  }

  Mailer.prototype.init = function(callback) {
    if ( this.module ) {
      this.module.init(callback);
    }
  };

  Mailer.prototype.destroy = function() {
    if ( this.module ) {
      this.module.destroy();
    }
    this.module = null;
  };

  Mailer.prototype.sendMessage = function(message, callback) {
    this.module.sendMessage(message, callback);
  };

  Mailer.prototype.draftMessage = function(message, callback) {
    callback('Not implemented');
  };

  Mailer.prototype.getMailboxList = function(opts, callback) {
    this.module.getMailboxList(opts, callback);
  };

  Mailer.prototype.getFolderList = function(opts, callback) {
    this.module.getFolderList(opts, callback);
  };

  Mailer.prototype.getMessageData = function(opts, callback) {
    this.module.getMessageData(opts, callback);
  };

  Mailer.prototype.getMessageBody = function(opts, callback) {
    this.module.getMessageBody(opts, callback);
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
