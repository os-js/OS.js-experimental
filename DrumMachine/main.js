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
(function(Application, Window, GUI, Dialogs, Utils) {

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

    this.$playButton = null;
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
    this.$playButton = toolBar.addItem('playButton', {title: ('Play'), onClick: function(ev) {
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
    this.dialogOptions = {
      mime: 'osjs/dbeat',
      mimes: ['osjs\\/dbeat'],
      defaultFilename: 'New Beat.odbeat'
    };
  };

  ApplicationDrumMachine.prototype = Object.create(Application.prototype);

  ApplicationDrumMachine.prototype.init = function(core, settings, metadata) {
    Application.prototype.init.apply(this, arguments);

    this.mainWindow = this._addWindow(new ApplicationDrumMachineWindow(this, metadata));
  };

  ApplicationDrumMachine.prototype.onNew = function() {
    OSjs.Applications.ApplicationDrumMachineLib.Reset();
  };

  ApplicationDrumMachine.prototype.onOpen = function(filename, mime, data) {
    OSjs.Applications.ApplicationDrumMachineLib.SetBeat(data);
  };

  ApplicationDrumMachine.prototype.onSave = function(filename, mime, data) {
  };

  ApplicationDrumMachine.prototype.onGetSaveData = function(callback) {
    callback(OSjs.Applications.DefaultApplicationLib.GetBeat());
  };

  ApplicationDrumMachine.prototype.callback = function(name, args) {
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumMachine = ApplicationDrumMachine;

})(OSjs.Helpers.DefaultApplication, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Utils);
