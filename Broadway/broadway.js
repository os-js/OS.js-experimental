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
(function(Window, Utils, API) {
  'use strict';

  var _WIN;

  function createNotification() {
    var wm = API.getWMInstance();

    function displayMenu(ev) {
      var pos = {x: ev.clientX, y: ev.clientY};
      OSjs.GUI.createMenu([{
        title: 'Disconnect from Broadway server',
        onClick: function() {
          window.GTK.disconnect();
        }
      }], pos);
    }

    if ( wm ) {
      wm.createNotificationIcon('BroadwayService', {
        onContextMenu: function(ev) {
          displayMenu(ev);
          return false;
        },
        onClick: function(ev) {
          displayMenu(ev);
          return false;
        },
        onInited: function(el) {
          if ( el.firstChild ) {
            var img = document.createElement('img');
            img.src = API.getThemeResource('status/network-transmit-receive.png', 'icon', '16x16');
            el.firstChild.appendChild(img);
          }
        }
      });
    }
  }

  function removeNotification() {
    var wm = API.getWMInstance();
    if ( wm ) {
      wm.removeNotificationIcon('BroadwayService');
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // WINDOW
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Dialog Window
   */
  var BroadwayWindow = function(id, x, y, w, h) {
    Window.apply(this, ['BroadwayWindow' + id, {}]);

    this._dimension.w = w;
    this._dimension.h = h;
    this._position.x  = x;
    this._position.y  = y;
    this._title       = 'Broadway Window ' + id.toString();

    this._properties.allow_resize     = false;
    this._properties.allow_minimize   = false;
    this._properties.allow_maximize   = false;
    this._properties.allow_session    = false;
    this._properties.key_capture      = true; // IMPORTANT

    this._broadwayId = id;
    this._canvas = document.createElement('canvas');
  };

  BroadwayWindow.prototype = Object.create(Window.prototype);

  BroadwayWindow.prototype.init = function() {
    var self = this;
    var root = Window.prototype.init.apply(this, arguments);
    this._canvas.width = this._dimension.w;
    this._canvas.height = this._dimension.h;


    function getMousePos(ev) {
      return {
        x:ev.pageX - self._position.x,
        y:ev.pageY - self._position.y - 26 // FIXME
      };
    }

    function inject(type, ev) {
      var pos = getMousePos(ev);
      return window.GTK.inject(self._broadwayId, type, ev, {
        wx: self._position.x,
        wy: self._position.y,
        mx: parseInt(pos.x, 0),
        my: parseInt(pos.y, 0)
      });
    }

    this._addEventListener(this._canvas, 'mousemove', function(ev) {
      return inject('mousemove', ev);
    });
    this._addEventListener(this._canvas, 'mousedown', function(ev) {
      return inject('mousedown', ev);
    });
    this._addEventListener(this._canvas, 'mouseup', function(ev) {
      return inject('mouseup', ev);
    });
    this._addEventListener(this._canvas, 'DOMMouseScroll', function(ev) {
      return inject('mousewheel', ev);
    });
    this._addEventListener(this._canvas, 'mousewheel', function(ev) {
      return inject('mousewheel', ev);
    });

    root.appendChild(this._canvas);
    return root;
  };

  BroadwayWindow.prototype.destroy = function() {
    Window.prototype.destroy.apply(this, arguments);
    this._canvas = null;
  };

  BroadwayWindow.prototype._close = function() {
    if ( !Window.prototype._close.apply(this, arguments) ) {
      return false;
    }

    window.GTK.close(this._broadwayId);

    return true;
  };

  BroadwayWindow.prototype._focus = function() {
    if ( !Window.prototype._focus.apply(this, arguments) ) {
      return false;
    }
    _WIN = this;
    return true;
  };

  BroadwayWindow.prototype._blur = function() {
    if ( !Window.prototype._blur.apply(this, arguments) ) {
      return false;
    }
    _WIN = null;
    return true;
  };

  BroadwayWindow.prototype._onKeyEvent = function(ev, type) {
    window.GTK.inject(this._broadwayId, type, ev);
  };

  BroadwayWindow.prototype._onChange = function(ev) {
    if ( ev === 'move' ) {
      window.GTK.move(this._broadwayId, this._position.x, this._position.y);
    } else if ( ev === 'resize' ) {
      window.GTK.resize(this._broadwayId, this._dimension.w, this._dimension.h);
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // API
  /////////////////////////////////////////////////////////////////////////////


  OSjs.Core.Broadway = {};
  OSjs.Core.Broadway.init = function() {
    var metadata = API.getHandlerInstance().getApplicationMetadata("ExtensionBroadway");
    var config = metadata.config;
    var host = config.server;
    var wm = API.getWMInstance();

    window.GTK.connect(host, {
      onSocketOpen: function() {
        createNotification();
      },

      onSocketClose: function() {
        removeNotification();
      },

      onFlushSurface: function(id, q) {
        if ( wm ) {
          var win = wm.getWindow('BroadwayWindow' + id);
          if ( win ) {
            return win._canvas;
          }
        }
        return null;
      },

      onDeleteSurface: function(id) {
        if ( wm ) {
          var win = wm.getWindow('BroadwayWindow' + id);
          if ( win ) {
            win._close();
          }
        }
      },

      onShowSurface: function(id) {
        if ( wm ) {
          var win = wm.getWindow('BroadwayWindow' + id);
          if ( win ) {
            win._restore();
          }
        }
      },

      onHideSurface: function(id) {
        if ( wm ) {
          var win = wm.getWindow('BroadwayWindow' + id);
          if ( win ) {
            win._minimize();
          }
        }
      },

      onMoveSurface: function(id, has_pos, x, y, has_size, w, h) {
        if ( wm ) {
          var win = wm.getWindow('BroadwayWindow' + id);
          if ( win ) {
            if ( has_pos ) {
              win._move(x, y);
            }
            if ( has_size ) {
              win._resize(w, h);
            }
          }
        }
      },

      onCreateSurface: function(id, x, y, w, h) {
        var win = new BroadwayWindow(id, x, y, w, h);
        wm.addWindow(win);
        return win._canvas;
      }

    });

  };

})(OSjs.Core.Window, OSjs.Utils, OSjs.API);
