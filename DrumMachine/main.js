/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2013, Anders Evenrud <andersevenrud@gmail.com>
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
(function(Application, Window, GUI, Dialogs) {

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationDrumMachineWindow = function(app, metadata) {
    Window.apply(this, ['ApplicationDrumMachineWindow', {width: 720, height: 560}, app]);

    // Set window properties and other stuff here
    this._title = metadata.name;
    this._icon  = metadata.icon;
    this._properties.allow_resize = false;
    this._properties.allow_maximize = false;
  };

  ApplicationDrumMachineWindow.prototype = Object.create(Window.prototype);

  ApplicationDrumMachineWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Create window contents (GUI) here
    var menuBar = this._addGUIElement(new GUI.MenuBar('ApplicationDrumMachineMenuBar'), root);
    menuBar.addItem(OSjs._("File"), [
      {title: OSjs._('New'), name: 'New', onClick: function() {
        app.action("new");
      }},
      {title: OSjs._('Open'), name: 'Open', onClick: function() {
        app.action("open");
      }},
      {title: OSjs._('Save'), name: 'Save', onClick: function() {
        app.action("save");
      }},
      {title: OSjs._('Save As...'), name: 'SaveAs', onClick: function() {
        app.action("saveas");
      }},
      {title: OSjs._('Close'), name: 'Close', onClick: function() {
        app.action("close");
      }}
    ]);

    menuBar.addItem(OSjs._("Demo Tracks"), [
      {title: OSjs._('Demo1'), name: 'Demo1', onClick: function() {
        OSjs.Applications.ApplicationDrumMachineLib.SetDemo(1);
      }},
      {title: OSjs._('Demo2'), name: 'Demo2', onClick: function() {
        OSjs.Applications.ApplicationDrumMachineLib.SetDemo(2);
      }},
      {title: OSjs._('Demo3'), name: 'Demo3', onClick: function() {
        OSjs.Applications.ApplicationDrumMachineLib.SetDemo(3);
      }},
      {title: OSjs._('Demo4'), name: 'Demo4', onClick: function() {
        OSjs.Applications.ApplicationDrumMachineLib.SetDemo(4);
      }},
      {title: OSjs._('Demo5'), name: 'Demo5', onClick: function() {
        OSjs.Applications.ApplicationDrumMachineLib.SetDemo(5);
      }}
    ]);

    var toolBar = this._addGUIElement(new GUI.ToolBar('ApplicationDrumMachineToolBar'), root);
    toolBar.addItem('playButton', {title: ('Play'), onClick: function(ev) {
      OSjs.Applications.ApplicationDrumMachineLib.TogglePlay();
    }});
    toolBar.render();

    return root;
  };

  ApplicationDrumMachineWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here

    var self = this;
    var uri = OSjs.API.getApplicationResource(this._appRef, "index.html");
    OSjs.Utils.Ajax(uri, function(response, httpRequest, url) {
      if ( !response ) {
        alert("No content was found for example handler login HTML");
        return;
      }

      var tmpEl = document.createDocumentFragment();
      var tmpInner = document.createElement("div");
      tmpInner.innerHTML = response;
      tmpEl.appendChild(tmpInner);
      self._$root.appendChild(tmpEl);

      setTimeout(function() {
        OSjs.Applications.ApplicationDrumMachineLib.Init(self._appRef, self);
      }, 0);
    }, function(error, response, httpRequest) {
      alert("Failed to fetch HTML");
    }, {method: 'GET', parse: true});
  };

  ApplicationDrumMachineWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here

    Window.prototype.destroy.apply(this, arguments);
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationDrumMachine = function(args, metadata) {
    Application.apply(this, ['ApplicationDrumMachine', args, metadata]);

    // You can set application variables here
  };

  ApplicationDrumMachine.prototype = Object.create(Application.prototype);

  ApplicationDrumMachine.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here

    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationDrumMachine.prototype.init = function(core, settings, metadata) {
    var self = this;

    Application.prototype.init.apply(this, arguments);

    // Create your main window
    var mainWindow = this._addWindow(new ApplicationDrumMachineWindow(this, metadata));

    // Do other stuff here
    // See 'DefaultApplication' sample in 'helpers.js' for more code
  };

  ApplicationDrumMachine.prototype._onMessage = function(obj, msg, args) {
    Application.prototype._onMessage.apply(this, arguments);

    // Make sure we kill our application if main window was closed
    if ( msg == 'destroyWindow' && obj._name === 'ApplicationDrumMachineWindow' ) {
      this.destroy();
    }
  };

  /**
   * Perform an external action
   */
  ApplicationDrumMachine.prototype.action = function(action, filename, mime) {
    switch ( action ) {
      case 'new' :
        this.onNew();
      break;

      case 'open' :
        this.onOpen(filename, mime);
      break;

      case 'save' :
        this.onSave(filename, mime);
      break;

      case 'saveas' :
        this.onSaveAs(filename, mime);
      break;

      case 'close' :
        this.destroy();
      break;
    }
  };

  /**
   * Open given file
   */
  ApplicationDrumMachine.prototype.doOpen = function(filename, mime, data) {
    OSjs.Applications.ApplicationDrumMachineLib.SetBeat(data);
  };

  /**
   * Save to given file
   */
  ApplicationDrumMachine.prototype.doSave = function(filename, mime) {
    var self = this;
    var win = this._getWindow('ApplicationDrumMachineWindow');

    var _onSaveFinished = function(name) {
      self.setCurrentFile(name, mime);
      OSjs.API.getCoreInstance().message('vfs', {type: 'write', path: OSjs.Utils.dirname(name), filename: OSjs.Utils.filename(name), source: self.__pid});
    };

    var data = OSjs.Applications.ApplicationDrumMachineLib.GetBeat();

    win._toggleLoading(true);
    OSjs.API.call('fs', {'method': 'write', 'arguments': [filename, data]}, function(res) {
      if ( res && res.result ) {
        _onSaveFinished(filename);
      } else {
        if ( res && res.error ) {
          self.onError(OSjs._("Failed to save file: {0}", filename), res.error, "doSave");
          return;
        }
        self.onError(OSjs._("Failed to save file: {0}", filename), OSjs._("Unknown error"), "doSave");
      }
    }, function(error) {
      self.onError(OSjs._("Failed to save file (call): {0}", filename), error, "doSave");
    });
  };

  /**
   * File operation error
   */
  ApplicationDrumMachine.prototype.onError = function(error, action) {
    action || "unknown";

    this.setCurrentFile(null, null);

    var win = this._getWindow('ApplicationDrumMachineWindow');
    if ( win ) {
      win._error(OSjs._("{0} Application Error", self.__label), OSjs._("Failed to perform action '{0}'", action), error);
      win._toggleDisabled(false);
    } else {
      OSjs.API.error(OSjs._("{0} Application Error", self.__label), OSjs._("Failed to perform action '{0}'", action), error);
    }
  };

  /**
   * Wrapper for save action
   */
  ApplicationDrumMachine.prototype.onSave = function(filename, mime) {
    if ( this.currentFilename ) {
      this.doSave(this.currentFilename, mime);
    }
  };

  /**
   * Wrapper for save as action
   */
  ApplicationDrumMachine.prototype.onSaveAs = function(filename, mime) {
    var self = this;
    var win = this._getWindow('ApplicationDrumMachineWindow');
    var dir = this.currentFilename ? Utils.dirname(this.currentFilename) : null;
    var fnm = this.currentFilename ? Utils.filename(this.currentFilename) : null;

    if ( win ) {
      win._toggleDisabled(true);
      this._createDialog('File', [{type: 'save', path: dir, filename: fnm, mime: 'osjs/dbeat', mimes: ['osjs\\/dbeat'], defaultFilename: 'New Beat.dbeat', filetypes: FileTypes}, function(btn, fname) {
        if ( win ) {
          win._toggleDisabled(false);
        }
        if ( btn !== 'ok' ) return;
        self.doSave(fname, mime);
      }], win);
    }
  };

  /**
   * Wrapper for open action
   */
  ApplicationDrumMachine.prototype.onOpen = function(filename, mime) {
    var self = this;
    var win = this._getWindow('ApplicationDrumMachineWindow');

    var _openFile = function(fname, fmime) {
      if ( !fmime || (fmime != "osjs/draw" && !fmime.match(/^image/)) ) {
        OSjs.API.error(self.__label, OSjs._("Cannot open file"), OSjs._("Not supported!"));
        return;
      }

      var ext = OSjs.Utils.filext(fname).toLowerCase();

      win.setTitle('Loading...');
      win._toggleLoading(true);
      OSjs.API.call('fs', {'method': 'read', 'arguments': [fname]}, function(res) {
        if ( res && res.result ) {
          self.doOpen(fname, fmime, res.result);
        } else {
          if ( res && res.error ) {
            self.onError(OSjs._("Failed to open file: {0}", fname), res.error, "onOpen");
            return;
          }
          self.onError(OSjs._("Failed to open file: {0}", fname), OSjs._("Unknown error"), "onOpen");
        }
      }, function(error) {
        self.onError(OSjs._("Failed to open file (call): {0}", fname), error, "onOpen");
      });
    };

    if ( filename ) {
      _openFile(filename, mime);
    } else {
      var path = (this.currentFilename) ? Utils.dirname(this.currentFilename) : null;

      win._toggleDisabled(true);

      this._createDialog('File', [{type: 'open', mime: 'osjs/dbeat', mimes: ['osjs\\/dbeat'], path: path}, function(btn, fname, fmime) {
        if ( win ) {
          win._toggleDisabled(false);
        }

        if ( btn !== 'ok' ) return;
        _openFile(fname, fmime);
      }], win);
    }
  };

  /**
   * Wrapper for new action
   */
  ApplicationDrumMachine.prototype.onNew = function() {
    this.setCurrentFile(null, null);
    OSjs.Applications.ApplicationDrumMachineLib.Reset();
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumMachine = ApplicationDrumMachine;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs);
