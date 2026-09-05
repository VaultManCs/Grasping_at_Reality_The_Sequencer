/*:
 * @plugindesc GaR_Sequencer_Puzzles v1.0
 * @author Gar
 *
 * @param Puzzle1ResultSwitch
 * @default 309
 *
 * @param Puzzle1Required
 * @default
 *
 * @param Puzzle1RequireExactPercussion
 * @type boolean
 * @default false
 *
 * @param Puzzle1RequireExactBass
 * @type boolean
 * @default false
 *
 * @param Puzzle2ResultSwitch
 * @default 310
 *
 * @param Puzzle2Required
 * @default
 *
 * @param Puzzle2RequireExactPercussion
 * @type boolean
 * @default false
 *
 * @param Puzzle2RequireExactBass
 * @type boolean
 * @default false
 *
 * @param Puzzle3ResultSwitch
 * @default 319
 *
 * @param Puzzle3Required
 * @default
 *
 * @param Puzzle3RequireExactPercussion
 * @type boolean
 * @default false
 *
 * @param Puzzle3RequireExactBass
 * @type boolean
 * @default false
 */

(function() {

"use strict";

var params = PluginManager.parameters(
    "GaR_Sequencer_Puzzles"
);

function parseSwitchList(text) {

    if (!text) {
        return [];
    }

    return text.split(",")
        .map(Number)
        .filter(function(id) {
            return id > 0;
        });

}

var puzzles = [

{
    resultSwitch: Number(params["Puzzle1ResultSwitch"] || 309),
    required: parseSwitchList(params["Puzzle1Required"]),
    exactPercussion:
        String(params["Puzzle1RequireExactPercussion"]) === "true",
    exactBass:
        String(params["Puzzle1RequireExactBass"]) === "true"
},

{
    resultSwitch: Number(params["Puzzle2ResultSwitch"] || 310),
    required: parseSwitchList(params["Puzzle2Required"]),
    exactPercussion:
        String(params["Puzzle2RequireExactPercussion"]) === "true",
    exactBass:
        String(params["Puzzle2RequireExactBass"]) === "true"
},

{
    resultSwitch: Number(params["Puzzle3ResultSwitch"] || 319),
    required: parseSwitchList(params["Puzzle3Required"]),
    exactPercussion:
        String(params["Puzzle3RequireExactPercussion"]) === "true",
    exactBass:
        String(params["Puzzle3RequireExactBass"]) === "true"
}

];

function buildPercussionList() {

    var list = [];

    for (var i = 301; i <= 308; i++) list.push(i);
    for (var i = 311; i <= 318; i++) list.push(i);
    for (var i = 321; i <= 328; i++) list.push(i);

    return list;

}

function buildBassList() {

    var list = [];

    for (var i = 341; i <= 348; i++) list.push(i);
    for (var i = 351; i <= 358; i++) list.push(i);
    for (var i = 361; i <= 368; i++) list.push(i);
    for (var i = 371; i <= 378; i++) list.push(i);
    for (var i = 381; i <= 388; i++) list.push(i);
    for (var i = 391; i <= 398; i++) list.push(i);
    for (var i = 401; i <= 408; i++) list.push(i);

    return list;

}

var percussionSwitches = buildPercussionList();
var bassSwitches = buildBassList();

function updatePuzzles() {

    puzzles.forEach(function(puzzle) {

        var success = true;

        puzzle.required.forEach(function(id) {

            if (!$gameSwitches.value(id)) {
                success = false;
            }

        });

        if (success && puzzle.exactPercussion) {

            percussionSwitches.forEach(function(id) {

                if (
                    puzzle.required.indexOf(id) === -1 &&
                    $gameSwitches.value(id)
                ) {
                    success = false;
                }

            });

        }

        if (success && puzzle.exactBass) {

            bassSwitches.forEach(function(id) {

                if (
                    puzzle.required.indexOf(id) === -1 &&
                    $gameSwitches.value(id)
                ) {
                    success = false;
                }

            });

        }

        $gameSwitches.setValue(
            puzzle.resultSwitch,
            success
        );

    });

}

var _Scene_Map_update =
    Scene_Map.prototype.update;

Scene_Map.prototype.update = function() {

    _Scene_Map_update.call(this);

    updatePuzzles();

};

})();