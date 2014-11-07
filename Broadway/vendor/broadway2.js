/**
 * This a rewrite of GTK broadway.js
 *
 * THIS IS A WORK IN PROGRESS AND NOT NEAR COMPLETION
 *
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
(function() {

  var lastTimeStamp = 0;
  var lastState;
  var inputSocket = null;
  var globalOpts = {};
  var connection;
  var outstandingCommands = [];
  var lastSerial = 0;
  var surfaces = {};
  var base64Values = [
      255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
      255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,255,
      255,255,255,255,255,255,255,255,255,255,255, 62,255,255,255, 63,
      52, 53, 54, 55, 56, 57, 58, 59, 60, 61,255,255,255,  0,255,255,
      255,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
      15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,255,255,255,255,255,
      255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,255,255,255,255,255
  ];

  var GDK_CROSSING_NORMAL = 0;
  var GDK_CROSSING_GRAB = 1;
  var GDK_CROSSING_UNGRAB = 2;

  // GdkModifierType
  var GDK_SHIFT_MASK = 1 << 0;
  var GDK_LOCK_MASK     = 1 << 1;
  var GDK_CONTROL_MASK  = 1 << 2;
  var GDK_MOD1_MASK     = 1 << 3;
  var GDK_MOD2_MASK     = 1 << 4;
  var GDK_MOD3_MASK     = 1 << 5;
  var GDK_MOD4_MASK     = 1 << 6;
  var GDK_MOD5_MASK     = 1 << 7;
  var GDK_BUTTON1_MASK  = 1 << 8;
  var GDK_BUTTON2_MASK  = 1 << 9;
  var GDK_BUTTON3_MASK  = 1 << 10;
  var GDK_BUTTON4_MASK  = 1 << 11;
  var GDK_BUTTON5_MASK  = 1 << 12;
  var GDK_SUPER_MASK    = 1 << 26;
  var GDK_HYPER_MASK    = 1 << 27;
  var GDK_META_MASK     = 1 << 28;
  var GDK_RELEASE_MASK  = 1 << 30;

  /////////////////////////////////////////////////////////////////////////////
  // HELPERS
  /////////////////////////////////////////////////////////////////////////////

  function base64_8(str, index) {
    var v =
      (base64Values[str.charCodeAt(index)]) +
      (base64Values[str.charCodeAt(index+1)] << 6);
    return v;
  }

  function base64_16(str, index) {
    var v =
      (base64Values[str.charCodeAt(index)]) +
      (base64Values[str.charCodeAt(index+1)] << 6) +
      (base64Values[str.charCodeAt(index+2)] << 12);
    return v;
  }

  function base64_16s(str, index) {
    var v = base64_16(str, index);
    if (v > 32767) return v - 65536;
    return v;
  }

  function base64_24(str, index) {
    var v =
      (base64Values[str.charCodeAt(index)]) +
      (base64Values[str.charCodeAt(index+1)] << 6) +
      (base64Values[str.charCodeAt(index+2)] << 12) +
      (base64Values[str.charCodeAt(index+3)] << 18);
    return v;
  }

  function base64_32(str, index) {
    var v =
      (base64Values[str.charCodeAt(index)]) +
      (base64Values[str.charCodeAt(index+1)] << 6) +
      (base64Values[str.charCodeAt(index+2)] << 12) +
      (base64Values[str.charCodeAt(index+3)] << 18) +
      (base64Values[str.charCodeAt(index+4)] << 24) +
      (base64Values[str.charCodeAt(index+5)] << 30);
    return v;
  }

  /////////////////////////////////////////////////////////////////////////////
  // WRAPPERS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Command for text-based connection
   */
  function TextCommands(message) {
    this.data = message;
    this.length = message.length;
    this.pos = 0;
  }
  TextCommands.prototype.get_char = function() {
    return this.data[this.pos++];
  };
  TextCommands.prototype.get_bool = function() {
    return this.get_char() == '1';
  };
  TextCommands.prototype.get_flags = function() {
    return this.get_char() - 48;
  }
  TextCommands.prototype.get_16 = function() {
    var n = base64_16(this.data, this.pos);
    this.pos = this.pos + 3;
    return n;
  };
  TextCommands.prototype.get_16s = function() {
    var n = base64_16s(this.data, this.pos);
    this.pos = this.pos + 3;
    return n;
  };
  TextCommands.prototype.get_32 = function() {
    var n = base64_32(this.data, this.pos);
    this.pos = this.pos + 6;
    return n;
  };
  TextCommands.prototype.get_image_url = function() {
    var size = this.get_32();
    var url = this.data.slice(this.pos, this.pos + size);
    this.pos = this.pos + size;
    return url;
  };
  TextCommands.prototype.free_image_url = function(url) {
  };

  /**
   * Command for binary/arraybuffer connection
   */
  function BinCommands(message) {
    this.arraybuffer = message;
    this.u8 = new Uint8Array(message);
    this.length = this.u8.length;
    this.pos = 0;
  }
  BinCommands.prototype.get_char = function() {
    return String.fromCharCode(this.u8[this.pos++]);
  };
  BinCommands.prototype.get_bool = function() {
    return this.u8[this.pos++] != 0;
  };
  BinCommands.prototype.get_flags = function() {
    return this.u8[this.pos++];
  }
  BinCommands.prototype.get_16 = function() {
    var v = this.u8[this.pos] + (this.u8[this.pos+1] << 8);
    this.pos = this.pos + 2;
    return v;
  };
  BinCommands.prototype.get_16s = function() {
    var v = this.get_16 ();
    if (v > 32767) return v - 65536;
    return v;
  };
  BinCommands.prototype.get_32 = function() {
    var v = this.u8[this.pos] +
            (this.u8[this.pos+1] << 8) +
            (this.u8[this.pos+2] << 16) +
            (this.u8[this.pos+3] << 24);

    this.pos = this.pos + 4;
    return v;
  };
  BinCommands.prototype.get_image_url = function() {
    var size = this.get_32();
    var png_blob = new Blob ([new Uint8Array (this.arraybuffer, this.pos, size)], {type:'image/png'});
    var url;
    if (window.webkitURL) {
      url = window.webkitURL.createObjectURL(png_blob);
    } else {
      url = window.URL.createObjectURL(png_blob, {oneTimeOnly: true});
    }
    this.pos = this.pos + size;
    return url;
  };
  BinCommands.prototype.free_image_url = function(url) {
    URL.revokeObjectURL(url);
  };

  /////////////////////////////////////////////////////////////////////////////
  // ACTIONS
  /////////////////////////////////////////////////////////////////////////////

  function doLogin() {
    // TODO
  }

  function doLoggedIn() {
    // TODO
  }

  function doDisconnect() {
    // TODO
  }

  /////////////////////////////////////////////////////////////////////////////
  // EVENTS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * On Create Surface Event
   */
  function onCreateSurface(cmd) {
    var id = cmd.get_16();
    var x = cmd.get_16s();
    var y = cmd.get_16s();
    var w = cmd.get_16();
    var h = cmd.get_16();
    var isTemp = cmd.get_bool();
    var surface = { id: id, x: x, y:y, width: w, height: h, isTemp: isTemp };
    surface.positioned = isTemp;
    surface.drawQueue = [];
    surface.transientParent = 0;
    surface.visible = false;
    surface.frame = null;
    surfaces[id] = surface;
    sendConfigureNotify(surface);

    console.debug('Broadway', 'onCreateSurface()', id, x, y, w, h);
    if ( !isTemp && globalOpts.onCreateSurface ) {
      var canvas = globalOpts.onCreateSurface(id, x, y, w, h);
      if ( canvas ) {
        canvas.surfaceId = id;
      }
    }
  }

  /**
   * On Show Surface Event
   */
  function onShowSurface(cmd) {
    var id = cmd.get_16();
    var surface = surfaces[id];

    if ( surface ) {
      surface.visible = true;

      console.debug('Broadway', 'onShowSurface()', id);
      if ( globalOpts.onShowSurface ) {
        globalOpts.onShowSurface(id);
      }
    }
  }

  /**
   * On Hide Surface Event
   */
  function onHideSurface(cmd) {
    var id = cmd.get_16();
    var surface = surfaces[id];

    if ( surface ) {
      surface.visible = false;

      console.debug('Broadway', 'onHideSurface()', id);
      if ( globalOpts.onHideSurface ) {
        globalOpts.onHideSurface(id);
      }
    }
  }

  /**
   * On Set Transient Event
   */
  function onSetTransient(cmd) {
    var id = cmd.get_16();
    var parentId = cmd.get_16();
    var surface = surfaces[id];

    if ( surface ) {
      console.debug('Broadway', 'onSetTransient()', id, parentId);

      surface.transientParent = parentId;
      if ( globalOpts.onSetTransient ) {
        globalOpts.onSetTransient(id, parentId);
      }
    }
  }

  /**
   * On Delete Surface Event
   */
  function onDeleteSurface(cmd) {
    var id = cmd.get_16();
    var surface = surfaces[id];

    console.debug('Broadway', 'onDeleteSurface()', id);
    if ( surface && globalOpts.onDeleteSurface ) {
      globalOpts.onDeleteSurface(id);
      delete surfaces[id];
    }
  }

  /**
   * On Move Surface Event
   */
  function onMoveSurface(cmd) {
    var id = cmd.get_16();
    var ops = cmd.get_flags();
    var has_pos = ops & 1;

    var x, y, w, h;
    if (has_pos) {
      x = cmd.get_16s();
      y = cmd.get_16s();
    }

    var has_size = ops & 2;
    if (has_size) {
      w = cmd.get_16();
      h = cmd.get_16();
    }

    console.debug('Broadway', 'onMoveSurface()', id, has_pos, x, y, has_size, w, h);
    if ( globalOpts.onMoveSurface ) {
      globalOpts.onMoveSurface(id, has_pos, x, y, has_size, w, h);
    }
  }

  /**
   * On Image Data Event
   */
  function onImageData(cmd) {
    var q = {
      op: 'i',
      id: cmd.get_16(),
      x: cmd.get_16(),
      y: cmd.get_16()
    };

    var url = cmd.get_image_url();
    q.img = new Image();
    q.img.src = url;

    console.debug('Broadway', 'onImageData()', url);
    surfaces[q.id].drawQueue.push(q);

    if (!q.img.complete) {
      q.img.onload = function() {
        cmd.free_image_url (url);

        handleOutstanding();
      };
      return false;
    }
    cmd.free_image_url(url);

    return true;
  }

  /**
   * On Copy Rects Event
   */
  function onCopyRects(cmd) {
    var id = cmd.get_16();
    if ( surfaces[id] ) {
      console.debug('Broadway', 'onCopyRects()', id);

      var q = {
        op: 'b',
        id: id,
        rects: []
      };

      var nrects = cmd.get_16();
      for (var r = 0; r < nrects; r++) {
        q.rects.push({
          x: cmd.get_16(),
          y: cmd.get_16(),
          w: cmd.get_16(),
          h: cmd.get_16()
        });
      }

      q.dx = cmd.get_16s();
      q.dy = cmd.get_16s();
      surfaces[q.id].drawQueue.push(q);
    }
  }

  /**
   * On Flush Sufrace Event
   */
  function onFlushSurface(cmd) {
    var id = cmd.get_16();
    var surface = surfaces[id];

    if ( surface ) {
      console.debug('Broadway', 'onFlushSurface()', id);

      var canvas;
      if ( globalOpts.onFlushSurface ) {
        canvas = globalOpts.onFlushSurface(id);
      }

      if ( surface && canvas ) {
        var commands = surface.drawQueue;
        var context = canvas.getContext('2d');
        context.globalCompositeOperation = 'source-over';

        var i = 0;
        var cmd, j, rect;
        for (i; i < commands.length; i++) {
          cmd = commands[i];
          switch (cmd.op) {
            case 'i': // put image data surface
              context.globalCompositeOperation = 'source-over';
              context.drawImage(cmd.img, cmd.x, cmd.y);
              break;

            case 'b': // copy rects
              context.save();
              context.beginPath();

              for (j = 0; j < cmd.rects.length; j++) {
                rect = cmd.rects[j];
                context.rect(rect.x, rect.y, rect.w, rect.h);
              }

              context.clip();
              context.drawImage(surface.canvas, cmd.dx, cmd.dy);
              context.restore();
              break;

            default:
              console.warn('Broadway', 'onFlushSurface()', 'Invalid command', cmd.op, cmd);
          }
        }
      }
    }
  }

  /**
   * On Grab Pointer Event
   */
  function onGrabPointer(cmd) {
    var id = cmd.get_16();
    var ownerEvents = cmd.get_bool();

    // TODO
    sendInput('g', []);
    console.debug('Broadway', 'onGrabPointer()', id, ownerEvents);
  }

  /**
   * On Ungrab Pointer Event
   */
  function onUngrabPointer() {
    sendInput('u', []);

    // TODO
    console.debug('Broadway', 'onUngrabPointer()');
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACTIONS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Handle outstanding commands
   */
  function handleOutstanding() {
    while ( outstandingCommands.length > 0 ) {
      var cmd = outstandingCommands.shift();
      if ( !handleCommands(cmd) ) {
        outstandingCommands.unshift(cmd);
        return;
      }
    }
  }

  /**
   * Handles a list of commands
   */
  function handleCommands(cmd) {
    var mapping = {
      'l': doLogin,
      'L': doLoggedIn,
      'D': doDisconnect,
      's': onCreateSurface,
      'S': onShowSurface,
      'H': onHideSurface,
      'p': onSetTransient,
      'd': onDeleteSurface,
      'm': onMoveSurface,
      'i': onImageData,
      'b': onCopyRects,
      'f': onFlushSurface,
      'g': onGrabPointer,
      'u': onUngrabPointer
    };

    while (cmd.pos < cmd.length) {
      var command = cmd.get_char();
      lastSerial = cmd.get_32();

      console.debug('Broadway', 'handleCommands()', command);

      if ( mapping[command] ) {
        if ( mapping[command](cmd) === false ) {
          return false;
        }
      } else {
        console.error('Invalid command', command);
      }
    }

    return true;
  }

  /**
   * Send configuration notification
   */
  function sendConfigureNotify(surface) {
    sendInput('w', [surface.id, surface.x, surface.y, surface.width, surface.height]);
  }

  /**
   * Send input
   */
  function sendInput(cmd, args) {
    if ( inputSocket != null ) {
      inputSocket.send(cmd + ([lastSerial, lastTimeStamp].concat(args)).join(','));
    }
  }

  /**
   * Update last input state
   */
  function updateForEvent(ev) {
    lastState &= ~(GDK_SHIFT_MASK|GDK_CONTROL_MASK|GDK_MOD1_MASK);
    if (ev.shiftKey) lastState |= GDK_SHIFT_MASK;
    if (ev.ctrlKey) lastState |= GDK_CONTROL_MASK;
    if (ev.altKey) lastState |= GDK_MOD1_MASK;
    lastTimeStamp = ev.timeStamp;
  }

  /**
   * Get GDK button mask from DOM Event
   */
  function getButtonMask (button) {
    if (button == 1) return GDK_BUTTON1_MASK;
    if (button == 2) return GDK_BUTTON2_MASK;
    if (button == 3) return GDK_BUTTON3_MASK;
    if (button == 4) return GDK_BUTTON4_MASK;
    if (button == 5) return GDK_BUTTON5_MASK;
    return 0;
  }

  /**
   * Keyboard Down
   */
  function handleKeyDown(id, ev) {
    // TODO
  }

  /**
   * Keyboard Up
   */
  function handleKeyUp(id, ev) {
    // TODO
  }

  /**
   * Keyboard Press
   */
  function handleKeyPress(id, ev) {
    // TODO
  }

  /**
   * Mouse Wheel
   */
  function handleMouseWheel(id, ev, opts) {
    updateForEvent(ev);
    if ( surfaces[id] ) {
      var offset = ev.detail ? ev.detail : -ev.wheelDelta;
      var dir = offset > 0 ? 1 : 0;

      console.info('Broadway', 'handleMouseWheel()', dir);
      sendInput ("s", [id, id, ev.pageX, ev.pageY, opts.mx, opts.my, lastState, dir]);
    }
  }

  /**
   * Mouse Movment
   */
  function handleMouseMove(id, ev, opts) {
    updateForEvent(ev);
    if ( surfaces[id] ) {
      //console.info('Broadway', 'handleMouseMove()', opts);
      sendInput ("m", [id, id, ev.pageX, ev.pageY, opts.mx, opts.my, lastState]);
    }
  }

  /**
   * Mouse Down
   */
  function handleMouseDown(id, ev, opts) {
    updateForEvent(ev);
    var button = ev.button + 1;
    lastState = lastState | getButtonMask (button);

    if ( surfaces[id] ) {
      console.info('Broadway', 'handleMouseDown()', opts);
      sendInput ("b", [id, id, ev.pageX, ev.pageY, opts.mx, opts.my, lastState, button]);
    }
  }

  /**
   * Mouse Up
   */
  function handleMouseUp(id, ev, opts) {
    updateForEvent(ev);
    var button = ev.button + 1;
    lastState = lastState & ~getButtonMask (button);
    if ( surfaces[id] ) {
      console.info('Broadway', 'handleMouseUp()', opts);
      sendInput ("B", [id, id, ev.pageX, ev.pageY, opts.mx, opts.my, lastState, button]);
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // API
  /////////////////////////////////////////////////////////////////////////////

  /**
   * On message() in socket
   */
  function onSocketMessage(message) {
    var cmd;
    if (message instanceof ArrayBuffer) {
      cmd = new BinCommands(message);
    } else {
      cmd = new TextCommands(message);
    }

    outstandingCommands.push(cmd);
    if ( outstandingCommands.length === 1 ) {
      handleOutstanding();
    }
  }

  /**
   * Connects to Broadway server
   */
  function connect(hostname) {
    function createSocket(loc) {
      return new WebSocket(loc, 'broadway');
    }

    function onSocketOpen() {
      if ( globalOpts.onSocketOpen ) {
        globalOpts.onSocketOpen();
      }
    }

    function onSocketClose() {
      if ( globalOpts.onSocketClose ) {
        globalOpts.onSocketClose();
      }
    }

    var supports_binary = createSocket(hostname + '-test').binaryType === 'blob';
    if ( supports_binary ) {
      connection = createSocket(hostname + '-bin');
      connection.binaryType = 'arraybuffer';
    } else {
      connection = createSocket(hostname);
    }

    console.info('Broadway', 'Connecting to', hostname, supports_binary);

    connection.onopen = function() {
      inputSocket = connection;

      onSocketOpen();
    };
    connection.onclose = function() {
      onSocketClose();

      connection = null;
      inputSocket = null;
    };
    connection.onmessage = function(ev) {
      onSocketMessage(ev.data);
    };
  }

  /////////////////////////////////////////////////////////////////////////////
  // EXPORTS
  /////////////////////////////////////////////////////////////////////////////

  window.GTK = window.GTK || {};

  /**
   * Connect to broadway
   *
   * Available callbacks in opts:
   *
   *   onImageData        REQUIRED    Return your canvas object here
   *
   *   onCreateSurface
   *   onShowSurface
   *   onHideSurface
   *   onSetTransien
   *   onDeleteSurface
   *   onMoveSurface
   *   onFlushSurface
   *
   *   onSocketOpen
   *   onSocketClose
   *
   */
  window.GTK.connect = function(host, opts) {
    if ( connection ) {
      console.error('Broadway', 'Only one connection allowed!');
      return;
    }

    globalOpts = opts || {};
    connect(host);
  };

  /**
   * Inject keyboard/mouse event
   */
  window.GTK.inject = function(id, type, ev, opts) {
    if ( !connection ) {
      console.error('Broadway', 'No connections created!');
      return;
    }

    switch ( type ) {
      case 'mousewheel' :
        handleMouseWheel(id, ev, opts);
      break;
      case 'mousemove' :
        handleMouseMove(id, ev, opts);
      break;
      case 'mousedown' :
        handleMouseDown(id, ev, opts);
      break;
      case 'mouseup' :
        handleMouseUp(id, ev, opts);
      break;
      case 'keypress' :
        handleKeyPress(id, ev, opts);
        break;
      case 'keyup' :
        handleKeyUp(id, ev, opts);
        break;
      case 'keydown' :
        handleKeyDown(id, ev, opts);
        break;
    }

  };

})();
