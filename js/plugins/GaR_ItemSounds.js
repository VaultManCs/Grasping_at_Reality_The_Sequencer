/*:
 * @plugindesc v1.1 - Associate RPG Maker MV items with SE files and play them by item reference or variable. (GaR_ItemSounds)
 * @author GaR
 *
 * @param Default Volume
 * @type number
 * @min 0
 * @max 100
 * @default 90
 * @desc Default volume used when no item/default override is provided.
 *
 * @param Default Pitch
 * @type number
 * @min 50
 * @max 150
 * @default 100
 * @desc Default pitch used when no item/default override is provided.
 *
 * @param Default Pan
 * @type number
 * @min -100
 * @max 100
 * @default 0
 * @desc Default pan used when no item/default override is provided.
 *
 * @param Enable SE Alias Command
 * @type boolean
 * @default true
 * @desc If true, plugin command "SE Item1" or "SE V10" works as an alias.
 *
 * @help
 * ============================================================================
 * GaR_ItemSounds
 * ============================================================================
 * RPG Maker MV plugin that lets you associate an item with a sound effect
 * and then play that sound by referring to the item directly or by variable.
 *
 * ---------------------------------------------------------------------------
 * ITEM NOTE TAGS
 * ---------------------------------------------------------------------------
 * Put these in the item's Note box in the database:
 *
 *   <ItemSE: Bell1>
 *   <ItemSEVolume: 90>
 *   <ItemSEPitch: 100>
 *   <ItemSEPan: 0>
 *
 * Only <ItemSE: ...> is required.
 *
 * ---------------------------------------------------------------------------
 * ITEM REFERENCE FORMATS
 * ---------------------------------------------------------------------------
 * This plugin accepts the following item references:
 *
 *   1         -> item ID 1
 *   Item1     -> item ID 1
 *   V10       -> use the value in variable 10 as the item ID
 *   ItemV10   -> use the value in variable 10 as the item ID
 *
 * ---------------------------------------------------------------------------
 * PLUGIN COMMANDS
 * ---------------------------------------------------------------------------
 * Play by item reference:
 *
 *   GaR_ItemSounds Play 1
 *   GaR_ItemSounds Play Item1
 *   GaR_ItemSounds Play V10
 *   GaR_ItemSounds Play ItemV10
 *   GaR_ItemSounds Play Item1 80 120 0
 *   GaR_ItemSounds Play V10 80 120 0
 *
 * Shorthand alias (if enabled in parameters):
 *
 *   SE 1
 *   SE Item1
 *   SE V10
 *   SE ItemV10
 *   SE Item1 80 120 0
 *   SE V10 80 120 0
 *
 * Assign / override item sound at runtime:
 *
 *   GaR_ItemSounds Assign 1 Bell1
 *   GaR_ItemSounds Assign Item1 Bell1
 *   GaR_ItemSounds Assign V10 Bell1
 *   GaR_ItemSounds Assign Item1 Bell1 90 100 0
 *   GaR_ItemSounds Assign V10 Bell1 90 100 0
 *
 * Clear runtime assignment:
 *
 *   GaR_ItemSounds Clear 1
 *   GaR_ItemSounds Clear Item1
 *   GaR_ItemSounds Clear V10
 *   GaR_ItemSounds Clear ItemV10
 *
 * ---------------------------------------------------------------------------
 * SCRIPT CALLS
 * ---------------------------------------------------------------------------
 * Play item SE:
 *
 *   GaR.ItemSounds.playItemSe(1);
 *   GaR.ItemSounds.playItemSe("Item1");
 *   GaR.ItemSounds.playItemSe("V10");
 *   GaR.ItemSounds.playItemSe("ItemV10");
 *   GaR.ItemSounds.playItemSe(1, 80, 120, 0);
 *
 * Play item SE using a variable ID directly:
 *
 *   GaR.ItemSounds.playItemSeVar(10);
 *   GaR.ItemSounds.playItemSeVar(10, 80, 120, 0);
 *
 * Get the SE object without playing it:
 *
 *   var se = GaR.ItemSounds.getItemSeObject(1);
 *   var se = GaR.ItemSounds.getItemSeObject("V10");
 *
 * Assign / override item SE at runtime:
 *
 *   GaR.ItemSounds.assignItemSe(1, "Bell1");
 *   GaR.ItemSounds.assignItemSe(1, "Bell1", 90, 100, 0);
 *   GaR.ItemSounds.assignItemSe("V10", "Bell1", 90, 100, 0);
 *
 * Assign using a variable ID directly:
 *
 *   GaR.ItemSounds.assignItemSeVar(10, "Bell1");
 *   GaR.ItemSounds.assignItemSeVar(10, "Bell1", 90, 100, 0);
 *
 * Clear runtime override:
 *
 *   GaR.ItemSounds.clearItemSe(1);
 *   GaR.ItemSounds.clearItemSe("V10");
 *   GaR.ItemSounds.clearItemSeVar(10);
 *
 * ---------------------------------------------------------------------------
 * HOW IT RESOLVES SETTINGS
 * ---------------------------------------------------------------------------
 * When playing a sound for an item:
 *
 * 1. Runtime assigned sound settings (if assigned with plugin command/script)
 * 2. Item note tags from the database
 * 3. Plugin defaults
 *
 * If you provide volume / pitch / pan in the Play command or script call,
 * those override everything else for that call only.
 *
 * ---------------------------------------------------------------------------
 * EXAMPLES
 * ---------------------------------------------------------------------------
 * Item 1 note box:
 *   <ItemSE: Bell1>
 *
 * Event plugin command:
 *   SE Item1
 *
 * Event plugin command using a variable:
 *   SE V10
 *
 * Event plugin command with override:
 *   SE Item1 80 130 -10
 *
 * ============================================================================
 * Terms of use:
 * Free to use and edit for your own project.
 * ============================================================================
 */

