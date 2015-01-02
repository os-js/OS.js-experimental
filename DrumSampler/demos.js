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

(function(Utils) {
  'use strict';

  var Demos = [];

  Demos.push({
    kit: 'TheCheebacabra1',
    tempo: 120,
    effect: 'mhall2',
    effectMix: 0.19718309859154926,
    swingFactor: 0,
    instruments: {
      tom1 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]
      },
      tom2 : {
        pitch: 0.5,
        pattern: [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      tom3 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,2,0,2,2,0,0,0,0,0]
      },
      hihat : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0]
      },
      snare : {
        pitch: 0.5,
        pattern: [0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]
      },
      kick : {
        pitch: 0.5,
        pattern: [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      }
    }
  });

  Demos.push({
    kit: 'Kit3',
    tempo: 100,
    effect: 'spring',
    effectMix: 0.2,
    swingFactor: 0,
    instruments: {
      tom1 : {
        pitch: 0.7183098591549295,
        pattern: [0,0,0,0,0,0,0,2,1,2,1,0,0,0,0,0]
      },
      tom2 : {
        pitch: 0.704225352112676,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]
      },
      tom3 : {
        pitch: 0.8028169014084507,
        pattern: [0,0,0,0,0,0,2,1,0,0,0,0,0,0,0,0]
      },
      hihat : {
        pitch: 0.15492957746478875,
        pattern: [0,1,2,1,0,1,2,1,0,1,2,1,0,1,2,1]
      },
      snare : {
        pitch: 0.45070422535211263,
        pattern: [0,0,0,0,2,0,0,0,0,1,1,0,2,0,0,0]
      },
      kick : {
        pitch: 0.46478873239436624,
        pattern: [2,1,0,0,0,0,0,0,2,1,2,1,0,0,0,0]
      }
    }
  });

  Demos.push({
    kit: 'KPR77',
    tempo: 100,
    effect: 'reverse',
    effectMix: 0.25,
    swingFactor: 0,
    instruments: {
      tom1 : {
        pitch: 0.23943661971830987,
        pattern: [0,0,1,0,1,0,0,2,0,2,0,0,1,0,0,0]
      },
      tom2 : {
        pitch: 0.21126760563380287,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0]
      },
      tom3 : {
        pitch: 0.2535211267605634,
        pattern: [1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1]
      },
      hihat : {
        pitch: 0.5211267605633803,
        pattern: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0]
      },
      snare : {
        pitch: 0.5,
        pattern: [0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0]
      },
      kick : {
        pitch: 0.5,
        pattern: [2,0,0,0,2,0,0,0,2,0,0,0,2,0,0,0]
      }
    }
  });

  Demos.push({
    kit: 'CR78',
    tempo: 120,
    effect: 'space',
    effectMix: 0.25,
    swingFactor: 0,
    instruments: {
      tom1 : {
        pitch: 0.323943661971831,
        pattern: [0,2,0,0,0,2,0,0,0,2,0,0,0,0,0,0]
      },
      tom2 : {
        pitch: 0.3943661971830986,
        pattern: [0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      tom3 : {
        pitch: 0.323943661971831,
        pattern: [2,0,2,0,0,0,0,0,2,0,0,0,0,2,0,0]
      },
      hihat : {
        pitch: 0.5,
        pattern: [0,0,1,0,2,0,1,0,1,0,1,0,2,0,2,0]
      },
      snare : {
        pitch: 0.49295774647887325,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      kick : {
        pitch: 0.7887323943661972,
        pattern: [2,0,0,0,0,0,0,2,2,0,0,0,0,0,0,1]
      }
    }
  });

  Demos.push({
    kit: 'R8',
    tempo: 60,
    effect: 'spreader1',
    effectMix: 0.25,
    swingFactor: 0.5419847328244275,
    instruments: {
      tom1 : {
        pitch: 0.5,
        pattern: [1,0,0,1,0,1,0,1,1,0,0,1,1,1,1,0]
      },
      tom2 : {
        pitch: 0.5,
        pattern: [0,0,1,0,0,1,0,1,0,0,1,0,0,0,1,0]
      },
      tom3 : {
        pitch: 0.5,
        pattern: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
      },
      hihat : {
        pitch: 0.5,
        pattern: [2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1]
      },
      snare : {
        pitch: 0.5,
        pattern: [0,0,2,0,0,0,2,0,0,0,2,0,0,0,2,0]
      },
      kick : {
        pitch: 0.5,
        pattern: [2,2,0,1,2,2,0,1,2,2,0,1,2,2,0,1]
      }
    }
  });

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationDrumSampler = OSjs.Applications.ApplicationDrumSampler || {};
  OSjs.Applications.ApplicationDrumSampler.Demos = Demos;

})(OSjs.Utils);
