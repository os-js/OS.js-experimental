/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2017, Anders Evenrud <andersevenrud@gmail.com>
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
const Application = OSjs.require('core/application');
const Window = OSjs.require('core/window');
const Config = OSjs.require('core/config');
const VFS = OSjs.require('vfs/fs');

class ApplicationWebBrowserWindow extends Window {

  constructor(app, metadata) {
    super('ApplicationWebBrowserWindow', {
      icon: metadata.icon,
      title: metadata.name,
      width: 600,
      height: 400
    }, app);
  }

  init(wmRef, app) {
    const root = super.init(...arguments);

    // Load and set up scheme (GUI) here
    this._render('WebBrowserWindow', require('osjs-scheme-loader!scheme.html'));

    /*
    var iframe = this._find('Browser').$element;
    iframe.addEventListener('load', function() {
      console.warn('xxx');
    });
    */

    var inp = this._find('InpLocation');
    inp.on('enter', () => {
      this.setLocation(inp.get('value'));
    });

    if ( (['nw', 'electron', 'x11']).indexOf(Config.getConfig('Connection.Type')) === -1 ) {
      this._setWarning('Web Browser does not work in a browser deployed environment (Same-Origin-Policy / CORS)');
    }

    return root;
  }

  _inited() {
    super._inited(...arguments);

    var path = this._app._getArgument('file');
    var url  = this._app._getArgument('url') || 'http://os-js.org';

    if ( path ) {
      VFS.url(path).then((r) => this.setLocation(r));
    } else {
      this.setLocation(url);
    }

  }

  setLocation(s) {
    this._find('InpLocation').set('value', s);
    this._find('Browser').set('src', s);
    this._find('Statusbar').set('value', 'Loading: ' + s);
  }
}

class ApplicationWebBrowser extends Application {

  constructor(args, metadata) {
    super('ApplicationWebBrowser', args, metadata);
  }

  init(settings, metadata) {
    super.init(...arguments);

    this._addWindow(new ApplicationWebBrowserWindow(this, metadata));
  }
}

OSjs.Applications.ApplicationWebBrowser = ApplicationWebBrowser;