var Imported = Imported || {};
Imported.GaR_ItemSounds = true;

var GaR = GaR || {};
GaR.ItemSounds = GaR.ItemSounds || {};

(function($) {
    "use strict";

    var pluginName = "GaR_ItemSounds";
    var params = PluginManager.parameters(pluginName);

    $.defaultVolume = Number(params["Default Volume"] || 90);
    $.defaultPitch  = Number(params["Default Pitch"] || 100);
    $.defaultPan    = Number(params["Default Pan"] || 0);
    $.enableSEAlias = String(params["Enable SE Alias Command"] || "true").toLowerCase() === "true";

    // Runtime overrides: itemId -> { name, volume, pitch, pan }
    $.runtimeMap = {};

    $.clamp = function(value, min, max) {
        value = Number(value);
        if (isNaN(value)) value = 0;
        return Math.max(min, Math.min(max, value));
    };

    /**
     * Converts an item reference into a final item ID.
     *
     * Accepted formats:
     *   1
     *   "1"
     *   "Item1"
     *   "V10"      -> variable 10 holds item ID
     *   "ItemV10"  -> variable 10 holds item ID
     */
    $.resolveItemId = function(itemRef) {
        if (itemRef == null) return NaN;

        // Raw number
        if (typeof itemRef === "number") {
            return itemRef;
        }

        var s = String(itemRef).trim();

        // Pure number string: "1"
        if (/^\d+$/.test(s)) {
            return Number(s);
        }

        // Item<number>: "Item1"
        var itemMatch = /^Item(\d+)$/i.exec(s);
        if (itemMatch) {
            return Number(itemMatch[1]);
        }

        // Variable reference: "V10"
        var varMatch = /^V(\d+)$/i.exec(s);
        if (varMatch) {
            return Number($gameVariables.value(Number(varMatch[1])) || 0);
        }

        // Variable reference: "ItemV10"
        var itemVarMatch = /^ItemV(\d+)$/i.exec(s);
        if (itemVarMatch) {
            return Number($gameVariables.value(Number(itemVarMatch[1])) || 0);
        }

        return NaN;
    };

    $.getItem = function(itemRef) {
        var itemId = $.resolveItemId(itemRef);
        if (!itemId || !$dataItems || !$dataItems[itemId]) return null;
        return $dataItems[itemId];
    };

    $.getMetaNumber = function(metaValue, fallback) {
        if (metaValue == null || metaValue === "") return fallback;
        var n = Number(metaValue);
        return isNaN(n) ? fallback : n;
    };

    $.buildSeFromItem = function(itemRef, volOverride, pitOverride, panOverride) {
        var item = $.getItem(itemRef);
        if (!item) return null;

        var runtime = $.runtimeMap[item.id];
        var meta = item.meta || {};

        var name =
            runtime && runtime.name ? runtime.name :
            (meta.ItemSE ? String(meta.ItemSE).trim() : "");

        if (!name) return null;

        var volume =
            volOverride != null ? Number(volOverride) :
            (runtime && runtime.volume != null ? runtime.volume :
            $.getMetaNumber(meta.ItemSEVolume, $.defaultVolume));

        var pitch =
            pitOverride != null ? Number(pitOverride) :
            (runtime && runtime.pitch != null ? runtime.pitch :
            $.getMetaNumber(meta.ItemSEPitch, $.defaultPitch));

        var pan =
            panOverride != null ? Number(panOverride) :
            (runtime && runtime.pan != null ? runtime.pan :
            $.getMetaNumber(meta.ItemSEPan, $.defaultPan));

        return {
            name: name,
            volume: $.clamp(volume, 0, 100),
            pitch: $.clamp(pitch, 50, 150),
            pan: $.clamp(pan, -100, 100)
        };
    };

    $.getItemSeObject = function(itemRef, volOverride, pitOverride, panOverride) {
        return $.buildSeFromItem(itemRef, volOverride, pitOverride, panOverride);
    };

    $.playItemSe = function(itemRef, volOverride, pitOverride, panOverride) {
        var se = $.buildSeFromItem(itemRef, volOverride, pitOverride, panOverride);
        if (!se) {
            console.warn("GaR_ItemSounds: No valid SE found for item reference:", itemRef);
            return;
        }
        AudioManager.playSe(se);
    };

    $.playItemSeVar = function(variableId, volOverride, pitOverride, panOverride) {
        var itemId = Number($gameVariables.value(Number(variableId)) || 0);
        $.playItemSe(itemId, volOverride, pitOverride, panOverride);
    };

    $.assignItemSe = function(itemRef, seName, volume, pitch, pan) {
        var item = $.getItem(itemRef);
        if (!item) {
            console.warn("GaR_ItemSounds: Cannot assign sound. Invalid item reference:", itemRef);
            return;
        }

        $.runtimeMap[item.id] = {
            name: String(seName || "").trim(),
            volume: volume != null ? $.clamp(volume, 0, 100) : null,
            pitch:  pitch  != null ? $.clamp(pitch, 50, 150) : null,
            pan:    pan    != null ? $.clamp(pan, -100, 100) : null
        };
    };

    $.assignItemSeVar = function(variableId, seName, volume, pitch, pan) {
        var itemId = Number($gameVariables.value(Number(variableId)) || 0);
        $.assignItemSe(itemId, seName, volume, pitch, pan);
    };

    $.clearItemSe = function(itemRef) {
        var item = $.getItem(itemRef);
        if (!item) {
            console.warn("GaR_ItemSounds: Cannot clear sound. Invalid item reference:", itemRef);
            return;
        }
        delete $.runtimeMap[item.id];
    };

    $.clearItemSeVar = function(variableId) {
        var itemId = Number($gameVariables.value(Number(variableId)) || 0);
        $.clearItemSe(itemId);
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === "GaR_ItemSounds") {
            var sub = args[0] ? String(args[0]).toLowerCase() : "";

            if (sub === "play") {
                var itemRef = args[1];
                var vol = args.length >= 3 ? args[2] : null;
                var pit = args.length >= 4 ? args[3] : null;
                var pan = args.length >= 5 ? args[4] : null;
                $.playItemSe(itemRef, vol, pit, pan);
            }

            else if (sub === "assign") {
                var assignItemRef = args[1];
                var seName = args[2] || "";
                var aVol = args.length >= 4 ? args[3] : null;
                var aPit = args.length >= 5 ? args[4] : null;
                var aPan = args.length >= 6 ? args[5] : null;
                $.assignItemSe(assignItemRef, seName, aVol, aPit, aPan);
            }

            else if (sub === "clear") {
                var clearItemRef = args[1];
                $.clearItemSe(clearItemRef);
            }
        }

        // Optional shorthand alias:
        // SE Item1
        // SE V10
        // SE Item1 80 120 0
        // SE V10 80 120 0
        if ($.enableSEAlias && command === "SE") {
            var itemRefAlias = args[0];
            var volAlias = args.length >= 2 ? args[1] : null;
            var pitAlias = args.length >= 3 ? args[2] : null;
            var panAlias = args.length >= 4 ? args[3] : null;
            $.playItemSe(itemRefAlias, volAlias, pitAlias, panAlias);
        }
    };

})(GaR.ItemSounds);