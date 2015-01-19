/*!
 * OS.js - JavaScript Operating System
 *
 * Copyright (c) 2011-2015, Anders Evenrud <andersevenrud@gmail.com>
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
(function(Application, Window, GUI, Dialogs, GUIElement) {
  'use strict';

  function ToggleButton(name, opts) {
    opts = opts || {};

    this.state    = opts.state || 0;
    this.$inner   = null;
    this.$click   = null;
    this.cbClick  = opts.onClick || function() {};

    GUIElement.apply(this, [name]);
  };

  ToggleButton.prototype = Object.create(GUIElement.prototype);

  ToggleButton.prototype.init = function() {
    var el = GUIElement.prototype.init.apply(this, ['GUIToggleButton']);

    this.$inner = document.createElement('div');
    this.$inner.className = 'Inner';
    el.appendChild(this.$inner);

    this.$click = document.createElement('div');
    this.$click.className = 'Click';
    el.appendChild(this.$click);

    var self = this;
    this._addEventListener(this.$click, 'click', function(ev) {
      self.onClick(ev);
    });
    this._addEventListener(this.$element, 'mousedown', function(ev) {
      ev.preventDefault();
      return false;
    });

    this.setState(this.state);

    return el;
  };

  ToggleButton.prototype.onClick = function(ev) {
    if ( this.state == 2 ) {
      this.state = 0;
    } else {
      this.state++;
    }
    this.setState();

    this.cbClick(ev, this.state);
  };

  ToggleButton.prototype.setState = function(s) {
    if ( typeof s !== 'undefined' ) {
      this.state = parseInt(s, 10);
    }
    if ( this.$element ) {
      var cn = 'State_' + this.state.toString();
      this.$element.className = (['GUIToggleButton', cn]).join(' ');
    }
  };

  ToggleButton.prototype.getState = function() {
    return this.state;
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumSampler = OSjs.Applications.ApplicationDrumSampler || {};
  OSjs.Applications.ApplicationDrumSampler.ToggleButton = ToggleButton;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Core.GUIElement);
