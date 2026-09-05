(function() {

"use strict";

var params = PluginManager.parameters("GaR_Sequencer");

function getMappedSound(prefix, index) {

    var soundName = params[prefix + index];

    if (!soundName || soundName.trim() === "") {
        soundName = params[prefix + "0"];
    }

    return soundName;
}

function getKickSound() {
    return getMappedSound("KickSound", $gameVariables.value(301));
}

function getSnareSound() {
    return getMappedSound("SnareSound", $gameVariables.value(302));
}

function getHatSound() {
    return getMappedSound("HatSound", $gameVariables.value(303));
}

function getBassSound() {
    return getMappedSound("BassSound", $gameVariables.value(304));
}

function playSE(soundName) {

    AudioManager.playSe({
        name: soundName,
        volume: 90,
        pitch: 100,
        pan: 0
    });

}

function playBass(pitch) {

    AudioManager.playSe({
        name: getBassSound(),
        volume: 80,
        pitch: pitch,
        pan: 0
    });

}

var GaRSequencer = {

    running: false,
    timer: 0,
    step: 0,

    start: function() {

        this.running = true;

        $gameSwitches.setValue(330, true);

        this.timer = 0;
        this.step = 0;

        for (var i = 291; i <= 298; i++) {
            $gameSwitches.setValue(i, false);
        }

        $gameSwitches.setValue(291, true);

        this.playCurrentStep();

    },

    stop: function() {

        this.running = false;

        $gameSwitches.setValue(330, false);

        for (var i = 291; i <= 298; i++) {
            $gameSwitches.setValue(i, false);
        }

    },

    playCurrentStep: function() {

        var kickSwitch  = 301 + this.step;
        var snareSwitch = 311 + this.step;
        var hatSwitch   = 321 + this.step;

        if ($gameSwitches.value(kickSwitch)) {
            playSE(getKickSound());
        }

        if ($gameSwitches.value(snareSwitch)) {
            playSE(getSnareSound());
        }

        if ($gameSwitches.value(hatSwitch)) {
            playSE(getHatSound());
        }

        if ($gameSwitches.value(341 + this.step)) {
            playBass(140);
        }

        if ($gameSwitches.value(351 + this.step)) {
            playBass(130);
        }

        if ($gameSwitches.value(361 + this.step)) {
            playBass(120);
        }

        if ($gameSwitches.value(371 + this.step)) {
            playBass(110);
        }

        if ($gameSwitches.value(381 + this.step)) {
            playBass(100);
        }

        if ($gameSwitches.value(391 + this.step)) {
            playBass(90);
        }

        if ($gameSwitches.value(401 + this.step)) {
            playBass(80);
        }

    },

    update: function() {

        $gameSwitches.setValue(330, this.running);

        if (!this.running) {
            return;
        }

        this.timer++;

        var stepWait = Math.max(
            1,
            Number($gameVariables.value(2) || 1)
        );

        if (this.timer < stepWait) {
            return;
        }

        this.timer = 0;

        $gameSwitches.setValue(
            291 + this.step,
            false
        );

        this.step++;

        if (this.step > 7) {
            this.step = 0;
        }

        $gameSwitches.setValue(
            291 + this.step,
            true
        );

        this.playCurrentStep();

    }

};

var _Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;

Game_Interpreter.prototype.pluginCommand = function(command, args) {

    _Game_Interpreter_pluginCommand.call(
        this,
        command,
        args
    );

    if (command === "PlayGaRSequencer") {
        GaRSequencer.start();
    }

    if (command === "StopGaRSequencer") {
        GaRSequencer.stop();
    }

};

var _Scene_Map_update =
    Scene_Map.prototype.update;

Scene_Map.prototype.update = function() {

    _Scene_Map_update.call(this);

    GaRSequencer.update();

};

window.GaRSequencer = GaRSequencer;

})();