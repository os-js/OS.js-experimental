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

/*!
 * Inspired by:
 *   https://chromium.googlecode.com/svn/trunk/samples/audio/shiny-drum-machine.html
 * Copyright 2011, Google Inc.
 */

(function(Utils, VFS) {
  'use strict';

  if ( window.hasOwnProperty('AudioContext') && !window.hasOwnProperty('webkitAudioContext') ) {
    window.webkitAudioContext = AudioContext;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GLOBALS
  /////////////////////////////////////////////////////////////////////////////

  var MIN_TEMPO        = 50;
  var MAX_TEMPO        = 180;
  var TRACKS           = 16;
  var INSTRUMENT_COUNT = 6;
  var INSTRUMENT_ORDER = ['tom1', 'tom2', 'tom3', 'hihat', 'snare', 'kick'];
  var DEFAULT_EFFECT   = 'none';

  var DEFAULT_KIT      = 'R8';
  var MAX_SWING        = 0.08;
  var VOLUMES          = [0, 0.3, 1];

  var INSTRUMENTS = {
    tom1 : {
      label: 'Tom 1',
      pan: false,
      x: 0,
      y: 0,
      z: -2,
      g: 1,
      v: 0.6
    },
    tom2 : {
      label: 'Tom 2',
      pan: false,
      x: 0,
      y: 0,
      z: -2,
      g: 1,
      v: 0.6
    },
    tom3 : {
      label: 'Tom 3',
      pan: false,
      x: 0,
      y: 0,
      z: -2,
      g: 1,
      v: 0.6
    },
    hihat : {
      label: 'Hi-Hat',
      pan: true,
      x: function(rhythmIndex) { return 0.5*rhythmIndex-4; },
      y: 0,
      z: -1.0,
      g: 1,
      v: 0.7
    },
    snare : {
      label: 'Snare',
      pan: false,
      x: 0,
      y: 0,
      z: -2,
      g: 1,
      v: 0.6
    },
    kick : {
      label: 'Kick',
      pan: false,
      x: 0,
      y: 0,
      z: -2,
      g: 0.5,
      v: 1.0
    }
  };

  var EFFECTS = {
    none        : {label:'No Effect',          filename:'undefined',                                                  dryMix:1, wetMix:0},
    spreader1   : {label:'Spreader 1',         filename:'spreader50-65ms.wav',                                        dryMix:0.8, wetMix:1.4},
    spreader2   : {label:'Spreader 2',         filename:'noise-spreader1.wav',                                        dryMix:1, wetMix:1},
    spring      : {label:'Spring Reverb',      filename:'feedback-spring.wav',                                        dryMix:1, wetMix:1},
    space       : {label:'Space Oddity',       filename:'filter-rhythm3.wav',                                         dryMix:1, wetMix:0.7},
    reverse     : {label:'Reverse',            filename:'spatialized5.wav',                                           dryMix:1, wetMix:1},
    hreverse    : {label:'Huge Reverse',       filename:'matrix6-backwards.wav',                                      dryMix:0, wetMix:0.7},
    telephone   : {label:'Telephone Filter',   filename:'filter-telephone.wav',                                       dryMix:0, wetMix:1.2},
    lopass      : {label:'Lopass Filter',      filename:'filter-lopass160.wav',                                       dryMix:0, wetMix:0.5},
    hipass      : {label:'Hipass Filter',      filename:'filter-hipass5000.wav',                                      dryMix:0, wetMix:4.0},
    comb1       : {label:'Comb 1',             filename:'comb-saw1.wav',                                              dryMix:0, wetMix:0.7},
    comb2       : {label:'Comb 2',             filename:'comb-saw2.wav',                                              dryMix:0, wetMix:1.0},
    cosmic      : {label:'Cosmic Ping',        filename:'cosmic-ping-long.wav',                                       dryMix:0, wetMix:0.9},
    kitchen     : {label:'Kitchen',            filename:'house-impulses/kitchen-true-stereo.wav',                     dryMix:1, wetMix:1},
    livingroom  : {label:'Living Room',        filename:'house-impulses/dining-living-true-stereo.wav',               dryMix:1, wetMix:1},
    bedroom     : {label:'Living-Bedroom',     filename:'house-impulses/living-bedroom-leveled.wav',                  dryMix:1, wetMix:1},
    diningroom  : {label:'Dining-Far-Kitchen', filename:'house-impulses/dining-far-kitchen.wav',                      dryMix:1, wetMix:1},
    mhall1      : {label:'Medium Hall 1',      filename:'matrix-reverb2.wav',                                         dryMix:1, wetMix:1},
    mhall2      : {label:'Medium Hall 2',      filename:'matrix-reverb3.wav',                                         dryMix:1, wetMix:1},
    lhall       : {label:'Large Hall',         filename:'spatialized4.wav',                                           dryMix:1, wetMix:0.5},
    pecurliar   : {label:'Peculiar',           filename:'peculiar-backwards.wav',                                     dryMix:1, wetMix:1},
    backslap    : {label:'Backslap',           filename:'backslap1.wav',                                              dryMix:1, wetMix:1},
    warehouse   : {label:'Warehouse',          filename:'tim-warehouse/cardiod-rear-35-10/cardiod-rear-levelled.wav', dryMix:1, wetMix:1},
    diffusor    : {label:'Diffusor',           filename:'diffusor3.wav',                                              dryMix:1, wetMix:1},
    bhall       : {label:'Binaural Hall',      filename:'bin_dfeq/s2_r4_bd.wav',                                      dryMix:1, wetMix:0.5},
    huge        : {label:'Huge',               filename:'matrix-reverb6.wav',                                         dryMix:1, wetMix:0.7},
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
    kit: null,
    tempo: 120,
    effect: 'spring',
    effectMix: 0.25,
    swingFactor: 0,
    instruments: {
      tom1 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      tom2 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      tom3 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      hihat : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      snare : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      kick : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      }
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // HELPERS
  /////////////////////////////////////////////////////////////////////////////

  function loadSamples(list, context, _loaded, _finished) {

    function preload(name, url, callback) {
      VFS.download({path: 'osjs://' + url}, function(err, data) {
        if ( err ) {
          _loaded(err);
        } else {
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
        }
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
  }

  /////////////////////////////////////////////////////////////////////////////
  // SAMPLER
  /////////////////////////////////////////////////////////////////////////////

  /**
   * @class
   */
  function Sampler(opts) {
    opts = opts || {};
    opts.onNote = opts.onNote || function() {};

    this.opts            = opts;
    this.kit             = null;
    this.effects         = new Effects(opts.effectPath);
    this.beat            = null;
    this.playing         = false;
    this.timeout         = null;
    this.startTime       = null;
    this.rhythmIndex     = 0;
    this.lastDrawTime    = -1;
    this.noteTime        = 0.0;

    var finalMixNode;

    this.context = new webkitAudioContext();
    if ( this.context.createDynamicsCompressor ) {
      var compressor = this.context.createDynamicsCompressor();
      compressor.connect(this.context.destination);
      finalMixNode = compressor;
    } else {
      finalMixNode = this.context.destination;
    }

    // Create master volume.
    this.masterGainNode = this.context.createGain();
    this.masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
    this.masterGainNode.connect(finalMixNode);

    // Create effect volume.
    this.effectLevelNode = this.context.createGain();
    this.effectLevelNode.gain.value = 1.0; // effect level slider controls this
    this.effectLevelNode.connect(this.masterGainNode);

    // Create convolver for effect
    this.convolver = this.context.createConvolver();
    this.convolver.connect(this.effectLevelNode);
  }

  Sampler.prototype.init = function(callback) {
    this.reset();

    var self = this;
    this.effects.init(this.context, function() {
      self.kit = new Kit(self.opts.samplePath, DEFAULT_KIT);
      self.kit.preload(self.context, function() {
        callback();
      });
    });

  };

  Sampler.prototype.destroy = function() {
    this.stop();

    this.kit  = null;
    this.beat = null;

    if ( this.effects ) {
      this.effects.destroy();
      this.effects = null;
    }

    this.context          = null;
    this.masterGainNode   = null;
    this.effectLevelNode  = null;
    this.convolver        = null;
  };

  Sampler.prototype.load = function(data, callback) {
    callback = callback || function() {};

    this.stop();
    this.beat = (typeof data === 'string') ? JSON.parse(data) : data;
    this.setEffect(this.beat.effect || DEFAULT_EFFECT);
    this.setKit(this.beat.kit || DEFAULT_KIT, callback);
  };

  Sampler.prototype.reset = function(callback) {
    callback = callback || function() {};

    this.stop();
    this.beat = Utils.cloneObject(NULL_BEAT);
    this.setEffect(DEFAULT_EFFECT);
    this.setKit(DEFAULT_KIT, function() {
      callback();
    });
  };

  Sampler.prototype._playNote = function(buffer, pan, x, y, z, sendGain, mainGain, playbackRate, noteTime) {
    if ( !buffer ) { return; }

    var effectDryMix = EFFECTS[this.beat.effect].dryMix;

    var voice = this.context.createBufferSource();
    voice.buffer = buffer;
    voice.playbackRate.value = playbackRate;

    var finalNode = voice;
    if ( pan ) {
      var panner = this.context.createPanner();
      panner.setPosition(x, y, z);
      voice.connect(panner);
      finalNode = panner;
    }

    var dryGainNode = this.context.createGain();
    dryGainNode.gain.value = mainGain * effectDryMix;
    finalNode.connect(dryGainNode);
    dryGainNode.connect(this.masterGainNode);

    var wetGainNode = this.context.createGain();
    wetGainNode.gain.value = sendGain;
    finalNode.connect(wetGainNode);
    wetGainNode.connect(this.convolver);

    voice.start(noteTime);
  };

  Sampler.prototype.playNote = function(i, contextPlayTime, rhythmIndex) {
    var bins  = this.beat.instruments[i];
    var value = bins.pattern[rhythmIndex];

    if ( !value ) {
      return;
    }

    var ins = INSTRUMENTS[i];

    this._playNote(this.kit.buffers[i], 
      ins.pan,
      (typeof ins.x === 'function') ? ins.x(rhythmIndex) : ins.x,
      (typeof ins.y === 'function') ? ins.y(rhythmIndex) : ins.y,
      (typeof ins.z === 'function') ? ins.z(rhythmIndex) : ins.z,
      ins.g,
      VOLUMES[value] * ins.v,
      Math.pow(2.0, 2.0 * (bins.pitch - 0.5)),
      contextPlayTime
    );
  };

  Sampler.prototype.note = function(contextPlayTime, rhythmIndex) {
    this.playNote('kick', contextPlayTime, rhythmIndex);
    this.playNote('snare', contextPlayTime, rhythmIndex);
    this.playNote('hihat', contextPlayTime, rhythmIndex);
    this.playNote('tom1', contextPlayTime, rhythmIndex);
    this.playNote('tom2', contextPlayTime, rhythmIndex);
    this.playNote('tom3', contextPlayTime, rhythmIndex);
  };

  Sampler.prototype.tick = function() {
    // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
    var currentTime = this.context.currentTime;
    currentTime -= this.startTime;

    while ( this.noteTime < currentTime + 0.200) {

      if ( this.noteTime != this.lastDrawTime ) {
        this.lastDrawTime = this.noteTime;
        var idx = (this.rhythmIndex + 15) % 16;
        this.opts.onNote(idx, this.noteTime);
      }

      var contextPlayTime = this.noteTime + this.startTime;
      this.note(contextPlayTime, this.rhythmIndex);

      // Advance time by a 16th note...
      var secondsPerBeat = 60.0 / this.beat.tempo;
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

    var self = this;
    if ( this.timeout ) {
      clearTimeout(this.timeout);
    }
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

    this.setEffect(this.beat.effect);

    this.tick();
  };

  Sampler.prototype.setNote = function(instrument, col, state) {
    this.beat.instruments[instrument].pattern[col] = state;
  };

  Sampler.prototype.setEffectLevel = function(val) {
    if ( !this.beat ) { return; }
    if ( !this.effectLevelNode ) { return; }
    if ( typeof val !== 'undefined' ) {
      this.beat.effectMix = val;
    }
    var wm = EFFECTS[this.beat.effect].wetMix;
    this.effectLevelNode.gain.value = this.beat.effectMix * wm;
  };

  Sampler.prototype.setEffect = function(name) {
    if ( this.beat ) {
      this.beat.effect = name;
    }
    if ( this.convolver ) {
      var b = this.effects.getBuffer(name);
      if ( b ) {
        this.convolver.buffer = b;
      }
    }
    this.setEffectLevel(this.beat.effectMix);
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
      this.kit = null;
      if ( this.beat ) {
        this.beat.kit = name;
      }

      this.kit = new Kit(this.opts.samplePath, name);
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
  // EFFECTS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * @class
   */
  function Effects(root) {
    this.paths = {};
    this.buffers = {};

    for ( var i in EFFECTS ) {
      if ( EFFECTS.hasOwnProperty(i) ) {
        if ( i === 'none' ) { continue; }
        this.paths[i] = root + EFFECTS[i].filename;
        this.buffers[i] = null;
      }
    }
  }
  Effects.prototype.init = function(context, callback) {
    callback = callback || function() {};

    var list = Utils.cloneObject(this.paths);
    var self = this;

    loadSamples(list, context, function(err, name, buffer) {
      self.buffers[name] = buffer || null;
    }, function() {
      self.loaded = true;
      callback();
    });
  };
  Effects.prototype.destroy = function() {
    this.paths = {};
    this.buffers = {};
  };
  Effects.prototype.getBuffer = function(name) {
    return this.buffers[name];
  };

  /////////////////////////////////////////////////////////////////////////////
  // KITS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * @class
   */
  function Kit(root, name) {
    var pathName = root + name + '/';

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

    loadSamples(list, context, function(err, name, buffer) {
      self.buffers[name] = buffer || null;
    }, function() {
      self.loaded = true;
      cbFinished();
    });
  };


  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumSampler = OSjs.Applications.ApplicationDrumSampler || {};
  OSjs.Applications.ApplicationDrumSampler.Sampler = Sampler;
  OSjs.Applications.ApplicationDrumSampler.CONFIG  = {
    MIN_TEMPO: MIN_TEMPO,
    MAX_TEMPO: MAX_TEMPO,
    TRACKS: TRACKS,
    INSTRUMENT_COUNT: INSTRUMENT_COUNT,
    INSTRUMENT_ORDER: INSTRUMENT_ORDER,
    DEFAULT_EFFECT: DEFAULT_EFFECT,
    DEFAULT_KIT: DEFAULT_KIT,
    MAX_SWING: MAX_SWING,
    VOLUMES: VOLUMES,
    INSTRUMENTS: INSTRUMENTS,
    EFFECTS: EFFECTS,
    KITS: KITS,
    NULL_BEAT: NULL_BEAT
  };

})(OSjs.Utils, OSjs.VFS);
