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
(function(Application, Window, GUI, Dialogs, Utils, API, VFS) {

  function queueMessageData(mailer, mailbox, onprogress, oncomplete) {
    var index = 0;
    var total = mailbox.length;

    function fetch(idx) {
      var iter = mailbox[idx];
      mailer.getMessageData(iter.id, function(result) {
        onprogress(iter, result, idx);

        _next();
      });
    }

    function _next() {
      if ( index >= total ) {
        oncomplete();
        return;
      }
      fetch(index);
      index++;
    }

    _next();
  }

  /////////////////////////////////////////////////////////////////////////////
  // CHILD WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationMailMessageWindow = function(opts, parentWin, app, metadata) {
    Window.apply(this, ['ApplicationMailMessageWindow', {width: 640, height: 300}, app]);

    this.options     = opts || {};
    this.statusBar   = null;
    this.messageView = null;

    var title = 'Mail Message';
    if ( opts.type === 'write' ) {
      title = 'Mail Message - Compose';
    } else {
      if ( opts.item ) {
        title = 'Mail Message - Read - ' + opts.item.Subject;
      } else {
        title = 'Mail Message - Read';
      }
    }

    // Set window properties and other stuff here
    this._title = title;
    this._icon  = parentWin._icon;
  };

  ApplicationMailMessageWindow.prototype = Object.create(Window.prototype);

  ApplicationMailMessageWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Create window contents (GUI) here
    var textTo       = null;
    var textSubject  = null;
    var menuBar      = this._addGUIElement(new GUI.MenuBar('MenuBar'), root);
    this.statusBar   = this._addGUIElement(new GUI.StatusBar('StatusBar'), root);
    this.messageView = this._addGUIElement(new GUI.RichText('MessageView'), root);

    function getMessageData() {
      return {
        subject: textSubject.getValue(),
        to: textTo.getValue(),
        message: self.messageView.getContent()
      };
    }

    menuBar.addItem(OSjs.API._('File'), [
      {title: OSjs.API._('Close'), onClick: function() {
        self._close();
      }}
    ]);

    if ( this.options.type === 'write' ) {
      textTo = this._addGUIElement(new GUI.Text('TextTo', {placeholder: 'To'}), root);
      textSubject = this._addGUIElement(new GUI.Text('TextSubject', {placeholder: 'Subject'}), root);

      Utils.$addClass(this._$root, 'ComposeWindow');
      menuBar.addItem(OSjs.API._('Send'));
      menuBar.addItem(OSjs.API._('Save draft'));
    }

    menuBar.onMenuOpen = function(menu, mpos, mtitle, menuBar) {
      if ( mtitle === OSjs.API._('Send') ) {
        self._parent._appRef.sendMessage(getMessageData(), self);
      } else if ( mtitle === OSjs.API._('Save draft') ) {
        self._parent._appRef.draftMessage(getMessageData(), self);
      }
    };

    return root;
  };

  ApplicationMailMessageWindow.prototype._inited = function() {
    var self = this;
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here
    if ( this.options.item ) {
      this._toggleLoading(true);

      this.statusBar.setText('Loading message...');
      this._parent._appRef.getMessage(this.options.item.Id, function(error, result) {
        self.statusBar.setText('Message loaded');
        if ( error ) {
          alert(error); // FIXME
        } else {
          self.messageView.setContent(result);
        }
        self._toggleLoading(false);
      });
    }
  };

  ApplicationMailMessageWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here

    Window.prototype.destroy.apply(this, arguments);

    this.statusBar   = null;
    this.messageView = null;
  };

  /////////////////////////////////////////////////////////////////////////////
  // MAIN WINDOW
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationMailWindow = function(app, metadata) {
    Window.apply(this, ['ApplicationMailWindow', {width: 640, height: 300}, app]);

    // Set window properties and other stuff here
    this._title = metadata.name + ' (Gmail) v0.1';
    this._icon  = metadata.icon;

    this.mailboxView = null;
    this.folderView  = null;
    this.statusBar   = null;
  };

  ApplicationMailWindow.prototype = Object.create(Window.prototype);

  ApplicationMailWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Create window contents (GUI) here
    var menuBar    = this._addGUIElement(new GUI.MenuBar('MenuBar'), root);
    var panedView  = this._addGUIElement(new GUI.PanedView('PanedView'), root);
    var viewLeft   = panedView.createView('Side', {width: 140});
    var viewRight  = panedView.createView('File');
    this.statusBar = this._addGUIElement(new GUI.StatusBar('StatusBar'), root);

    menuBar.addItem(OSjs.API._('File'), [
      {title: OSjs.API._('Close'), onClick: function() {
        self._close();
      }}
    ]);

    menuBar.addItem(OSjs.API._('Compose message'));
    menuBar.addItem(OSjs.API._('Fetch messages'));

    menuBar.onMenuOpen = function(menu, mpos, mtitle, menuBar) {
      if ( mtitle === OSjs.API._('Fetch messages') ) {
        self._appRef.fetch();
      } else if ( mtitle === OSjs.API._('Compose message') ) {
        self.createMessageWindow('write');
      }
    };

    this.folderView = this._addGUIElement(new OSjs.GUI.TreeView('FolderView'), viewLeft);
    this.folderView.render();

    this.mailboxView = this._addGUIElement(new OSjs.GUI.ListView('MailboxView'), viewRight);
    this.mailboxView.onActivate = function(ev, el, item) {
      self.createMessageWindow('read', item);
    };
    this.mailboxView.setColumns([
      {'visible': false, 'key': 'Id', 'title': 'Id', domProperties: {width: 100}},
      {'visible': false, 'key': 'Thread', 'title': 'Thread', domProperties: {width: 100}},
      {'key': 'Subject', 'title': 'Subject'},
      {'key': 'From', 'title': 'From', domProperties: {width: 100}},
      {'key': 'Date', 'title': 'Date', domProperties: {width: 100}}
    ]);
    this.mailboxView.render();

    return root;
  };

  ApplicationMailWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here
    this._appRef.initMailer(this);
  };

  ApplicationMailWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here
    Window.prototype.destroy.apply(this, arguments);

    this.mailboxView = null;
    this.folderView = null;
    this.statusBar = null;
  };

  ApplicationMailWindow.prototype.createMessageWindow = function(type, item) {
    var win = new ApplicationMailMessageWindow({
      type: type,
      item: item
    },this, this._appRef, {});

    this._addChild(win, true);
    win._focus();
  };

  ApplicationMailWindow.prototype.setStatusbarText = function(txt) {
    this.statusBar.setText(txt);
  };

  ApplicationMailWindow.prototype.renderFolders = function(list) {
    if ( !this.folderView ) { return; }
    var items = [];
    var roots = {
      '[Gmail]': [],
      '[Imap]': []
    };


    list.forEach(function(iter) {
      var split = iter.name.split('/', 2);
      var name  = split.shift();

      if ( name.match(/^CATEGORY_\w/) ) {
        return;
      } else if ( name.match(/^(DRAFT|UNREAD|INBOX|TRASH|IMPORTANT|SPAM|STARRED|SENT)$/) ) {
        split.push(name);
        name = '[Gmail]';
      }

      if ( !roots[name] ) {
        roots[name] = [];
      }

      split.forEach(function(iter) {
        roots[name].push({
          title: iter
        });
      });
    });

    Object.keys(roots).forEach(function(name) {
      items.push({
        title: name,
        items: roots[name]
      });
    });

    this.folderView.setData(items);
    this.folderView.render();
  };

  ApplicationMailWindow.prototype.renderMailbox = function(list, cached) {
    if ( !this.mailboxView ) { return; }
    var rows = [];

    list.forEach(function(iter) {
      rows.push({
        'Id':       iter.id,
        'Thread':   iter.threadId,
        'Subject':  iter.subject,
        'From':     iter.from,
        'Date':     iter.date
      });
    });

    this.mailboxView.setRows(rows);
    this.mailboxView.render();
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationMail = function(args, metadata) {
    Application.apply(this, ['ApplicationMail', args, metadata]);

    // You can set application variables here
    this.mainWindow = null;
    this.mailer = new OSjs.Applications.ApplicationMail.Mailer();
  };

  ApplicationMail.prototype = Object.create(Application.prototype);

  ApplicationMail.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here
    if ( this.mailer ) {
      this.mailer.destroy();
    }
    this.mailer = null;

    var result = Application.prototype.destroy.apply(this, arguments);
    this.mainWindow = null;
    return result;
  };

  ApplicationMail.prototype.init = function(settings, metadata) {
    Application.prototype.init.apply(this, arguments);
    this.mainWindow = this._addWindow(new ApplicationMailWindow(this, metadata));
  };

  ApplicationMail.prototype._onMessage = function(obj, msg, args) {
    Application.prototype._onMessage.apply(this, arguments);

    // Make sure we kill our application if main window was closed
    if ( msg == 'destroyWindow' && obj._name === 'ApplicationMailWindow' ) {
      this.destroy();
    }
  };

  ApplicationMail.prototype.initMailer = function(win) {
    var self = this;
    this.mainWindow = win; // FIXME: WTF ?! Why is this null after init() ?!?!?!
    if ( this.mailer ) {
      this.mainWindow._toggleLoading(true);
      this.mailer.init(function(error, success) {
        self.mainWindow._toggleLoading(false);

        self.initViews(function() {
          self.fetch();
        });
      });
    }
  };

  ApplicationMail.prototype.fetch = function() {
    var mailer = this.mailer;
    var self = this;

    if ( !mailer ) {return;}

    this.mainWindow.setStatusbarText('Updating message database...');
    mailer.updateMessages({
      onpage: function(result) {
      },

      onmetadataloaded: function(result) {
        if ( result ) {
          self.mainWindow.renderMailbox(result);
        }
      },
      onprogress: function(index, total, current) {
        if ( self.mainWindow ) {
          self.mainWindow.setStatusbarText(Utils.format('Loading message {0} of {1} ({2})', index, total, current.id));
        }
      }
    }, function(result) {
      self.mainWindow.setStatusbarText('Updated message database');
      if ( result ) {
        self.mainWindow.renderMailbox(result);
      }
    });
  };

  ApplicationMail.prototype.initViews = function(callback) {
    callback = callback || function() {};

    var mailer = this.mailer;
    var self = this;

    if ( !mailer ) {return;}

    function queueMailbox() {
      var first = null;

      self.mainWindow.setStatusbarText('Loading messages...');
      mailer.getMessages({folder: 'INBOX'}, function(error, result) {
        callback();

        if ( error ) {
          console.error('ApplicationMail::fetch()', 'getMessages()', error);
          return;
        }

        self.mainWindow.setStatusbarText('');
        if ( result ) {
          self.mainWindow.renderMailbox(result);
        }
      });
    }

    function queueFolders() {
      self.mainWindow.setStatusbarText('Loading folders...');
      mailer.getFolders({}, function(error, folders) {
        queueMailbox();

        if ( error ) {
          alert(error); // FIXME
          return;
        }
        self.mainWindow.setStatusbarText('Loaded folders...');
        self.mainWindow.renderFolders(folders);
      });
    }

    queueFolders();
  };

  ApplicationMail.prototype.getMessage = function(id, callback) {
    if ( this.mailer ) {
      this.mailer.getMessageBody(id, callback);
    }
  };

  ApplicationMail.prototype.sendMessage = function(msg, win) {
    if ( !msg ) { return; }
    if ( !msg.to ) {
      throw 'Missing reciever';
    }
    if ( !msg.subject ) {
      throw 'Missing subject';
    }

    this.mailer.sendMessage(msg, function(error, result) {
      if ( error ) {
        alert(error); // FIXME
        return;
      }
      win._close();
    });
  };

  ApplicationMail.prototype.draftMessage = function(msg, win) {
    this.mailer.draftMessage(function(error, result) {
      if ( error ) {
        alert(error); // FIXME
        return;
      }
      win._close();
    });
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationMail = OSjs.Applications.ApplicationMail || {};
  OSjs.Applications.ApplicationMail.Class = ApplicationMail;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Utils, OSjs.API, OSjs.VFS);
