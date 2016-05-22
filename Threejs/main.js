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
(function(Application, Window, GUI, Dialogs) {

  function MyScene(container) {
    if ( !container ) { throw "MyScene expects a container"; }

    this.container  = container;
    this.scene      = null;
    this.camera     = null;
    this.renderer   = null;
    this.stats      = null;
    this.mesh       = null;
    this.paused     = false;
    this.destroyed  = false;
    this.inited     = false;
  }

  MyScene.prototype.init = function() {
    this.scene = new THREE.Scene();

    var SCREEN_WIDTH  = this.container.offsetWidth,
        SCREEN_HEIGHT = this.container.offsetHeight;

    var VIEW_ANGLE  = 75,
        ASPECT      = SCREEN_WIDTH / SCREEN_HEIGHT,
        NEAR        = 1,
        FAR         = 5000;

    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    this.camera.position.z = 1000;
    this.scene.add(this.camera);

    try {
      this.renderer = new THREE.WebGLRenderer( {antialias:true} );
    } catch ( e ) {
      OSjs.API.error('Threejs', 'An error occured while creating renderer', 'WebGLRenderer failed to initialize', e);
      return;
    }

    this.renderer.setClearColor( 0x000040 );
    this.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

    this.container.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    this.container.appendChild(this.stats.domElement);

    this.createScene();
  };

  MyScene.prototype.createScene = function() {
    var light1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    light1.position.set( 1, 1, 1 );
    this.scene.add( light1 );

    var light2 = new THREE.DirectionalLight( 0xffffff, 1.5 );
    light2.position.set( 0, -1, 0 );
    this.scene.add( light2 );

    var triangles = 500000;
    var geometry = new THREE.BufferGeometry();
    var indices = new Uint32Array( triangles * 3 );

    for ( var i = 0; i < indices.length; i ++ ) {
      indices[ i ] = i;
    }

    var positions = new Float32Array( triangles * 3 * 3 );
    var normals = new Float32Array( triangles * 3 * 3 );
    var colors = new Float32Array( triangles * 3 * 3 );
    var color = new THREE.Color();

    var n = 800, n2 = n/2;  // triangles spread in the cube
    var d = 12, d2 = d/2; // individual triangle size

    var pA = new THREE.Vector3();
    var pB = new THREE.Vector3();
    var pC = new THREE.Vector3();
    var cb = new THREE.Vector3();
    var ab = new THREE.Vector3();

    for ( var i = 0; i < positions.length; i += 9 ) {

      // positions
      var x = Math.random() * n - n2;
      var y = Math.random() * n - n2;
      var z = Math.random() * n - n2;
      var ax = x + Math.random() * d - d2;
      var ay = y + Math.random() * d - d2;
      var az = z + Math.random() * d - d2;
      var bx = x + Math.random() * d - d2;
      var by = y + Math.random() * d - d2;
      var bz = z + Math.random() * d - d2;
      var cx = x + Math.random() * d - d2;
      var cy = y + Math.random() * d - d2;
      var cz = z + Math.random() * d - d2;

      positions[ i ]     = ax;
      positions[ i + 1 ] = ay;
      positions[ i + 2 ] = az;
      positions[ i + 3 ] = bx;
      positions[ i + 4 ] = by;
      positions[ i + 5 ] = bz;
      positions[ i + 6 ] = cx;
      positions[ i + 7 ] = cy;
      positions[ i + 8 ] = cz;

      // flat face normals
      pA.set( ax, ay, az );
      pB.set( bx, by, bz );
      pC.set( cx, cy, cz );

      cb.subVectors( pC, pB );
      ab.subVectors( pA, pB );
      cb.cross( ab );
      cb.normalize();

      var nx = cb.x;
      var ny = cb.y;
      var nz = cb.z;

      normals[ i ]     = nx;
      normals[ i + 1 ] = ny;
      normals[ i + 2 ] = nz;
      normals[ i + 3 ] = nx;
      normals[ i + 4 ] = ny;
      normals[ i + 5 ] = nz;
      normals[ i + 6 ] = nx;
      normals[ i + 7 ] = ny;
      normals[ i + 8 ] = nz;

      // colors
      var vx = ( x / n ) + 0.5;
      var vy = ( y / n ) + 0.5;
      var vz = ( z / n ) + 0.5;

      color.setRGB( vx, vy, vz );

      colors[ i ]     = color.r;
      colors[ i + 1 ] = color.g;
      colors[ i + 2 ] = color.b;
      colors[ i + 3 ] = color.r;
      colors[ i + 4 ] = color.g;
      colors[ i + 5 ] = color.b;
      colors[ i + 6 ] = color.r;
      colors[ i + 7 ] = color.g;
      colors[ i + 8 ] = color.b;
    }

    geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'normal', new THREE.BufferAttribute( normals, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( colors, 3 ) );
    geometry.computeBoundingSphere();

    var material = new THREE.MeshPhongMaterial( {
      color: 0xaaaaaa, specular: 0xffffff, shininess: 250,
      side: THREE.DoubleSide, vertexColors: THREE.VertexColors
    } );

    this.mesh = new THREE.Mesh( geometry, material );
    this.scene.add( this.mesh );

    this.inited = true;

    this.resize();
  };

  MyScene.prototype.destroy = function() {
    this.paused     = true;
    this.destroyed  = true;
    this.inited     = false;
    this.container  = null;
    this.scene      = null;
    this.camera     = null;
    this.renderer   = null;
    this.stats      = null;
    this.mesh       = null;
  };

  MyScene.prototype.resize = function() {
    if ( !this.inited ) {
      return;
    }

    var w  = this.container.offsetWidth,
        h = this.container.offsetHeight;

    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  MyScene.prototype.pause = function() {
    this.paused = true;
  };

  MyScene.prototype.resume = function() {
    this.paused = false;
  };

  MyScene.prototype.animate = function() {
    var self = this;

    var req = window.requestAnimationFrame || (function() {
      return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
        window.setTimeout(callback, 1000 / 60);

      };
    })();

    function animate() {
      if ( !self.paused && !self.destroyed ) {
        var time = Date.now() * 0.001;

        self.mesh.rotation.x = time * 0.25;
        self.mesh.rotation.y = time * 0.5;

        self.renderer.render( self.scene, self.camera );

        if ( self.stats ) {
          self.stats.update();
        }
      }
      req(animate);
    }

    animate();
  };

  /////////////////////////////////////////////////////////////////////////////
  // WINDOWS
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Main Window Constructor
   */
  var ApplicationThreejsWindow = function(app, metadata) {
    Window.apply(this, ['ApplicationThreejsWindow', {width: 600, height: 350}, app]);

    // Set window properties and other stuff here
    this._title = metadata.name;
    this._icon  = metadata.icon;
    //this._properties.allow_resize   = false;
    //this._properties.allow_maximize = false;

    this.scene = null;
  };

  ApplicationThreejsWindow.prototype = Object.create(Window.prototype);

  ApplicationThreejsWindow.prototype.init = function(wmRef, app) {
    var root = Window.prototype.init.apply(this, arguments);
    var self = this;

    // Create window contents (GUI) here
    var _resize = function() {
      if ( self.scene ) {
        self.scene.resize();
      }
    };

    var _pause = function() {
      if ( self.scene ) {
        self.scene.pause();
      }
    };
    var _resume = function() {
      if ( self.scene ) {
        self.scene.resume();
      }
    };
    this.scene = new MyScene(root);
    this._on('resized', _resize);
    this._on('maximize', _resize);
    this._on('restore', _resize);
    this._on('minimize', _pause);
    this._on('restore', _resume);
    this._on('focus',   _resume);
    this._on('blur',     _pause);

    return root;
  };

  ApplicationThreejsWindow.prototype._inited = function() {
    Window.prototype._inited.apply(this, arguments);

    // Window has been successfully created and displayed.
    // You can start communications, handle files etc. here

    if ( this.scene ) {
      this.scene.init();
      this.scene.animate();
    }
  };

  ApplicationThreejsWindow.prototype.destroy = function() {
    // Destroy custom objects etc. here
    if ( this.scene ) {
      this.scene.destroy();
      this.scene = null;
    }

    Window.prototype.destroy.apply(this, arguments);
  };

  /////////////////////////////////////////////////////////////////////////////
  // APPLICATION
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Application constructor
   */
  var ApplicationThreejs = function(args, metadata) {
    Application.apply(this, ['ApplicationThreejs', args, metadata]);
  };

  ApplicationThreejs.prototype = Object.create(Application.prototype);

  ApplicationThreejs.prototype.init = function(settings, metadata) {
    Application.prototype.init.apply(this, arguments);
    this._addWindow(new ApplicationThreejsWindow(this, metadata));
  };

  //
  // EXPORTS
  //
  OSjs.Applications = OSjs.Applications || {};
  OSjs.Applications.ApplicationThreejs = OSjs.Applications.ApplicationThreejs || {};
  OSjs.Applications.ApplicationThreejs.Class = ApplicationThreejs;

})(OSjs.Core.Application, OSjs.Core.Window, OSjs.GUI, OSjs.Dialogs);
