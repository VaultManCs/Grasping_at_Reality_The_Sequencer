
/*:
 * @plugindesc v1.1 Animate the Title Screen background by cycling through multiple images behind the title command menu + Early BGM start + no replay bugs. (GaR_Titles)
 * @author GaR (with Copilot)
 *
 * @help
 * ============================================================================
 * GaR_Titles (RPG Maker MV)
 * ============================================================================
 * Put your animation frames in: /img/titles1/
 * Put your after/final image in: /img/titles1/ (optional)
 *
 * This plugin replaces the Title1 background sprite with an animated sequence.
 * It does NOT remove your Title2 overlay/logo; that remains controlled by the
 * database (System -> Title Screen -> Title2).
 *
 * Timing note:
 *  - RPG Maker MV runs at ~60 frames per second.
 *  - FrameWait = 60 means ~1 second between image changes.
 *
 * Loop note:
 *  - Loops = 0 means loop forever.
 *  - Loops = 1 means play the full sequence once, then show AfterImage (if set).
 *
 * Audio note:
 *  - If EarlyBgmStart is ON, this plugin starts (and optionally preloads) the
 *    title BGM during Scene_Boot so it plays during splash screens.
 *  - The plugin avoids replay bugs by not replaying the same BGM if it is
 *    already playing when Scene_Title begins or resumes.
 *
 * No plugin commands.
 *
 * ============================================================================
 * @param Frames
 * @type struct<GaRTitleFrame>[]
 * @desc List of Title1 images (in img/titles1/) to cycle through.
 * @default []
 *
 * @param FrameWait
 * @type number
 * @min 1
 * @desc Frames to wait before switching to the next image (60 frames ~ 1 second).
 * @default 12
 *
 * @param Loops
 * @type number
 * @min 0
 * @desc Number of full animation loops. 0 = infinite.
 * @default 0
 *
 * @param AfterImage
 * @type file
 * @dir img/titles1/
 * @desc Image to show after the loop finishes. Leave blank to keep the last frame.
 * @default
 *
 * @param PlayBgm
 * @type boolean
 * @on Yes
 * @off No
 * @desc Use a custom BGM (below) instead of the database Title BGM?
 * @default true
 *
 * @param EarlyBgmStart
 * @type boolean
 * @on Yes
 * @off No
 * @desc Start the custom title BGM early during boot (so it plays during MadeWithMV splash).
 * @default true
 *
 * @param PreloadBgm
 * @type boolean
 * @on Yes
 * @off No
 * @desc Preload the custom title BGM during boot to reduce start delay.
 * @default true
 *
 * @param BgmName
 * @type file
 * @dir audio/bgm/
 * @desc BGM file name (in audio/bgm/). Leave blank to stop BGM when PlayBgm is ON.
 * @default
 *
 * @param BgmVolume
 * @type number
 * @min 0
 * @max 100
 * @desc BGM volume (0-100).
 * @default 90
 *
 * @param BgmPitch
 * @type number
 * @min 50
 * @max 150
 * @desc BGM pitch (50-150).
 * @default 100
 *
 * @param BgmPan
 * @type number
 * @min -100
 * @max 100
 * @desc BGM pan (-100 to 100).
 * @default 0
 */
/*~struct~GaRTitleFrame:
 * @param Image
 * @type file
 * @dir img/titles1/
 * @desc Frame image file (in img/titles1/).
 * @default
 */

