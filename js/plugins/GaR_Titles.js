/*:
 * @plugindesc v1.3 Animated Title1 background + Early BGM start + "Press Any Button" gate that truly blocks menu opening (GaR_Titles) [RPG Maker MV]
 * @author GaR (with Copilot)
 *
 * @help
 * ============================================================================
 * GaR_Titles (RPG Maker MV)
 * ============================================================================
 * - Cycles through multiple Title1 images (img/titles1/) behind the Title menu.
 * - Optional loop count and optional AfterImage when loops finish.
 * - Optional early BGM start during boot so it plays during splash screens.
 * - Avoids replay bugs by not restarting the same BGM when entering Scene_Title.
 * - Optional "Press Any Button to Start" screen that hides the menu until input.
 *
 * Put your animation frames in: /img/titles1/
 * Put your after/final image in: /img/titles1/ (optional)
 *
 * No plugin commands.
 * ============================================================================
 *
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
 * @param ---------------- Audio ----------------
 * @default
 *
 * @param PlayBgm
 * @parent ---------------- Audio ----------------
 * @type boolean
 * @on Yes
 * @off No
 * @desc Use a custom title BGM (below) instead of database title BGM?
 * @default true
 *
 * @param EarlyBgmStart
 * @parent ---------------- Audio ----------------
 * @type boolean
 * @on Yes
 * @off No
 * @desc Start the custom title BGM early during boot (plays during splash screens).
 * @default true
 *
 * @param PreloadBgm
 * @parent ---------------- Audio ----------------
 * @type boolean
 * @on Yes
 * @off No
 * @desc Preload the custom title BGM buffer during boot to reduce start delay.
 * @default true
 *
 * @param BgmName
 * @parent ---------------- Audio ----------------
 * @type file
 * @dir audio/bgm/
 * @desc BGM file name (in audio/bgm/). Leave blank to stop BGM when PlayBgm is ON.
 * @default
 *
 * @param BgmVolume
 * @parent ---------------- Audio ----------------
 * @type number
 * @min 0
 * @max 100
 * @desc BGM volume (0-100).
 * @default 90
 *
 * @param BgmPitch
 * @parent ---------------- Audio ----------------
 * @type number
 * @min 50
 * @max 150
 * @desc BGM pitch (50-150).
 * @default 100
 *
 * @param BgmPan
 * @parent ---------------- Audio ----------------
 * @type number
 * @min -100
 * @max 100
 * @desc BGM pan (-100 to 100).
 * @default 0
 *
 * @param ------------- Press Start -------------
 * @default
 *
 * @param EnablePressStart
 * @parent ------------- Press Start -------------
 * @type boolean
 * @on Yes
 * @off No
 * @desc Show "Press Any Button" before the title command menu appears?
 * @default false
 *
 * @param PressStartText
 * @parent ------------- Press Start -------------
 * @type string
 * @desc Text shown for press start.
 * @default Press Any Button
 *
 * @param PressStartFontSize
 * @parent ------------- Press Start -------------
 * @type number
 * @min 8
 * @max 96
 * @desc Font size for press start text.
 * @default 36
 *
 * @param PressStartY
 * @parent ------------- Press Start -------------
 * @type number
 * @min -9999
 * @max 9999
 * @desc Y position for press start text. (Negative = offset from bottom)
 * @default -120
 *
 * @param PressStartBlinkSpeed
 * @parent ------------- Press Start -------------
 * @type number
 * @min 1
 * @max 120
 * @desc Blink speed (higher = slower). Uses sine fade.
 * @default 10
 *
 * @param PressStartSe
 * @parent ------------- Press Start -------------
 * @type file
 * @dir audio/se/
 * @desc Optional SE played when pressing a button to reveal the menu.
 * @default
 *
 * @param PressStartSeVolume
 * @parent ------------- Press Start -------------
 * @type number
 * @min 0
 * @max 100
 * @default 90
 *
 * @param PressStartSePitch
 * @parent ------------- Press Start -------------
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 * @param PressStartSePan
 * @parent ------------- Press Start -------------
 * @type number
 * @min -100
 * @max 100
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

  // ---------------- Param helpers ----------------
  function pBool(name, def) {
    var v = params[name];
    if (v === undefined) return def;
    return String(v) === "true";
  }
  function pNum(name, def, min) {
    var n = Number(params[name]);
    if (isNaN(n)) n = def;
    if (min !== undefined) n = Math.max(min, n);
    return n;
  }
  function pStr(name, def) {
    var v = params[name];
    if (v === undefined) return def;
    return String(v);
  }
  function parseStructArray(raw) {
    // MV stores struct arrays as JSON strings of JSON strings.
    // Example: ["{\"Image\":\"Frame1\"}","{\"Image\":\"Frame2\"}"]
    try {
      var arr = JSON.parse(raw || "[]");
      return arr.map(function(s) {
        try { return JSON.parse(s); } catch (e) { return {}; }
      });
    } catch (e) {
      return [];
    }
  }

  // ---------------- Animation params ----------------
  var frameStructs = parseStructArray(params["Frames"]);
  var frameNames = frameStructs
    .map(function(o){ return (o && o.Image) ? String(o.Image) : ""; })
    .filter(function(n){ return n.length > 0; });

  var frameWait  = Math.max(1, pNum("FrameWait", 12, 1));
  var loops      = Math.max(0, pNum("Loops", 0, 0));
  var afterImage = pStr("AfterImage", "");

  // ---------------- Audio params ----------------
  var playBgm       = pBool("PlayBgm", true);
  var earlyBgmStart = pBool("EarlyBgmStart", true);
  var preloadBgm    = pBool("PreloadBgm", true);

  var bgmName   = pStr("BgmName", "");
  var bgmVolume = pNum("BgmVolume", 90, 0);
  var bgmPitch  = pNum("BgmPitch", 100, 0);
  var bgmPan    = pNum("BgmPan", 0);

  // ---------------- Press Start params ----------------
  var enablePressStart   = pBool("EnablePressStart", false);
  var pressStartText     = pStr("PressStartText", "Press Any Button");
  var pressStartFontSize = pNum("PressStartFontSize", 36, 8);
  var pressStartY        = pNum("PressStartY", -120);
  var pressStartBlinkSpd = pNum("PressStartBlinkSpeed", 10, 1);

  var pressStartSe       = pStr("PressStartSe", "");
  var pressStartSeVolume = pNum("PressStartSeVolume", 90, 0);
  var pressStartSePitch  = pNum("PressStartSePitch", 100, 0);
  var pressStartSePan    = pNum("PressStartSePan", 0);

  // ---------------- Namespace flags ----------------
  window.GaR_Titles = window.GaR_Titles || {};
  window.GaR_Titles._bootStartedBgm = false;

  // ---------------- Audio helpers ----------------
  function desiredBgmObject() {
    return { name: bgmName, volume: bgmVolume, pitch: bgmPitch, pan: bgmPan };
  }
  function isSameBgmPlaying() {
    return AudioManager._currentBgm && AudioManager._currentBgm.name === bgmName;
  }
  function ensureCustomTitleBgmPlaying() {
    if (!playBgm) return;

    if (!bgmName) {
      AudioManager.stopBgm();
      AudioManager.stopBgs();
      AudioManager.stopMe();
      return;
    }

    // Avoid replay bug: only play if different track
    if (!isSameBgmPlaying()) {
      AudioManager.playBgm(desiredBgmObject());
    }

    AudioManager.stopBgs();
    AudioManager.stopMe();
  }

  // ---------------- Early BGM (boot) ----------------
  var _Scene_Boot_create = Scene_Boot.prototype.create;
  Scene_Boot.prototype.create = function() {
    _Scene_Boot_create.call(this);

    if (playBgm && earlyBgmStart && preloadBgm && bgmName) {
      try {
        AudioManager.createBuffer("bgm", bgmName);
      } catch (e) {
        // ignore
      }
    }
  };

  var _Scene_Boot_start = Scene_Boot.prototype.start;
  Scene_Boot.prototype.start = function() {
    _Scene_Boot_start.call(this);

    if (DataManager.isBattleTest && DataManager.isBattleTest()) return;
    if (DataManager.isEventTest && DataManager.isEventTest()) return;

    if (playBgm && earlyBgmStart && bgmName && !window.GaR_Titles._bootStartedBgm) {
      window.GaR_Titles._bootStartedBgm = true;
      ensureCustomTitleBgmPlaying();
    }
  };

  // ---------------- Image helper ----------------
  function loadTitle1(name) {
    return ImageManager.loadTitle1(name);
  }

  // ---------------- Press Start helpers ----------------
  function anyInputTriggered() {
    // Touch/click
    if (TouchInput && TouchInput.isTriggered && TouchInput.isTriggered()) return true;

    // Any mapped key symbol
    for (var keyCode in Input.keyMapper) {
      if (!Object.prototype.hasOwnProperty.call(Input.keyMapper, keyCode)) continue;
      var symbol = Input.keyMapper[keyCode];
      if (symbol && Input.isTriggered(symbol)) return true;
    }

    // Common fallbacks
    var common = ["ok","cancel","menu","shift","pageup","pagedown","up","down","left","right"];
    for (var i = 0; i < common.length; i++) {
      if (Input.isTriggered(common[i])) return true;
    }

    return false;
  }

  function playPressStartSe() {
    if (!pressStartSe) return;
    AudioManager.playSe({
      name: pressStartSe,
      volume: pressStartSeVolume,
      pitch: pressStartSePitch,
      pan: pressStartSePan
    });
  }

  // ---------------- HARD BLOCK: prevent MV reopening the title command window ----------------
  // MV calls open() during Scene_Title.start. Closing once isn't enough.
  // We intercept open/updateOpen for Window_TitleCommand while we're waiting for Press Start.
  var _Window_TitleCommand_open = Window_TitleCommand.prototype.open;
  Window_TitleCommand.prototype.open = function() {
    var scene = SceneManager._scene;
    if (scene && scene instanceof Scene_Title && scene._garPressStartWaiting) {
      this.openness = 0;
      this._opening = false;
      this._closing = false;
      return this;
    }
    return _Window_TitleCommand_open.call(this);
  };

  var _Window_TitleCommand_updateOpen = Window_TitleCommand.prototype.updateOpen;
  Window_TitleCommand.prototype.updateOpen = function() {
    var scene = SceneManager._scene;
    if (scene && scene instanceof Scene_Title && scene._garPressStartWaiting) {
      this.openness = 0;
      this._opening = false;
      return;
    }
    _Window_TitleCommand_updateOpen.call(this);
  };

  // ---------------- Title background animation ----------------
  var _Scene_Title_createBackground = Scene_Title.prototype.createBackground;
  Scene_Title.prototype.createBackground = function() {
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

    // Keep Title2 overlay as per database settings
    this._backSprite2 = new Sprite(ImageManager.loadTitle2($dataSystem.title2Name));
    this.addChild(this._backSprite2);
  };

  // ---------------- Title music override (no replay) ----------------
  var _Scene_Title_playTitleMusic = Scene_Title.prototype.playTitleMusic;
  Scene_Title.prototype.playTitleMusic = function() {
    if (playBgm) {
      ensureCustomTitleBgmPlaying();
    } else {
      _Scene_Title_playTitleMusic.call(this);
    }
  };

  // ---------------- Press Start UI ----------------
  Scene_Title.prototype._garCreatePressStart = function() {
    if (this._garPressStartSprite) return;

    this._garPressStartSprite = new Sprite(new Bitmap(Graphics.width, 64));
    var b = this._garPressStartSprite.bitmap;

    b.fontSize = pressStartFontSize;
    b.outlineWidth = 6;
    b.outlineColor = "rgba(0,0,0,0.6)";
    b.textColor = "#ffffff";
    b.drawText(pressStartText, 0, 0, Graphics.width, 64, "center");

    var y = pressStartY;
    this._garPressStartSprite.y = (y < 0) ? (Graphics.height + y) : y;
    this._garPressStartSprite.opacity = 180;

    this.addChild(this._garPressStartSprite);

    this._garPressBlinkCount = 0;
  };

  Scene_Title.prototype._garUpdatePressStart = function() {
    if (!this._garPressStartSprite) return;

    this._garPressBlinkCount++;
    var t = this._garPressBlinkCount / pressStartBlinkSpd;
    this._garPressStartSprite.opacity = 140 + Math.sin(t) * 110;

    if (anyInputTriggered()) {
      this._garPressStartWaiting = false;

      if (this._garPressStartSprite) this._garPressStartSprite.visible = false;
      playPressStartSe();

      if (this._commandWindow) {
        this._commandWindow.open();
        this._commandWindow.activate();
        this._commandWindow.select(0);
      }
    }
  };

  // Hook createCommandWindow so we can set waiting state BEFORE MV tries to open it.
  var _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
  Scene_Title.prototype.createCommandWindow = function() {
    _Scene_Title_createCommandWindow.call(this);

    if (enablePressStart && this._commandWindow) {
      this._garPressStartWaiting = true;

      // Ensure hidden immediately
      this._commandWindow.openness = 0;
      this._commandWindow.deactivate();

      this._garCreatePressStart();
    }
  };

  // Update: animate frames and press-start behaviour
  var _Scene_Title_update = Scene_Title.prototype.update;
  Scene_Title.prototype.update = function() {
    _Scene_Title_update.call(this);

    // Animate Title1 frames
    if (this._garTitleFrames && this._garTitleFrames.length > 0 && !this._garFinished) {
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
          } else {
            this._backSprite1.bitmap = this._garBitmaps[this._garIndex];
          }
        } else {
          this._backSprite1.bitmap = this._garBitmaps[this._garIndex];
        }
      }
    }

    // Press Start update (keeps menu blocked until input)
    if (enablePressStart && this._garPressStartWaiting) {
      this._garUpdatePressStart();
    }
  };

})();