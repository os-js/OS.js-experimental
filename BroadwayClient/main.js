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

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationBroadwayClientWindow = function(app, metadata) {
    Window.apply(this, ['ApplicationBroadwayClientWindow', {width: 400, height: 220}, app]);

    // Set window properties and other stuff here
    this._title = metadata.name;
    this._icon  = metadata.icon;

    this._properties.allow_maximize = false;
    this._properties.allow_resize   = false;
    this._properties.gravity        = 'center';
  };

  ApplicationBroadwayClientWindow.prototype = Object.create(Window.prototype);

  ApplicationBroadwayClientWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;
    var supported = OSjs.Core.Broadway ? true : false;

    var connect, proc, stat;

    // Create window contents (GUI) here
    var lbl = 'Broadway support is ' + (supported ? 'loaded' : 'not loaded');
    var stat = this._addGUIElement(new GUI.Label('LabelStatus', {label: lbl}), root);
    Utils.$addClass(stat.$element, supported ? 'supported' : 'unsupported');

    var host = this._addGUIElement(new GUI.Text('TextHost', {value: 'ws://10.0.0.113:8085/socket'}), root);
    var init = this._addGUIElement(new GUI.Button('ButtonConnect', {label: 'Connect', onClick: function() {
      init.setDisabled(true);
      if ( stat ) {
        stat.setLabel('Connecting...');
      }

      OSjs.Core.Broadway.init(host.getValue(), function(error) {
        if ( error ) {
          console.warn('BroadwayClient', error);
          stat.setLabel(error);
          init.setDisabled(false);
        } else {
          connect.setDisabled(false);
          proc.setDisabled(false);
          init.setDisabled(true);
          stat.setLabel('Connected...');
        }
      }, function() {
        stat.setLabel('Disconnected...');
        init.setDisabled(false);
        proc.setDisabled(true);
        connect.setDisabled(true);
      });
    }}), root);
    init.setDisabled(!supported);

    this._addGUIElement(new GUI.Label('LabelStartProcess', {label: 'Start new process:'}), root);
    proc = this._addGUIElement(new GUI.Text('TextStartProcess', {value: '/usr/bin/gtk3-demo THIS IS NOT IMPLEMENTED YET', disabled: true}), root);
    connect = this._addGUIElement(new GUI.Button('ButtonStartProcess', {label: 'Launch', disabled: true}), root);
    stat = this._addGUIElement(new GUI.Label('LabelError', {label: ''}), root);

    return root;
  };

  ApplicationBroadwayClientWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here

  };

  ApplicationBroadwayClientWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here

    Window.prototype.destroy.apply(this, arguments);
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationBroadwayClient = function(args, metadata) {
    Application.apply(this, ['ApplicationBroadwayClient', args, metadata]);

    // You can set application variables here
  };

  ApplicationBroadwayClient.prototype = Object.create(Application.prototype);

  ApplicationBroadwayClient.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here

    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationBroadwayClient.prototype.init = function(settings, metadata) {
    var self = this;

    Application.prototype.init.apply(this, arguments);

    // Create your main window
    var mainWindow = this._addWindow(new ApplicationBroadwayClientWindow(this, metadata));

    // Do other stuff here
  };

  ApplicationBroadwayClient.prototype._onMessage = function(obj, msg, args) {
    Application.prototype._onMessage.apply(this, arguments);

    // Make sure we kill our application if main window was closed
    if ( msg == 'destroyWindow' && obj._name === 'ApplicationBroadwayClientWindow' ) {
      this.destroy();
    }
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationBroadwayClient = OSjs.Applications.ApplicationBroadwayClient || {};
  OSjs.Applications.ApplicationBroadwayClient.Class = ApplicationBroadwayClient;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Utils, OSjs.API, OSjs.VFS);
