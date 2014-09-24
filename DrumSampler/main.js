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

  if ( window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext') ) {
    window.webkitAudioContext = AudioContext;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GLOBALS
  /////////////////////////////////////////////////////////////////////////////

  var SAMPLE_PATH      = '/'; // Set later
  var MIN_TEMPO        = 50;
  var MAX_TEMPO        = 180;
  var MAX_SWING        = 0.08;
  var TRACKS           = 16;
  var INSTRUMENT_COUNT = 6;
  var INSTRUMENT_ORDER = ['tom1', 'tom2', 'tom3', 'hihat', 'snare', 'kick'];
  var VOLUMES          = [0, 0.3, 1];
  var DEFAULT_KIT      = 'R8';

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

  var INSTRUMENTS = {
    'tom1' : {
      label: 'Tom 1',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, false, 0,0,-2, 1, volume * 0.6, pitch, contextPlayTime];
      }
    },
    'tom2' : {
      label: 'Tom 2',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, false, 0,0,-2, 1, volume * 0.6, pitch, contextPlayTime];
      }
    },
    'tom3' : {
      label: 'Tom 3',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, false, 0,0,-2, 1, volume * 0.6, pitch, contextPlayTime];
      }
    },
    'hihat' : {
      label: 'Hi-Hat',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, true, 0.5*rhythmIndex - 4, 0, -1.0, 1, volume * 0.6, pitch, contextPlayTime];
      }
    },
    'snare' : {
      label: 'Snare',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, false, 0,0,-2, 1, volume * 0.6, pitch, contextPlayTime];
      }
    },
    'kick' : {
      label: 'Kick',
      play: function(buffer, volume, pitch, contextPlayTime, rhythmIndex) {
        return [buffer, false, 0,0,-2, 0.5, volume * 0.6, pitch, contextPlayTime];
      }
    }
  };

  var KITS = {
    'R8': 'Roland R-8',
    'CR78': 'Roland CR-78',
    'KPR77': 'Korg KPR-77',
    'LINN': 'LinnDrum',
    'Kit3': 'Kit 3',
    'Kit8': 'Kit 8',
    'Techno': 'Techno',
    'Stark': 'Stark',
    'breakbeat8': 'Breakbeat 8',
    'breakbeat9': 'Breakbeat 9',
    'breakbeat13': 'Breakbeat 13',
    'acoustic-kit': 'Acoustic Kit',
    '4OP-FM': '4OP-FM',
    'TheCheebacabra1': 'The Cheebacabra 1',
    'TheCheebacabra2': 'The Cheebacabra 2'
  };


  var NULL_BEAT = {
    'kit': null,
    'tempo': 120,
    'effect': null,
    'effectMix': 0.25,
    'swingFactor': 0,
    'instruments': {
      'tom1' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'tom2' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'tom3' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'hihat' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'snare' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'kick' : {
        'pitch': 0.5,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      }
    }
  };

  var DEMO_BEAT = {
    'kit': null,
    'tempo': 120,
    'effect': null,
    'effectMix': 0.2,
    'swingFactor': 0,
    'instruments': {
      'tom3' : {
        'pitch': 0.8028169014084507,
        'pattern': [0,0,0,0,0,0,0,2,0,2,2,0,0,0,0,0]
      },
      'tom2' : {
        'pitch': 0.704225352112676,
        'pattern': [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      'tom1' : {
        'pitch': 0.7183098591549295,
        'pattern': [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]
      },
      'hihat' : {
        'pitch': 0.15492957746478875,
        'pattern': [0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0]
      },
      'snare' : {
        'pitch': 0.45070422535211263,
        'pattern': [0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]
      },
      'kick' : {
        'pitch': 0.46478873239436624,
        'pattern': [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      }
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // SAMPLER
  /////////////////////////////////////////////////////////////////////////////

  /**
   * @class
   */
  function Sampler(opts) {
    opts = opts || {};
    opts.onNote = opts.onNote || function() {};

    var context = new webkitAudioContext();
    var finalMixNode;
    if ( context.createDynamicsCompressor ) {
      var compressor = context.createDynamicsCompressor();
      compressor.connect(context.destination);
      finalMixNode = compressor;
    } else {
      finalMixNode = context.destination;
    }

    // Create master volume.
    var masterGainNode = context.createGain();
    masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    masterGainNode.connect(finalMixNode);

    // Create effect volume.
    var effectLevelNode = context.createGain();
    effectLevelNode.gain.value = 1.0; // effect level slider controls this
    effectLevelNode.connect(masterGainNode);

    // Create convolver for effect
    var convolver = context.createConvolver();
    convolver.connect(effectLevelNode);

    this.opts            = opts;
    this.kit             = null;
    this.context         = context;
    this.masterGainNode  = masterGainNode;
    this.convolver       = convolver;
    this.beat            = null;
    this.playing         = false;
    this.timeout         = null;
    this.startTime       = null;
    this.rhythmIndex     = 0;
    this.lastDrawTime    = -1;
    this.noteTime        = 0.0;
  }

  Sampler.prototype.init = function(callback) {
    this.reset();

    this.kit = new Kit(DEFAULT_KIT);
    this.kit.preload(this.context, function() {
      callback();
    });
  };

  Sampler.prototype.destroy = function() {
    this.stop();

    this.kit = null;
    this.beat = null;
  };

  Sampler.prototype.load = function(data, callback) {
    callback = callback || function() {};

    this.stop();
    this.beat = (typeof data === 'string') ? JSON.parse(data) : data;

    var kitName = this.beat.kit || DEFAULT_KIT;
    this.setKit(kitName, callback);
  };

  Sampler.prototype.reset = function(callback) {
    callback = callback || function() {};

    this.stop();
    this.beat = Utils.cloneObject(NULL_BEAT);

    this.setKit(DEFAULT_KIT, function() {
      callback();
    });
  };

  Sampler.prototype._playNote = function(buffer, pan, x, y, z, sendGain, mainGain, playbackRate, noteTime) {
    var effectDryMix = 1.0; //this.beat.effectMix;

    // Create the note
    var voice = this.context.createBufferSource();
    voice.buffer = buffer;
    voice.playbackRate.value = playbackRate;

    // Optionally, connect to a panner
    var finalNode;
    if (pan) {
      var panner = this.context.createPanner();
      panner.setPosition(x, y, z);
      voice.connect(panner);
      finalNode = panner;
    } else {
      finalNode = voice;
    }

    // Connect to dry mix
    var dryGainNode = this.context.createGain();
    dryGainNode.gain.value = mainGain * effectDryMix;
    finalNode.connect(dryGainNode);
    dryGainNode.connect(this.masterGainNode);

    // Connect to wet mix
    var wetGainNode = this.context.createGain();
    wetGainNode.gain.value = sendGain;
    finalNode.connect(wetGainNode);
    wetGainNode.connect(this.convolver);

    voice.start(noteTime);
  };

  Sampler.prototype.playNote = function(i, contextPlayTime, rhythmIndex) {
    var ins    = this.beat.instruments[i];
    var buffer = this.kit.buffers[i];
    var volume = VOLUMES[ins.pattern[rhythmIndex]] * 1.0;
    var pitch  = Math.pow(2.0, 2.0 * (ins.pitch - 0.5));
    var args   = INSTRUMENTS[i].play(buffer, volume, pitch, contextPlayTime, rhythmIndex);

    this._playNote.apply(this, args);
  };

  Sampler.prototype.note = function(contextPlayTime, rhythmIndex) {
    for ( var i in INSTRUMENTS ) {
      if ( INSTRUMENTS.hasOwnProperty(i) ) {
        this.playNote(i, contextPlayTime, rhythmIndex);
      }
    }
  };

  Sampler.prototype.tick = function() {
    function advanceNote() {
      var secondsPerBeat = 60.0 / this.beat.tempo; // Advance time by a 16th note...

      this.rhythmIndex++;
      if ( this.rhythmIndex === TRACKS ) {
        this.rhythmIndex = 0;
      }

      if ( this.rhythmIndex % 2 ) {
        this.noteTime += (0.25 + MAX_SWING * this.beat.swingFactor) * secondsPerBeat;
      } else {
        this.noteTime += (0.25 - MAX_SWING * this.beat.swingFactor) * secondsPerBeat;
      }
    }


    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    var currentTime = this.context.currentTime;
    currentTime -= this.startTime;

    while ( this.noteTime < currentTime + 0.200) {
      var contextPlayTime = this.noteTime + this.startTime;
      this.note(contextPlayTime, this.rhythmIndex);

      // Attempt to synchronize drawing time with sound
      if ( this.noteTime != this.lastDrawTime ) {
        this.lastDrawTime = this.noteTime;
        var idx = (this.rhythmIndex + 15) % 16;
        this.opts.onNote(idx, this.noteTime);
      }

      advanceNote.call(this);
    }

    var self = this;
    this.timeout = setTimeout(function() {
      self.tick();
    }, 0);
  };

  Sampler.prototype.toggle = function() {
    if ( this.playing ) {
      this.stop();
    } else {
      this.play();
    }
  };

  Sampler.prototype.stop = function() {
    if ( !this.playing ) { return; }

    if ( this.timeout ) {
      clearTimeout(this.timeout);
    }

    this.opts.onNote();

    this.timeout     = null;
    this.playing     = false;
    this.startTime   = null;
    this.rhythmIndex = 0;
    this.noteTime    = 0.0;
  };

  Sampler.prototype.play = function() {
    if ( this.playing ) { return; }
    this.stop();

    if ( !this.context ) {
      throw 'Cannot play, no context';
    }

    this.playing   = true;
    this.startTime = this.context.currentTime + 0.005;
    this.noteTime  = 0.0;

    this.tick();
  };

  Sampler.prototype.setNote = function(instrument, col, state) {
    this.beat.instruments[instrument].pattern[col] = state;
  };

  Sampler.prototype.setKit = function(name, callback) {
    callback = callback || function() {};

    var self = this;
    var wasPlaying = this.playing;

    if ( KITS[name] ) {
      /*
      if ( this.kit && this.kit.name === name ) {
        callback();
        return;
      }
      */

      this.stop();
      if ( this.beat ) {
        this.beat.kit = name;
      }

      this.kit = new Kit(name);
      this.kit.preload(this.context, function() {
        callback();

        if ( wasPlaying ) {
          self.play();
        }
      });
    }
  };

  Sampler.prototype.getData = function() {
    return JSON.stringify(this.beat);
  };

  /////////////////////////////////////////////////////////////////////////////
  // KITS
  /////////////////////////////////////////////////////////////////////////////


  /**
   * @class
   */
  function Kit(name) {
    var pathName = SAMPLE_PATH + name + '/';

    this.name   = name;
    this.loaded = false;

    this.paths = {
      kick:  pathName + 'kick.wav',
      snare: pathName + 'snare.wav',
      hihat: pathName + 'hihat.wav',
      tom1:  pathName + 'tom1.wav',
      tom2:  pathName + 'tom2.wav',
      tom3:  pathName + 'tom3.wav'
    };

    this.buffers = {
      kickBuffer: null,
      snareBuffer: null,
      hihatBuffer: null,
      tom1: null,
      tom2: null,
      tom3: null
    };
  }

  Kit.prototype.preload = function(context, cbFinished) {
    var self = this;
    var list = Utils.cloneObject(this.paths);

    function _loaded(err, name, buffer) {
      self.buffers[name] = buffer || null;
    }

    function _finished() {
      self.loaded = true;
      cbFinished();
    }

    function preload(name, url, callback) {
      Utils.AjaxDownload(url, function(data) {
        context.decodeAudioData(data,
          function(buffer) {
            _loaded(false, name, buffer);
            callback();
          },
          function(buffer) {
            _loaded('Error decoding sample!');
            callback();
          }
        );
      }, function(err) {
        _loaded(err);
      });
    }

    function next() {
      var c = null;
      var o = null;
      for ( var i in list ) {
        if ( list.hasOwnProperty(i) ) {
          c = i;
          o = list[i];
          delete list[i];
          break;
        }
      }

      if ( c === null ) {
        _finished();
      } else {
        preload(c, o, function() {
          next();
        });
      }
    }

    next();
  };

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationDrumSamplerWindow = function(app, metadata) {
    var self = this;

    Window.apply(this, ['ApplicationDrumSamplerWindow', {width: 550, height: 490}, app]);

    this.$table        = null;
    this.$scontainer   = null;
    this.statusBar     = null;
    this.buttons       = [];
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
    this.title         = metadata.name + ' v0.2';
    this.sampler       = new Sampler({
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

    var ToggleButton = OSjs.Applications.ApplicationDrumSamplerLibs.ToggleButton;

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
    menuBar.addItem(OSjs._('File'), [
      {title: OSjs._('New'), name: 'New', onClick: function() {
        app.action('new');
      }},
      {title: OSjs._('Load demo track'), name: 'LoadDemo', onClick: function() {
        self.doOpen(null, Utils.cloneObject(DEMO_BEAT));
      }},
      {title: OSjs._('Open'), name: 'Open', onClick: function() {
        app.action('open');
      }},
      {title: OSjs._('Save'), name: 'Save', onClick: function() {
        app.action('save');
      }},
      {title: OSjs._('Save As...'), name: 'SaveAs', onClick: function() {
        app.action('saveas');
      }},
      {title: OSjs._('Close'), name: 'Close', onClick: function() {
        app.action('close');
      }}
    ]);

    var kitMenu = [];
    for ( var k in KITS  ) {
      if ( KITS.hasOwnProperty(k) ) {
        kitMenu.push({
          title: KITS[k] + ' (' + k + ')',
          name: 'SelectKit' + k,
          onClick: (function(kit) {
            return function() {
              self.onKitSelect(kit);
            };
          })(k)
        });
      }
    }

    menuBar.addItem(OSjs._('Select Kit'), kitMenu);
    menuBar.addItem(OSjs._('Select Effect'), [
      {title: OSjs._('Not implemented yet'), name: 'EffectNone', onClick: function() {
      }}
    ]);

    menuBar.addItem(OSjs._('Play/Pause'));
    menuBar.addItem(OSjs._('Tempo -'));
    menuBar.addItem(OSjs._('Tempo +'));

    function createOnClick(idx, instrument, col) {
      return function(ev, state) {
        self.onButtonToggle(ev, idx, instrument, col, state);
      };
    }

    var table = document.createElement('div');
    table.className = 'Table';

    var x, y, row, col, i = 0, instrument;
    for ( y = 0; y < INSTRUMENT_COUNT; y++ ) {
      instrument = INSTRUMENT_ORDER[y];
      row = document.createElement('div');
      row.className = 'Row';

      col = document.createElement('div');
      col.className = 'Col Label';
      col.appendChild(document.createTextNode(INSTRUMENTS[instrument].label));
      row.appendChild(col);

      for ( x = 0; x < TRACKS; x++ ) {
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
      if ( cur < MAX_TEMPO ) {
        cur += 10;
      }
    } else {
      if ( cur > MIN_TEMPO ) {
        cur -= 10;
      }
    }
    this.sampler.beat.tempo = cur;
    this.updateStatusBar();
    this.updateControls();
  };

  ApplicationDrumSamplerWindow.prototype.onSliderUpdate = function(s, val) {
    if ( !this.sampler || !this.sampler.beat ) { return; }
    val /= 100;

    switch ( s ) {
      case 'swing' :
        this.sampler.beat.swingFactor = val;
      break;
      case 'effect' :
        this.sampler.beat.effectMix = val;
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

    for ( var i in INSTRUMENTS ) {
      if ( INSTRUMENTS.hasOwnProperty(i) ) {
        a = b.instruments[i];
        for ( j = 0; j < TRACKS; j++ ) {
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
      var kitName = this.sampler.beat.kit;
      var tempo   = this.sampler.beat.tempo;

      var txt = Utils.format('Kit: {0} | Tempo: {1}', kitName, tempo);
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
    for ( i = 0; i < INSTRUMENT_COUNT; i++ ) {
      for ( j = 0; j < TRACKS; j++ ) {
        if ( j === idx ) {
          Utils.$addClass(this.$table.childNodes[i].childNodes[j+1], 'Highlight');
        } else {
          Utils.$removeClass(this.$table.childNodes[i].childNodes[j+1], 'Highlight');
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

    Application.apply(this, ['ApplicationDrumSampler', args, metadata]);

    this.mainWindow = null;

    // You can set application variables here
    this.dialogOptions.mime = 'osjs/dbeat';
    this.dialogOptions.mimes = metadata.mime;
    this.dialogOptions.defaultFilename = 'New Beat.odbeat';

    var rootName = OSjs.API.getApplicationResource(this, '');
    SAMPLE_PATH = rootName + 'drum-samples/';
  };

  ApplicationDrumSampler.prototype = Object.create(Application.prototype);

  ApplicationDrumSampler.prototype.destroy = function() {
    // Destroy communication, timers, objects etc. here

    return Application.prototype.destroy.apply(this, arguments);
  };

  ApplicationDrumSampler.prototype.init = function(settings, metadata) {
    Application.prototype.init.apply(this, arguments);

    this.mainWindow = this._addWindow(new ApplicationDrumSamplerWindow(this, metadata));
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

  ApplicationDrumSampler.prototype.onOpen = function(filename, mime, data) {
    if ( this.mainWindow ) {
      this.mainWindow.doOpen(filename, data);
      this.mainWindow._focus();
    }
  };

  ApplicationDrumSampler.prototype.onSave = function(filename, mime, data) {
    if ( this.mainWindow ) {
      this.mainWindow.doSave(filename, data);
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
  OSjs.Applications.ApplicationDrumSampler = ApplicationDrumSampler;

})(OSjs.Helpers.DefaultApplication, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs, OSjs.Utils);
