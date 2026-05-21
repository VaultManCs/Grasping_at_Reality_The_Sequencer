/*:
 * @target MV MZ
 * @plugindesc v1.9 GaR Character Select (Face + Stats) + Custom BG + Stop Music + Optional Select BGM (functional pre-class-select)
 * @author You
 *
 * @param ActorIds
 * @type string
 * @default 1,2
 * @desc Comma-separated actor IDs to show (e.g. 1,2,5).
 *
 * @param StartMapIds
 * @type string
 * @default 3,3
 * @desc Comma-separated map IDs per actor in ActorIds order (e.g. 3,7).
 *
 * @param StartXs
 * @type string
 * @default 8,8
 * @desc Comma-separated X coords per actor.
 *
 * @param StartYs
 * @type string
 * @default 6,6
 * @desc Comma-separated Y coords per actor.
 *
 * @param Title
 * @type string
 * @default Choose your character
 *
 * @param ConfirmText
 * @type string
 * @default Are you sure?
 *
 * @param BackgroundImage
 * @type file
 * @dir img/titles1
 * @default CharacterSelectBG
 * @desc (MZ picker) Filename in img/titles1 (no extension). MV: type manually.
 *
 * @param StopAllMusicOnOpen
 * @type boolean
 * @default true
 * @desc Stops AudioManager audio when character select opens.
 *
 * @param SelectBgm
 * @type file
 * @dir audio/bgm
 * @default
 * @desc Optional BGM to play on character select. Leave blank for none.
 *
 * @param SelectBgmVolume
 * @type number
 * @min 0
 * @max 100
 * @default 80
 *
 * @param SelectBgmPitch
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 * @param SelectBgmPan
 * @type number
 * @min -100
 * @max 100
 * @default 0
 *
 * @help
 * FLOW:
 * Title -> New Game -> Character Select (custom BG) -> confirm -> transfer to start map.
 *
 * Plugin Command:
 * CharacterSelect
 *
 * Notes:
 * - MV plugin manager does not truly support dropdown file pickers; MZ does.
 * - Face refresh is guarded to avoid recursion when bitmaps are already cached.
 */

