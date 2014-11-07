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
      if (v > 32767)
    return v - 65536;
      else
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
      var v =
    this.u8[this.pos] +
    (this.u8[this.pos+1] << 8);
      this.pos = this.pos + 2;
      return v;
  };
  BinCommands.prototype.get_16s = function() {
      var v = this.get_16 ();
      if (v > 32767)
    return v - 65536;
      else
    return v;
  };
  BinCommands.prototype.get_32 = function() {
      var v =
    this.u8[this.pos] +
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
      if (window.webkitURL)
    url = window.webkitURL.createObjectURL(png_blob);
      else
    url = window.URL.createObjectURL(png_blob, {oneTimeOnly: true});
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

  function doUnknownCommand(command) {
    console.error('Invalid command', command);
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

    console.debug('Broadway', 'onCreateSurface()', id, x, y, w, h);
    //cmdCreateSurface(id, x, y, w, h, isTemp);

    if ( !isTemp && globalOpts.onCreateSurface ) {
      globalOpts.onCreateSurface(id, x, y, w, h);
    }

    var surface = { id: id, x: x, y:y, width: w, height: h, isTemp: isTemp };
    surface.positioned = isTemp;
    surface.drawQueue = [];
    surface.transientParent = 0;
    surface.visible = false;
    surface.frame = null;
    surfaces[id] = surface;
    sendConfigureNotify(surface);
  }

  /**
   * On Show Surface Event
   */
  function onShowSurface(cmd) {
    var id = cmd.get_16();

    console.debug('Broadway', 'onShowSurface()', id);
    if ( globalOpts.onShowSurface ) {
      globalOpts.onShowSurface(id);
    }
  }

  /**
   * On Hide Surface Event
   */
  function onHideSurface(cmd) {
    var id = cmd.get_16();

    console.debug('Broadway', 'onHideSurface()', id);
    if ( globalOpts.onHideSurface ) {
      globalOpts.onHideSurface(id);
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
      surface.transientParent = parentId;
    }

    console.debug('Broadway', 'onSetTransient()', id, parentId);
    if ( globalOpts.onSetTransient ) {
      globalOpts.onSetTransient(id, parentId);
    }
  }

  /**
   * On Delete Surface Event
   */
  function onDeleteSurface(cmd) {
    var id = cmd.get_16();

    console.debug('Broadway', 'onDeleteSurface()', id);

    var surface = surfaces[id];
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
    var q = {
      op: 'b',
      id: cmd.get_16(),
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

    console.debug('Broadway', 'onCopyRects()', q);
  }

  /**
   * On Flush Sufrace Event
   */
  function onFlushSurface(cmd) {
    var id = cmd.get_16();

    console.debug('Broadway', 'onFlushSurface()', id);

    var canvas;
    var surface = surfaces[id];
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
  // MESSAGING
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
      var id, x, y, w, h, q;
      var command = cmd.get_char();
      lastSerial = cmd.get_32();

      console.debug('Broadway', 'handleCommands()', command);

      if ( mapping[command] ) {
        if ( mapping[command](cmd) === false ) {
          return false;
        }
      } else {
        doUnknownCommand(command);
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

  /////////////////////////////////////////////////////////////////////////////
  // API
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Create a new WebSocket
   */
  function createSocket(loc) {
    return new WebSocket(loc, 'broadway');
  }

  /**
   * On open() in socket
   */
  function onSocketOpen() {
    if ( globalOpts.onSocketOpen ) {
      globalOpts.onSocketOpen();
    }
  }

  /**
   * On close() in socket
   */
  function onSocketClose() {
    if ( globalOpts.onSocketClose ) {
      globalOpts.onSocketClose();
    }
  }

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
    globalOpts = opts || {};
    connect(host);
  };

  /**
   * Inject keyboard/mouse event
   */
  window.GTK.inject = function(type, name, value) {
  };

})();