(function() {
  "use strict";

  var PLUGIN_NAME = "GaR_Titles";
  var params = PluginManager.parameters(PLUGIN_NAME);

  function parseStructArray(raw) {
    // MV stores struct arrays as JSON strings of JSON strings.
    // e.g. ["{\"Image\":\"Frame1\"}","{\"Image\":\"Frame2\"}"]
    try {
      var arr = JSON.parse(raw || "[]");
      return arr.map(function(s) {
        try { return JSON.parse(s); } catch (e) { return {}; }
      });
    } catch (e) {
      return [];
    }
  }

  var frameStructs = parseStructArray(params["Frames"]);
  var frameNames = frameStructs
    .map(function(o){ return (o && o.Image) ? String(o.Image) : ""; })
    .filter(function(n){ return n.length > 0; });

  var frameWait  = Math.max(1, Number(params["FrameWait"] || 12));
  var loops      = Math.max(0, Number(params["Loops"] || 0));
  var afterImage = String(params["AfterImage"] || "");

  var playBgm       = String(params["PlayBgm"] || "true") === "true";
  var earlyBgmStart = String(params["EarlyBgmStart"] || "true") === "true";
  var preloadBgm    = String(params["PreloadBgm"] || "true") === "true";

  var bgmName   = String(params["BgmName"] || "");
  var bgmVolume = Number(params["BgmVolume"] || 90);
  var bgmPitch  = Number(params["BgmPitch"] || 100);
  var bgmPan    = Number(params["BgmPan"] || 0);

  // Namespace / flags
  window.GaR_Titles = window.GaR_Titles || {};
  window.GaR_Titles._bootStartedBgm = false;

  function desiredBgmObject() {
    return { name: bgmName, volume: bgmVolume, pitch: bgmPitch, pan: bgmPan };
  }

  function isSameBgmPlaying() {
    // AudioManager._currentBgm exists in MV when something is playing/assigned.
    // Compare by name only; volume/pitch/pan changes should still be applied only when needed.
    return AudioManager._currentBgm && AudioManager._currentBgm.name === bgmName;
  }

  function ensureCustomTitleBgmPlaying() {
    if (!playBgm) return;

    if (!bgmName) {
      // If PlayBgm is ON but name is blank, stop title BGM.
      // This is consistent with your original plugin behaviour.
      AudioManager.stopBgm();
      AudioManager.stopBgs();
      AudioManager.stopMe();
      return;
    }

    // Avoid replay bug: do nothing if the same track is already active.
    if (!isSameBgmPlaying()) {
      AudioManager.playBgm(desiredBgmObject());
    }

    // Clean up any leftovers
    AudioManager.stopBgs();
    AudioManager.stopMe();
  }

  // --- Early audio: preload + start during Scene_Boot ---
  var _Scene_Boot_create = Scene_Boot.prototype.create;
  Scene_Boot.prototype.create = function() {
    _Scene_Boot_create.call(this);

    // Preload the BGM buffer as early as possible (helps remove start delay).
    if (playBgm && earlyBgmStart && preloadBgm && bgmName) {
      try {
        // Creating buffer triggers load; MV will reuse when playBgm happens.
        AudioManager.createBuffer("bgm", bgmName);
      } catch (e) {
        // Silently ignore if platform disallows early audio buffering.
      }
    }
  };

  var _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);

    // Don’t run for battle test or event test.
    if (DataManager.isBattleTest && DataManager.isBattleTest()) return;
    if (DataManager.isEventTest && DataManager.isEventTest()) return;

    if (playBgm && earlyBgmStart && bgmName && !window.GaR_Titles._bootStartedBgm) {
      window.GaR_Titles._bootStartedBgm = true;

      // Start early so it plays behind MadeWithMV splash.
      // Avoid replay if somehow already started.
      ensureCustomTitleBgmPlaying();
    }
  };

  // --- Helpers ---
  function loadTitle1(name) {
    return ImageManager.loadTitle1(name);
  }

  // --- Title background animation ---
  var _Scene_Title_createBackground = Scene_Title.prototype.createBackground;
  Scene_Title.prototype.createBackground = function() {
    // If no frames configured, fall back to default behaviour.
    if (!frameNames || frameNames.length === 0) {
      _Scene_Title_createBackground.call(this);
      return;
    }

    this._garTitleFrames = frameNames.slice();
    this._garBitmaps = this._garTitleFrames.map(function(n){ return loadTitle1(n); });
    this._garAfterBitmap = afterImage ? loadTitle1(afterImage) : null;

    this._garFrameWait = frameWait;
    this._garLoopTarget = loops; // 0 = infinite
    this._garLoopCount = 0;
    this._garIndex = 0;
    this._garTick = 0;
    this._garFinished = false;

    this._backSprite1 = new Sprite(this._garBitmaps[0]);
    this.addChild(this._backSprite1);

    // Keep the normal Title2 overlay as per database.
    this._backSprite2 = new Sprite(ImageManager.loadTitle2($dataSystem.title2Name));
    this.addChild(this._backSprite2);
  };

  // Intercept default title music call:
  // - If PlayBgm is ON, we play (or keep) our custom BGM without restarting it.
  // - If PlayBgm is OFF, we fall back to the engine/database Title BGM.
  var _Scene_Title_playTitleMusic = Scene_Title.prototype.playTitleMusic;
  Scene_Title.prototype.playTitleMusic = function() {
    if (playBgm) {
      ensureCustomTitleBgmPlaying();
    } else {
      _Scene_Title_playTitleMusic.call(this);
    }
  };

  // Animate frames
  var _Scene_Title_update = Scene_Title.prototype.update;
  Scene_Title.prototype.update = function() {
    _Scene_Title_update.call(this);

    if (!this._garTitleFrames || this._garTitleFrames.length === 0) return;
    if (this._garFinished) return;

    this._garTick++;

    if (this._garTick >= this._garFrameWait) {
      this._garTick = 0;

      this._garIndex++;

      if (this._garIndex >= this._garTitleFrames.length) {
        this._garIndex = 0;
        this._garLoopCount++;

        if (this._garLoopTarget > 0 && this._garLoopCount >= this._garLoopTarget) {
          this._garFinished = true;

          if (this._garAfterBitmap) {
            this._backSprite1.bitmap = this._garAfterBitmap;
          } else {
            this._backSprite1.bitmap = this._garBitmaps[this._garTitleFrames.length - 1];
          }
          return;
        }
      }

      this._backSprite1.bitmap = this._garBitmaps[this._garIndex];
    }
  };

})();
