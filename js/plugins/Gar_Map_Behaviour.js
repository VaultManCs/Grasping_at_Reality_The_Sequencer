/*:
 * @plugindesc Gar_Map_Behaviour v1.1 - Camera Lock and Camera Centre Controls
 * @author Gar
 *
 * @help
 * ============================================================================
 * Plugin Commands
 * ============================================================================
 *
 * LockMap X Y
 *
 * Example:
 *
 *   LockMap 10 5
 *
 * Locks the camera so tile (10,5) remains at the
 * top-left corner of the screen.
 *
 * ============================================================================
 *
 * CenterMap X Y
 *
 * Example:
 *
 *   CenterMap 20 15
 *
 * Centres the camera on tile (20,15).
 *
 * ============================================================================
 *
 * UnlockMap
 *
 * Restores normal player-following camera.
 *
 * ============================================================================
 */

(function() {

    "use strict";

var cameraLocked = false;

var cameraX = 0;
var cameraY = 0;

var targetX = 0;
var targetY = 0;

var smoothScroll = false;
var smoothSpeed = 0.50;

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;

    Game_Interpreter.prototype.pluginCommand = function(command, args) {

        _Game_Interpreter_pluginCommand.call(
            this,
            command,
            args
        );

        if (command === "LockMap") {

    targetX = Number(args[0] || 0);
    targetY = Number(args[1] || 0);

    cameraX = targetX;
    cameraY = targetY;

    smoothScroll = false;
    cameraLocked = true;

    $gameMap.setDisplayPos(
        cameraX,
        cameraY
    );
}
if (command === "SmoothLockMap") {

    targetX = Number(args[0] || 0);
    targetY = Number(args[1] || 0);

    smoothSpeed = Number(args[2] || 0.50);

    cameraX = $gameMap.displayX();
    cameraY = $gameMap.displayY();

    smoothScroll = true;
    cameraLocked = true;

}


        if (command === "CenterMap") {

    var x = Number(args[0] || 0);
    var y = Number(args[1] || 0);

    targetX = x - ($gameMap.screenTileX() / 2);
    targetY = y - ($gameMap.screenTileY() / 2);

    cameraX = targetX;
    cameraY = targetY;

    smoothScroll = false;
    cameraLocked = true;

}
if (command === "SmoothCenterMap") {

    var x = Number(args[0] || 0);
    var y = Number(args[1] || 0);

    smoothSpeed = Number(args[2] || 0.50);

    targetX = x - ($gameMap.screenTileX() / 2);
    targetY = y - ($gameMap.screenTileY() / 2);

cameraX = $gameMap.displayX();
cameraY = $gameMap.displayY();

smoothScroll = true;
cameraLocked = true;

}

if (command === "UnlockMap") {

    cameraLocked = false;

}

if (command === "SetScrollSpeed") {

    smoothSpeed = Number(args[0] || 0.50);

}

};

    // Prevent player movement from scrolling the map
    var _Game_Player_updateScroll =
        Game_Player.prototype.updateScroll;

    Game_Player.prototype.updateScroll = function(lastX, lastY) {

if (cameraLocked) {

    $gameMap.setDisplayPos(
        cameraX,
        cameraY
    );

    return;
}

        _Game_Player_updateScroll.call(
            this,
            lastX,
            lastY
        );

    };

    // Continuously force the camera position
    var _Scene_Map_update =
        Scene_Map.prototype.update;

    Scene_Map.prototype.update = function() {

        _Scene_Map_update.call(this);

        if (cameraLocked) {

    if (smoothScroll) {

        cameraX += (targetX - cameraX) * smoothSpeed;
        cameraY += (targetY - cameraY) * smoothSpeed;

        if (Math.abs(cameraX - targetX) < 0.01) {
            cameraX = targetX;
        }

        if (Math.abs(cameraY - targetY) < 0.01) {
            cameraY = targetY;
        }

    } else {

        cameraX = targetX;
        cameraY = targetY;

    }

    $gameMap.setDisplayPos(
        cameraX,
        cameraY
    );

}

    };

})();