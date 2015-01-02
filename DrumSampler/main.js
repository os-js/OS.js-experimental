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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS' AND
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
  'use strict';

  var CONFIG = {}; // Set later
  var VERSION = ' v0.6';

  var SLIDER_LABELS = {
    swing: 'Swing Level',
    effect: 'Effect Level',
    kickPitch: 'Kick Pitch',
    snarePitch: 'Snare Pitch',
    hihatPitch: 'Hi-Hat Pitch',
    tom1Pitch: 'Tom 1 Pitch',
    tom2Pitch: 'Tom 2 Pitch',
    tom3Pitch: 'Tom 3 Pitch'
  };

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationDrumSamplerWindow = function(app, metadata, openFile) {
    var self = this;

    Window.apply(this, ['ApplicationDrumSamplerWindow', {width: 550, height: 490}, app]);

    this.$table        = null;
    this.$scontainer   = null;
    this.statusBar     = null;
    this.buttons       = [];
    this.title         = metadata.name + VERSION;
    this.openFile      = openFile;
    this.sliders       = {
      swing: null,
      effect: null,
      kickPitch: null,
      snarePitch: null,
      hihatPitch: null,
      tom1Pitch: null,
      tom2Pitch: null,
      tom3Pitch: null
    };

    var rootName = OSjs.API.getApplicationResource(app, '');
    this.sampler = new OSjs.Applications.ApplicationDrumSampler.Sampler({
      samplePath: rootName + 'drum-samples/',
      effectPath: rootName + 'impulse-responses/',
      onNote: function(idx, time) {
        self.handleHighlight(idx, time);
      }
    }, app);

    // Set window properties and other stuff here
    this._title = this.title;
    this._icon  = metadata.icon;
    this._properties.allow_resize   = false;
    this._properties.allow_maximize = false;
    this._properties.allow_minimize = true;
  };

  ApplicationDrumSamplerWindow.prototype = Object.create(Window.prototype);

  ApplicationDrumSamplerWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    var ToggleButton = OSjs.Applications.ApplicationDrumSampler.ToggleButton;

    // Create window contents (GUI) here
    var menuBar = this._addGUIElement(new GUI.MenuBar('ApplicationDrumSamplerMenuBar', {
      onMenuOpen: function(elem, pos, item) {
        if ( item === 'Play/Pause' ) {
          self.onPlayPressed();
        } else if ( item === 'Tempo -' ) {
          self.onTempoButton(false);
        } else if ( item === 'Tempo +' ) {
          self.onTempoButton(true);
        }
      }
    }), root);

    var demoMenu = [];
    var demos = OSjs.Applications.ApplicationDrumSampler.Demos;
    for ( var d = 0; d < demos.length; d++ ) {
      demoMenu.push({
        title: 'Demo ' + (d+1),
        name: 'Demo_' + d,
        onClick: (function(idx) {
          return function() {
            self.doOpen(null, Utils.cloneObject(demos[idx]));
          };
        })(d)
      });
    }

    menuBar.addItem(OSjs.API._('LBL_FILE'), [
      {title: OSjs.API._('LBL_NEW'), name: 'New', onClick: function() {
        app.action('new');
      }},
      {title: OSjs.API._('Load demo track'), name: 'LoadDemo', menu: demoMenu},
      {title: OSjs.API._('LBL_OPEN'), name: 'Open', onClick: function() {
        app.action('open');
      }},
      {title: OSjs.API._('LBL_SAVE'), name: 'Save', onClick: function() {
        app.action('save');
      }},
      {title: OSjs.API._('LBL_SAVEAS'), name: 'SaveAs', onClick: function() {
        app.action('saveas');
      }},
      {title: OSjs.API._('LBL_CLOSE'), name: 'Close', onClick: function() {
        app.action('close');
      }}
    ]);

    var kitMenu = [];
    for ( var k in CONFIG.KITS  ) {
      if ( CONFIG.KITS.hasOwnProperty(k) ) {
        kitMenu.push({
          title: CONFIG.KITS[k] + ' (' + k + ')',
          name: 'SelectKit' + k,
          onClick: (function(kit) {
            return function() {
              self.onKitSelect(kit);
            };
          })(k)
        });
      }
    }

    var effectMenu = [];
    for ( var e in CONFIG.EFFECTS  ) {
      if ( CONFIG.EFFECTS.hasOwnProperty(e) ) {
        effectMenu.push({
          title: CONFIG.EFFECTS[e].label,
          name: 'SelectEffect' + e,
          onClick: (function(eff) {
            return function() {
              self.onEffectSelect(eff);
            };
          })(e)
        });
      }
    }

    menuBar.addItem(OSjs.API._('Select Kit'), kitMenu);
    menuBar.addItem(OSjs.API._('Select Effect'), effectMenu);

    menuBar.addItem(OSjs.API._('Play/Pause'));
    menuBar.addItem(OSjs.API._('Tempo -'));
    menuBar.addItem(OSjs.API._('Tempo +'));

    function createOnClick(idx, instrument, col) {
      return function(ev, state) {
        self.onButtonToggle(ev, idx, instrument, col, state);
      };
    }

    var table = document.createElement('div');
    table.className = 'Table';

    var x, y, row, col, i = 0, instrument;
    for ( y = 0; y < CONFIG.INSTRUMENT_COUNT; y++ ) {
      instrument = CONFIG.INSTRUMENT_ORDER[y];
      row = document.createElement('div');
      row.className = 'Row';

      col = document.createElement('div');
      col.className = 'Col Label';
      col.appendChild(document.createTextNode(CONFIG.INSTRUMENTS[instrument].label));
      row.appendChild(col);

      for ( x = 0; x < CONFIG.TRACKS; x++ ) {
        col = document.createElement('div');
        col.className = 'Col';
        row.appendChild(col);

        this.buttons.push(this._addGUIElement(new ToggleButton('TrackButton_' + i.toString(), {onClick: createOnClick(i, instrument, x)}), col));

        i++;
      }

      table.appendChild(row);
    }

    root.appendChild(table);

    this.$table = table;

    // Sliders
    var sliderContainer = document.createElement('div');
    sliderContainer.className = 'Sliders';

    var container, label, smin, smax;
    for ( var s in this.sliders ) {
      if ( this.sliders.hasOwnProperty(s) ) {
        container = document.createElement('div');
        container.className = 'Container';

        label = document.createElement('div');
        label.className = 'Label';
        label.appendChild(document.createTextNode(SLIDER_LABELS[s]));

        container.appendChild(label);

        this.sliders[s] = this._addGUIElement(new GUI.Slider('Slider_' + s, {orientation: 'vertical', onUpdate: (function(sname) {
          return function(val) {
            self.onSliderUpdate(sname, val);
          };
        })(s), min: 0, max: 100}), container);

        sliderContainer.appendChild(container);
      }
    }
    this.$scontainer = sliderContainer;
    root.appendChild(this.$scontainer);

    // Statusbar
    this.statusBar = this._addGUIElement(new GUI.StatusBar('ApplicationDrumSamplerStatusBar', {}), root);
    this.statusBar.setText('Loading assets...');

    return root;
  };

  ApplicationDrumSamplerWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here
    this.updateTitle();
    this._toggleDisabled(true);

    var self = this;
    this.sampler.init(function() {
      self._toggleDisabled(false);
      self.doDraw();

      self.updateStatusBar();
      self.updateControls();

      if ( self.openFile && self.openFile.path ) {
        if ( self._appRef ) {
          self._appRef.action('open', self.openFile);
        }
      }
    });
  };

  ApplicationDrumSamplerWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here
    if ( this.sampler ) {
      this.sampler.destroy();
      this.sampler = null;
    }

    if ( this.$table ) {
      if ( this.$table.parentNode ) {
        this.$table.parentNode.removeChild(this.$table);
      }
      this.$table = null;
    }
    if ( this.$scontainer ) {
      if ( this.$scontainer.parentNode ) {
        this.$scontainer.parentNode.removeChild(this.$scontainer);
      }
      this.$scontainer = null;
    }

    this.buttons = [];

    Window.prototype.destroy.apply(this, arguments);
    this.statusBar = null;
  };

  ApplicationDrumSamplerWindow.prototype.onPlayPressed = function() {
    if ( this.sampler ) {
      this.sampler.toggle();
    }
  };

  ApplicationDrumSamplerWindow.prototype.onEffectSelect = function(name) {
    if ( !this.sampler ) { return; }
    this.sampler.setEffect(name);
    this.updateStatusBar();
  };

  ApplicationDrumSamplerWindow.prototype.onKitSelect = function(name) {
    if ( !this.sampler ) { return; }
    var self = this;
    this._toggleDisabled(true);
    this.sampler.setKit(name, function() {
      self._toggleDisabled(false);
      self.updateStatusBar();
      self.updateControls();
    });
  };

  ApplicationDrumSamplerWindow.prototype.onButtonToggle = function(ev, idx, instrument, col, state) {
    if ( !this.sampler ) { return; }

    this.sampler.setNote(instrument, col, state);
    this.sampler.playNote(instrument, 0, col);
  };

  ApplicationDrumSamplerWindow.prototype.onTempoButton = function(inc) {
    if ( !this.sampler ) { return; }
    var cur = this.sampler.beat.tempo;
    if ( inc ) {
      if ( cur < CONFIG.MAX_TEMPO ) {
        cur += 10;
      }
    } else {
      if ( cur > CONFIG.MIN_TEMPO ) {
        cur -= 10;
      }
    }
    this.sampler.beat.tempo = cur;
    this.updateStatusBar();
    this.updateControls();
  };

  ApplicationDrumSamplerWindow.prototype.onSliderUpdate = function(s, val) {
    if ( !this.sampler || !this.sampler.beat ) { return; }
    var oval = val;
    val /= 100;

    switch ( s ) {
      case 'swing' :
        this.sampler.beat.swingFactor = val;
      break;
      case 'effect' :
        this.sampler.beat.effectMix = val;
        this.sampler.setEffectLevel(val);
      break;

      default :
        if ( s.match(/Pitch$/) ) {
          s = s.replace(/Pitch$/, '');
          this.sampler.beat.instruments[s].pitch = val;
        }
      break;
    }
  };

  ApplicationDrumSamplerWindow.prototype.doDraw = function() {
    if ( !this.sampler ) { return; }
    var b = this.sampler.beat;
    var a, l, j, t = 0;

    var instruments = CONFIG.INSTRUMENTS;
    for ( var i in instruments ) {
      if ( instruments.hasOwnProperty(i) ) {
        a = b.instruments[i];
        for ( j = 0; j < CONFIG.TRACKS; j++ ) {
          this.buttons[t].setState(a.pattern[j]);
          t++;
        }
      }
    }
  };

  ApplicationDrumSamplerWindow.prototype.doNew = function() {
    if ( !this.sampler ) { return; }
    var self = this;

    this._toggleDisabled(true);
    this.sampler.reset(function() {
      self.doDraw();
      self.updateTitle(null);
      self.updateStatusBar();
      self.updateControls();
      self._toggleDisabled(false);
    });

  };

  ApplicationDrumSamplerWindow.prototype.doSave = function(filename, data) {
    this.updateTitle(filename);
  };

  ApplicationDrumSamplerWindow.prototype.doOpen = function(filename, data) {
    if ( !this.sampler ) { return; }
    var self = this;

    this._toggleDisabled(true);
    this.sampler.load(data, function() {
      try {
        self.doDraw();
        self.updateTitle(filename);
        self.updateStatusBar();
        self.updateControls();
        self._toggleDisabled(false);
      } catch ( e ) {
        alert('Failed to open beat. Are you trying to load from a version that is outdated?');
        self.doNew();
        console.warn(e, e.stack);
      }
    });
  };

  ApplicationDrumSamplerWindow.prototype.updateControls = function() {
    if ( !this.sampler ) { return; }
    var beat = this.sampler.beat;

    this.sliders.swing.setValue(beat.swingFactor * 100);
    this.sliders.effect.setValue(beat.effectMix * 100);
    this.sliders.kickPitch.setValue(beat.instruments.kick.pitch * 100);
    this.sliders.snarePitch.setValue(beat.instruments.snare.pitch * 100);
    this.sliders.hihatPitch.setValue(beat.instruments.hihat.pitch * 100);
    this.sliders.tom1Pitch.setValue(beat.instruments.tom1.pitch * 100);
    this.sliders.tom2Pitch.setValue(beat.instruments.tom2.pitch * 100);
    this.sliders.tom3Pitch.setValue(beat.instruments.tom3.pitch * 100);
  };

  ApplicationDrumSamplerWindow.prototype.updateStatusBar = function() {
    if ( !this.sampler ) { return; }

    if ( this.statusBar ) {
      var kitName = CONFIG.KITS[this.sampler.beat.kit];
      var tempo   = this.sampler.beat.tempo;
      var effect  = CONFIG.EFFECTS[this.sampler.beat.effect || CONFIG.DEFAULT_EFFECT].label;

      var txt = Utils.format('Kit: {0} | Effect: {1} | Tempo: {2}', kitName, effect, tempo);
      this.statusBar.setText(txt);
    }
  };

  ApplicationDrumSamplerWindow.prototype.updateTitle = function(filename) {
    var name = filename ? Utils.filename(filename) : 'New Beat';
    var title = this.title + ' - ' + name;
    this._setTitle(title);
  };

  ApplicationDrumSamplerWindow.prototype.handleHighlight = function(idx) {
    var i, j;
    var cn = this.$table.childNodes;
    for ( i = 0; i < CONFIG.INSTRUMENT_COUNT; i++ ) {
      for ( j = 0; j < CONFIG.TRACKS; j++ ) {
        if ( j === idx ) {
          Utils.$addClass(cn[i].childNodes[j+1], 'Highlight');
        } else {
          Utils.$removeClass(cn[i].childNodes[j+1], 'Highlight');
        }
      }
    }
  };

  ApplicationDrumSamplerWindow.prototype.getData = function() {
    if ( this.sampler ) {
      return this.sampler.getData();
    }
    return null;
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationDrumSampler = function(args, metadata) {
    //if ( !OSjs.Compability.audioContext ) {
    if ( !window.webkitAudioContext ) {
      throw 'Your browser does not support AudioContext :(';
    }

    CONFIG = OSjs.Applications.ApplicationDrumSampler.CONFIG;

    Application.apply(this, ['ApplicationDrumSampler', args, metadata]);

    this.mainWindow = null;

    // You can set application variables here
    this.dialogOptions.mime = 'osjs/dbeat';
    this.dialogOptions.mimes = metadata.mime;
    this.dialogOptions.defaultFilename = 'New Beat.odbeat';

  };

  ApplicationDrumSampler.prototype = Object.create(Application.prototype);

  ApplicationDrumSampler.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here
    this.mainWindow = null;

    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationDrumSampler.prototype.init = function(settings, metadata) {
    OSjs.Core.Application.prototype.init.apply(this, arguments);

    // Get launch/restore argument(s)
    var file = this._getArgument('file');
    this.mainWindow = this._addWindow(new ApplicationDrumSamplerWindow(this, metadata, file));
  };

  ApplicationDrumSampler.prototype._onMessage = function(obj, msg, args) {
    Application.prototype._onMessage.apply(this, arguments);

    // Make sure we kill our application if main window was closed
    if ( msg == 'destroyWindow' && obj._name === 'ApplicationDrumSamplerWindow' ) {
      this.destroy();
    }
  };

  ApplicationDrumSampler.prototype.onNew = function() {
    if ( this.mainWindow ) {
      this.mainWindow.doNew();
      this.mainWindow._focus();
    }
  };

  ApplicationDrumSampler.prototype.onOpen = function(file, data) {
    if ( this.mainWindow ) {
      this.mainWindow.doOpen(file.path, data);
      this.mainWindow._focus();
    }
  };

  ApplicationDrumSampler.prototype.onSave = function(file, data) {
    if ( this.mainWindow ) {
      this.mainWindow.doSave(file.path, data);
      this.mainWindow._focus();
    }
  };

  ApplicationDrumSampler.prototype.onGetSaveData = function(callback) {
    var data = '';
    if ( this.mainWindow ) {
      data = this.mainWindow.getData();
    }
    callback(data);
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumSampler = OSjs.Applications.ApplicationDrumSampler || {};
  OSjs.Applications.ApplicationDrumSampler.Class = ApplicationDrumSampler;

})(OSjs.Helpers.DefaultApplication, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Utils);
