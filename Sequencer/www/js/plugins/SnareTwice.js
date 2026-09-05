/*:
 * @plugindesc Plays the sound effect "snare", waits 30 frames, then plays it again. v1.0
 * @author Copilot
 *
 * @help
 * Plugin Command:
 *
 *   PlaySnareTwice
 *
 * Place your sound effect file:
 *   audio/se/snare.ogg
 * (or another supported RPG Maker MV audio format)
 */

(function() {

    var _Game_Interpreter_pluginCommand =
        Game_Interpreter.prototype.pluginCommand;

    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === "PlaySnareTwice") {

            AudioManager.playSe({
                name: "snare",
                volume: 90,
                pitch: 100,
                pan: 0
            });

            this.wait(30);

            this.setWaitMode("snareTwice");
            this._snareTwiceFrames = 30;
        }
    };

    var _Game_Interpreter_updateWaitMode =
        Game_Interpreter.prototype.updateWaitMode;

    Game_Interpreter.prototype.updateWaitMode = function() {

        if (this._waitMode === "snareTwice") {

            this._snareTwiceFrames--;

            if (this._snareTwiceFrames <= 0) {

                AudioManager.playSe({
                    name: "snare",
                    volume: 90,
                    pitch: 100,
                    pan: 0
                });

                this._waitMode = "";
                return false;
            }

            return true;
        }

        return _Game_Interpreter_updateWaitMode.call(this);
    };

})();