(function() {
  "use strict";

  // Prevent accidental double-loading (which can cause recursion via double-wrapped hooks)
  var GAR = window.__GaR_CharacterSelect__ = window.__GaR_CharacterSelect__ || {};
  if (GAR._loadedOnce) return;
  GAR._loadedOnce = true;

  var pluginName = "GaR_CharacterSelect";
  var params = PluginManager.parameters(pluginName);

  // -------------------------------
  // Helpers
  // -------------------------------
  function asBool(v, def) {
    if (v === undefined || v === null || v === "") return !!def;
    return String(v).toLowerCase() === "true";
  }
  function asString(v, def) {
    if (v === undefined || v === null) return String(def || "");
    var s = String(v);
    return s.length ? s : String(def || "");
  }
  function asNumber(v, def) {
    var n = Number(v);
    return Number.isFinite(n) ? n : Number(def || 0);
  }
  function parseCsvNums(str, fallbackCsv) {
    var raw = (str !== undefined && str !== null && String(str).trim().length)
      ? String(str)
      : String(fallbackCsv || "");
    return raw.split(",")
      .map(function(s){ return s.trim(); })
      .filter(function(s){ return s.length > 0; })
      .map(function(n){ return Number(n); })
      .filter(function(n){ return Number.isFinite(n); });
  }

  // -------------------------------
  // Params
  // -------------------------------
  var ACTOR_IDS  = parseCsvNums(params["ActorIds"], "1,2");
  var START_MAPS = parseCsvNums(params["StartMapIds"], "3,3");
  var START_XS   = parseCsvNums(params["StartXs"], "8,8");
  var START_YS   = parseCsvNums(params["StartYs"], "6,6");

  var UI_TITLE   = asString(params["Title"], "Choose your character");
  var UI_CONFIRM = asString(params["ConfirmText"], "Are you sure?");

  var BG_IMAGE   = asString(params["BackgroundImage"], "CharacterSelectBG");
  var STOP_ON_OPEN = asBool(params["StopAllMusicOnOpen"], true);

  var SELECT_BGM   = asString(params["SelectBgm"], "");
  var SELECT_VOL   = asNumber(params["SelectBgmVolume"], 80);
  var SELECT_PITCH = asNumber(params["SelectBgmPitch"], 100);
  var SELECT_PAN   = asNumber(params["SelectBgmPan"], 0);

  function startForActorId(actorId) {
    actorId = Number(actorId);
    var idx = ACTOR_IDS.indexOf(actorId);
    if (idx < 0) idx = 0;

    function pick(arr, fallback) {
      if (!arr || !arr.length) return fallback;
      return (arr[idx] !== undefined && arr[idx] !== null) ? arr[idx]
           : (arr[0]   !== undefined && arr[0]   !== null) ? arr[0]
           : fallback;
    }

    return {
      mapId: Number(pick(START_MAPS, 1)),
      x:     Number(pick(START_XS,   0)),
      y:     Number(pick(START_YS,   0))
    };
  }

  // -------------------------------
  // Audio
  // -------------------------------
  function stopAllMusic() {
    if (AudioManager && AudioManager.stopAll) AudioManager.stopAll();
  }
  function playSelectBgmIfSet() {
    if (!SELECT_BGM) return;
    if (AudioManager && AudioManager.playBgm) {
      AudioManager.playBgm({ name: SELECT_BGM, volume: SELECT_VOL, pitch: SELECT_PITCH, pan: SELECT_PAN });
    }
  }

  // -------------------------------
  // Party + Player sprite
  // -------------------------------
  function setPartySingleActor(actorId) {
    actorId = Number(actorId);
    if (!$gameParty || !$gameActors) return;
    var actor = $gameActors.actor(actorId);
    if (!actor) return;

    // Remove all current members, then add chosen actor
    $gameParty.members().slice().forEach(function(a){
      $gameParty.removeActor(a.actorId());
    });
    $gameParty.addActor(actorId);
  }

  function setPlayerSpriteFromActorId(actorId) {
    actorId = Number(actorId);
    if (!$gamePlayer || !$gameActors) return;
    var a = $gameActors.actor(actorId);
    if (!a) return;

    var name = a.characterName();
    var index = a.characterIndex();
    if (name && $gamePlayer.setImage) $gamePlayer.setImage(name, index);
    if ($gamePlayer.refresh) $gamePlayer.refresh();
  }

  function forcePlayerVisible() {
    if (!$gamePlayer) return;
    if ($gamePlayer.setTransparent) $gamePlayer.setTransparent(false);
    if ($gamePlayer.setOpacity) $gamePlayer.setOpacity(255);
    if ($gamePlayer.refresh) $gamePlayer.refresh();
    if ($gamePlayer.followers && $gamePlayer.followers() && $gamePlayer.followers().refresh) {
      $gamePlayer.followers().refresh();
    }
  }

  function reserveTransferForActor(actorId) {
    var start = startForActorId(actorId);

    // Reserve transfer
    if ($gamePlayer && $gamePlayer.reserveTransfer) {
      $gamePlayer.reserveTransfer(start.mapId, start.x, start.y, 2, 0);
    }

    // Store post-transfer fixes
    if ($gameTemp) {
      $gameTemp._garChosenActorId = Number(actorId);
      $gameTemp._garApplySpriteOnce = true;
      $gameTemp._garClampOnce = true;
    }
  }

  function clampPlayerToMapOnce() {
    if (!$gameTemp || !$gameTemp._garClampOnce) return;
    $gameTemp._garClampOnce = false;

    if (!$gameMap || !$gamePlayer) return;
    if (!$gameMap.width || !$gameMap.height) return;

    var maxX = Math.max(0, $gameMap.width() - 1);
    var maxY = Math.max(0, $gameMap.height() - 1);

    var cx = Math.max(0, Math.min(maxX, Number($gamePlayer.x)));
    var cy = Math.max(0, Math.min(maxY, Number($gamePlayer.y)));

    if (($gamePlayer.x !== cx || $gamePlayer.y !== cy) && $gamePlayer.locate) {
      $gamePlayer.locate(cx, cy);
    }
  }

  // -------------------------------
  // Window: Character List
  // -------------------------------
  function Window_CharSelectList() { this.initialize.apply(this, arguments); }
  Window_CharSelectList.prototype = Object.create(Window_Command.prototype);
  Window_CharSelectList.prototype.constructor = Window_CharSelectList;

  Window_CharSelectList.prototype.initialize = function(x, y, width, height) {
    this._actorIds = ACTOR_IDS.slice();
    this._forcedWidth = width || 320;
    this._forcedHeight = height || 0;
    this._lastIndex = -999;
    this._onChange = null;
    Window_Command.prototype.initialize.call(this, x, y);
    this.select(0);
    this.activate();
  };

  Window_CharSelectList.prototype.windowWidth = function() {
    return Math.min(this._forcedWidth, Graphics.boxWidth);
  };

  Window_CharSelectList.prototype.windowHeight = function() {
    if (this._forcedHeight && this._forcedHeight > 0) return this._forcedHeight;
    return this.fittingHeight(this.numVisibleRows());
  };

  Window_CharSelectList.prototype.numVisibleRows = function() {
    return Math.max(2, Math.min(10, this._actorIds.length));
  };

  Window_CharSelectList.prototype.makeCommandList = function() {
    var self = this;
    this._actorIds.forEach(function(id) {
      var a = $gameActors && $gameActors.actor(Number(id));
      if (a) self.addCommand(a.name(), "actor", true, Number(id));
    });
  };

  Window_CharSelectList.prototype.currentActorId = function() {
    var ext = this.currentExt();
    return (ext !== undefined && ext !== null) ? Number(ext) : null;
  };

  Window_CharSelectList.prototype.setChangeHandler = function(fn) {
    this._onChange = fn;
  };

  Window_CharSelectList.prototype.update = function() {
    Window_Command.prototype.update.call(this);
    if (this._lastIndex !== this.index()) {
      this._lastIndex = this.index();
      if (this._onChange) this._onChange(this.currentActorId());
    }
  };

  // -------------------------------
  // Window: Preview (Face + basic stats) - recursion-safe
  // -------------------------------
  function Window_CharPreview() { this.initialize.apply(this, arguments); }
  Window_CharPreview.prototype = Object.create(Window_Base.prototype);
  Window_CharPreview.prototype.constructor = Window_CharPreview;

  Window_CharPreview.prototype.initialize = function(x, y, width, height) {
    Window_Base.prototype.initialize.call(this, x, y, width, height);
    this._actorId = null;
    this._refreshQueued = false;
    this.refresh();
  };

  Window_CharPreview.prototype.setActorId = function(actorId) {
    actorId = Number(actorId || 0);
    if (this._actorId !== actorId) {
      this._actorId = actorId;
      this.refresh();
    }
  };

  Window_CharPreview.prototype._queueRefreshOnce = function() {
    if (this._refreshQueued) return;
    this._refreshQueued = true;
    var self = this;
    setTimeout(function() {
      self._refreshQueued = false;
      self.refresh();
    }, 0);
  };

  Window_CharPreview.prototype.refresh = function() {
    this.contents.clear();
    var a = (this._actorId ? ($gameActors && $gameActors.actor(this._actorId)) : null);
    if (!a) return;

    var lh = this.lineHeight();
    var faceName = a.faceName ? a.faceName() : "";
    var faceIndex = a.faceIndex ? a.faceIndex() : 0;

    // Draw face
    if (faceName) {
      var bmp = ImageManager.loadFace(faceName);

      // Only add load listener if NOT ready (prevents recursion on cached bitmaps)
      if (bmp && bmp.addLoadListener && bmp.isReady && !bmp.isReady()) {
        var self = this;
        bmp.addLoadListener(function() {
          self._queueRefreshOnce();
        });
      }
      this.drawFace(faceName, faceIndex, 0, 0);
    }

// Text to the right
var xText = 156;
var y = 0;
var w = this.contents.width - xText;

var labelW = 70;                 // fixed label column width
var valueX = xText + labelW;     // start of values
var valueW = w - labelW;         // width available for values

this.resetFontSettings();

// Name
this.changeTextColor(this.systemColor());
this.drawText("Name:", xText, y, labelW, "left");
this.resetTextColor();
this.drawText(a.name(), valueX, y, valueW, "left");
y += lh;

// Class
this.changeTextColor(this.systemColor());
this.drawText("Class:", xText, y, labelW, "left");
this.resetTextColor();
this.drawText(a.currentClass().name, valueX, y, valueW, "left");
y += lh;

// Level
this.changeTextColor(this.systemColor());
this.drawText("Level:", xText, y, labelW, "left");
this.resetTextColor();
this.drawText(String(a.level), valueX, y, valueW, "left");
y += lh;

// HP
this.changeTextColor(this.systemColor());
this.drawText("HP:", xText, y, labelW, "left");
this.resetTextColor();
this.drawText(a.hp + " / " + a.mhp, valueX, y, valueW, "left");
y += lh;

// MP
this.changeTextColor(this.systemColor());
this.drawText("MP:", xText, y, labelW, "left");
this.resetTextColor();
this.drawText(a.mp + " / " + a.mmp, valueX, y, valueW, "left");
  };

  // -------------------------------
  // Window: Confirm
  // -------------------------------
  function Window_CharConfirm() { this.initialize.apply(this, arguments); }
  Window_CharConfirm.prototype = Object.create(Window_Command.prototype);
  Window_CharConfirm.prototype.constructor = Window_CharConfirm;

  Window_CharConfirm.prototype.initialize = function(x, y, width) {
    this._w = width || 360;
    Window_Command.prototype.initialize.call(this, x, y);
    this.openness = 0;
    this.deactivate();
  };

  Window_CharConfirm.prototype.windowWidth = function() {
    return Math.min(this._w, Graphics.boxWidth);
  };

  Window_CharConfirm.prototype.makeCommandList = function() {
    this.addCommand("Yes", "yes");
    this.addCommand("No", "no");
  };

  // -------------------------------
  // Scene: Character Select
  // -------------------------------
  function Scene_CharacterSelect() { this.initialize.apply(this, arguments); }
  Scene_CharacterSelect.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_CharacterSelect.prototype.constructor = Scene_CharacterSelect;

  Scene_CharacterSelect.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
    this._pendingActorId = null;
  };

  Scene_CharacterSelect.prototype.createBackground = function() {
    this._garBgSprite = new Sprite(ImageManager.loadTitle1(BG_IMAGE));
    this.addChild(this._garBgSprite);
  };

  Scene_CharacterSelect.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    if (STOP_ON_OPEN) stopAllMusic();
    playSelectBgmIfSet();
  };

  Scene_CharacterSelect.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createHelpWindow();
    this.createWindows();
  };

  Scene_CharacterSelect.prototype.createHelpWindow = function() {
    this._helpWindow = new Window_Help(1);
    this._helpWindow.setText(UI_TITLE);
    this.addWindow(this._helpWindow);
  };

  Scene_CharacterSelect.prototype.createWindows = function() {
    var topY = this._helpWindow ? this._helpWindow.height : 0;

    var listW = 320;
    this._listWindow = new Window_CharSelectList(0, topY, listW, 0);
    this._listWindow.setHandler("ok", this.onPickOk.bind(this));
    this._listWindow.setHandler("cancel", this.onPickCancel.bind(this));
    this.addWindow(this._listWindow);

    var previewX = listW;
    var previewW = Graphics.boxWidth - listW;
    var previewH = Graphics.boxHeight - topY;
    this._previewWindow = new Window_CharPreview(previewX, topY, previewW, previewH);
    this.addWindow(this._previewWindow);

    var self = this;
    this._listWindow.setChangeHandler(function(actorId) {
      self._previewWindow.setActorId(actorId);
    });
    this._previewWindow.setActorId(this._listWindow.currentActorId());

    // Confirm window at bottom centre
    var confirmW = 360;
    var confirmH = Window_Base.prototype.fittingHeight(2);
    var confirmX = Math.floor((Graphics.boxWidth - confirmW) / 2);
    var confirmY = Graphics.boxHeight - confirmH;

    this._confirmWindow = new Window_CharConfirm(confirmX, confirmY, confirmW);
    this._confirmWindow.setHandler("yes", this.onConfirmYes.bind(this));
    this._confirmWindow.setHandler("no", this.onConfirmNo.bind(this));
    this.addWindow(this._confirmWindow);
  };

  Scene_CharacterSelect.prototype.onPickOk = function() {
    this._pendingActorId = this._listWindow.currentActorId();
    if (!this._pendingActorId) return;

    this._helpWindow.setText(UI_CONFIRM);
    this._listWindow.deactivate();
    this._confirmWindow.open();
    this._confirmWindow.activate();
    this._confirmWindow.select(0);
  };

  Scene_CharacterSelect.prototype.onPickCancel = function() {
    SceneManager.goto(Scene_Title);
  };

  Scene_CharacterSelect.prototype.onConfirmNo = function() {
    this._confirmWindow.close();
    this._confirmWindow.deactivate();
    this._helpWindow.setText(UI_TITLE);
    this._pendingActorId = null;
    this._listWindow.activate();
  };

  Scene_CharacterSelect.prototype.onConfirmYes = function() {
    var actorId = Number(this._pendingActorId || 0);
    if (!actorId) return;

    setPartySingleActor(actorId);
    // Apply sprite now, and again once after transfer to be extra safe.
    setPlayerSpriteFromActorId(actorId);
    reserveTransferForActor(actorId);

    SceneManager.goto(Scene_Map);
  };

  // -------------------------------
  // Hook: New Game -> Character Select
  // -------------------------------
  if (!GAR._origNewGame) GAR._origNewGame = Scene_Title.prototype.commandNewGame;
  Scene_Title.prototype.commandNewGame = function() {
    DataManager.setupNewGame();
    SceneManager.goto(Scene_CharacterSelect);
  };

  // -------------------------------
  // Plugin Command: CharacterSelect
  // -------------------------------
  if (!GAR._origPluginCommand) GAR._origPluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    GAR._origPluginCommand.call(this, command, args);
    if (String(command).toLowerCase() === "characterselect") {
      SceneManager.push(Scene_CharacterSelect);
    }
  };

  // -------------------------------
  // After map starts: apply sprite/visibility once + clamp coords
  // -------------------------------
  if (!GAR._origSceneMapStart) GAR._origSceneMapStart = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function() {
    GAR._origSceneMapStart.call(this);

    // Clamp once (prevents out-of-bounds spawn if map size differs)
    clampPlayerToMapOnce();

    // Apply sprite once after transfer (helps if something reset it)
    if ($gameTemp && $gameTemp._garApplySpriteOnce) {
      $gameTemp._garApplySpriteOnce = false;
      setPlayerSpriteFromActorId($gameTemp._garChosenActorId);
      forcePlayerVisible();
    }
  };

  // Expose for debugging
  window.Scene_CharacterSelect = Scene_CharacterSelect;

})();
