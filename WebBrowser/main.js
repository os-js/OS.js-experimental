/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2016, Anders Evenrud <andersevenrud@gmail.com>
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
(function(Application, Window, Utils, API, VFS, GUI) {
  'use strict';

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  function ApplicationWebBrowserWindow(app, metadata, scheme) {
    Window.apply(this, ['ApplicationWebBrowserWindow', {
      icon: metadata.icon,
      title: metadata.name,
      width: 600,
      height: 400
    }, app, scheme]);
  }

  ApplicationWebBrowserWindow.prototype = Object.create(Window.prototype);
  ApplicationWebBrowserWindow.constructor = Window.prototype;

  ApplicationWebBrowserWindow.prototype.init = function(wmRef, app, scheme) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Load and set up scheme (GUI) here
    scheme.render(this, 'WebBrowserWindow', root);

    var iframe = this._find('Browser').$element;
    /*
    iframe.addEventListener('load', function() {
      console.warn('xxx');
    });
    */

    var inp = this._find('InpLocation');
    inp.on('enter', function() {
      self.setLocation(inp.get('value'));
    });

    if ( (['nw', 'electron', 'x11']).indexOf(API.getConfig('Connection.Type')) === -1 ) {
      this._setWarning('Web Browser does not work in a browser deployed environment (Same-Origin-Policy / CORS)');
    }

    return root;
  };

  ApplicationWebBrowserWindow.prototype.destroy = function() {
    Window.prototype.destroy.apply(this, arguments);
  };

  ApplicationWebBrowserWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    var self = this;
    var path = this._app._getArgument('file');
    var url  = this._app._getArgument('url') || 'http://os.js.org';

    if ( path ) {
      VFS.url(path, function(err, res) {
        self.setLocation(res);
      });
    } else {
      this.setLocation(url);
    }

  };

  ApplicationWebBrowserWindow.prototype.setLocation = function(s) {
    this._find('InpLocation').set('value', s);
    this._find('Browser').set('src', s);
    this._find('Statusbar').set('value', 'Loading: ' + s);
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  function ApplicationWebBrowser(args, metadata) {
    Application.apply(this, ['ApplicationWebBrowser', args, metadata]);
  }

  ApplicationWebBrowser.prototype = Object.create(Application.prototype);
  ApplicationWebBrowser.constructor = Application;

  ApplicationWebBrowser.prototype.destroy = function() {
    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationWebBrowser.prototype.init = function(settings, metadata) {
    Application.prototype.init.apply(this, arguments);

    var self = this;
    this._loadScheme('./scheme.html', function(scheme) {
      self._addWindow(new ApplicationWebBrowserWindow(self, metadata, scheme));
    });
  };

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationWebBrowser = OSjs.Applications.ApplicationWebBrowser || {};
  OSjs.Applications.ApplicationWebBrowser.Class = ApplicationWebBrowser;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.Utils, OSjs.API, OSjs.VFS, OSjs.GUI);
