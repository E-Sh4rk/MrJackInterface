var fs = require('fs');
var { item, character, character_status, status, move_types } = require('./defs');

const StringBuilder = require("string-builder");

let none = { i:item.NONE }
let mnone = { "type": "OUT_OF_BOUNDS", "status": false, "lampid": 0, "character": "NO_CHARACTER" }

function tile2item(type, status) {
    switch(type) {
        case "INVALID":
            console.error("Invalid call to tile2item")
            return null
        case "OUT_OF_BOUNDS":
            return item.NONE
        case "HOUSE":
            return item.OBSTACLE
        case "FREE":
            return item.EMPTY
        case "WELL":
            return status ? item.SHAFT_OPENED : item.SHAFT_CLOSED
        case "LAMP":
            return status ? item.LIGHT_ON : item.LIGHT_OFF
        case "EXIT":
            return status ? item.EXIT_OPENED : item.EXIT_CLOSED
    }
}

function wldir2jwld(wldir) {
    switch (wldir[0]) {
        case -2:
            return 0
        case -1:
            return 1
        case 1:
            return 2
        case 2:
            return 3
        case 1:
            return 4
        case -1:
            return 5
        default:
            return 0
    }
}
function jwld2wldir(jwld) {
    switch (jwld) {
        case 0:
            return [-2, 0]
        case 1:
            return [-1, 1]
        case 2:
            return [1, 1]
        case 3:
            return [2, 0]
        case 4:
            return [1, -1]
        case 5:
            return [-1, -1]
        default:
            return [-2, 0]
    }
}
function graphicPos2solverPos(pt) {
    x = pt.x - 1 // Because we start at index 1 for the x-axis
    y = 2*pt.y
    if (x%2 == 0) y++
    return [y+1, x+1] // Because arrays starts at index 1 in Julia
}
function pos2json(arr) {
    return "[" + arr[0].toString() + ", " + arr[1].toString() + "]"
}

let charactersCorrespondance = {
    "NO_CHARACTER":null,
    "SHERLOCK_HOLMES":character.SH,
    "JEREMY_BERT":character.JB,
    "WILLIAM_GULL":character.WG,
    "JOHN_WATSON":character.JW,
    "INSPECTOR_LESTRADE":character.IL,
    "MISS_STEALTHY":character.MS,
    "JOHN_SMITH":character.JS,
    "SERGENT_GOODLEY":character.SG
}
function characterFromCode(code) {
    return charactersCorrespondance[code]
}
function codeFromCharacter(c) {
    for (let arr of Object.entries(charactersCorrespondance)) {
        if (arr[1] == c)
            return "\"" + arr[0] + "\""
    }
    return null
}

/*const MATRIX_WIDTH = 17
const MATRIX_HEIGHT = 13*/
function parseGameConfig(config) {
    // Give a proper shape to the array, and transpose the resulting matrix
    /*let matrix = []
    for (let i = 0; i < MATRIX_HEIGHT; i++) {
        let line = []
        for (let j = 0; j < MATRIX_WIDTH; j++) {
            line.push(config.board[i*MATRIX_WIDTH+j])
        }
        matrix.push(line)
    }*/
    let matrix = config.board
    matrix = matrix[0].map((col, i) => matrix.map(row => row[i])) // Transpose
    let visibility_mask = config.visibility_mask
    visibility_mask = visibility_mask[0].map((col, i) => visibility_mask.map(row => row[i])) // Transpose

    let board = []
    for (let j = 0; j < ~~(matrix.length/2)+1; j++) {
        let line = [none]
        let l1 = matrix[2*j]
        let v1 = visibility_mask[2*j]
        let l2 = l1.map((v, i) => mnone)
        let v2 = v1.map((v, i) => false)
        if (matrix[2*j+1] != null)
            l2 = matrix[2*j+1]
        if (visibility_mask[2*j+1] != null)
            v2 = visibility_mask[2*j+1]
        for (let i = 0; i < l1.length; i++) {
            let elt = l1[i]
            let visible = v1[i]
            if (elt.type == "INVALID") {
                elt = l2[i]
                visible = v2[i]
            }
            let item = tile2item(elt.type, elt.activated)
            let character = characterFromCode(elt.character)
            let char_status = character != null ? config.cstatus[elt.character] : null
            let char_visible = character != null ? config.visible[elt.character] : null
            let it = elt.lampid == 0 ? null : elt.lampid.toString()
            line.push( {i:item, c:character, it:it, cs:char_status, cv:char_visible, visible:visible} )
        }
        board.push(line)
    }

    // Output
    let remchars = config.remchars.map(characterFromCode)
    let prevchars = config.prev_chars.map(characterFromCode)
    let can_power = false
    let can_move = false
    if (config.status == "PLAYING_CHARACTER") {
        can_power = !config.used_power
        can_move = !config.used_move
    }
    let can_select_cards = 0
    if (config.status == "PICKING_JACK" || config.status == "SELECTING_CHARACTER" || config.status == "PICKING_SHERLOCK_CARD")
        can_select_cards = 1
    else if (config.status == "PICKING_PLAYABLE_CHARACTERS")
        can_select_cards = 2
    return { board: board, jwld: wldir2jwld(config.wldir), turn: config.turn, remchars: remchars, prevchars: prevchars, status: config.status,
        currentchar: characterFromCode(config.selected), used_move: config.used_move, can_power: can_power, can_move: can_move,
        can_select_cards: can_select_cards}
}

function gameConfigFromFile(filename) {
    let rawdata = fs.readFileSync(filename)
    return parseGameConfig(JSON.parse(rawdata))
}

// COMMUNICATION

let solver = null
let answerInProgress = null
let answerParseInfo = null

function sendCommand(cmd, callback) {
    if (solver == null || answerInProgress != null)
        return;
    console.log(cmd) // DEBUG
    answerInProgress = new StringBuilder()
    answerParseInfo = { cb:0, sb:0 }
    solver.stdin.write(cmd + "\n")
    //solver.stdin.flush()
    solver.stdout.to
    solver.stdout.on('data', (data) => {
        answerInProgress.append(data)
        answerParseInfo.cb += (data.split("{").length - 1)
        answerParseInfo.cb -= (data.split("}").length - 1)
        answerParseInfo.sb += (data.split("[").length - 1)
        answerParseInfo.sb -= (data.split("]").length - 1)
        if (answerParseInfo.cb == 0 && answerParseInfo.sb == 0) {
            let json = JSON.parse(answerInProgress.toString())
            solver.stdout.removeAllListeners('data')
            answerInProgress = null
            answerParseInfo = null
            callback(json)
        }
    });
}

const { spawn } = require("child_process");

function spawnSolver() {
    if (solver != null)
        return;
    solver = spawn("julia", ["--project=.\\solver", ".\\solver\\src\\interactive.jl"], {stdio: ['pipe', 'pipe', 'pipe']});
    solver.stdin.setEncoding('utf-8');
    solver.stdout.setEncoding('utf-8');
    solver.stderr.setEncoding('utf-8');
    solver.stderr.on('data', (data) => {
        alert(`Solver returned an error: ${data}`);
    });
    solver.on('close', (code) => {
        alert(`Solver exited with code ${code}.`);
        solver = null;
    });
}

function gameConfigFromSolver(callback) {
    sendCommand("state", function (json) { callback(parseGameConfig(json)) })
}

function sendMoves(status, moves, jwld, selectedCards, selectedCard, success_callback, failure_callback) {
    function mk_callback(success) {
        function callback(response) {
            if (response.status == 0)
                success()
            else
                failure_callback(response.status)
        }
        return callback
    }
    switch (status) {
        case "JACK_ESCAPED":
        case "JACK_CAPTURED":
        case "TIMEOUT":
            break;
        case "PICKING_JACK":
        case "PICKING_SHERLOCK_CARD":
            sendCommand("play chance [" + codeFromCharacter(selectedCard) + "]", mk_callback(success_callback))
            break;
        case "PICKING_PLAYABLE_CHARACTERS":
            let characters = selectedCard ? codeFromCharacter(selectedCard) : ""
            for (let c of selectedCards) {
                if (characters)
                    characters += ", "
                characters += codeFromCharacter(c)
            }
            let cb = success_callback
            if (selectedCard != null)
                cb = () =>
                sendMoves("SELECTING_CHARACTER", moves, jwld, selectedCards, selectedCard, success_callback, failure_callback)
            sendCommand("play chance [" + characters + "]", mk_callback(cb))
            break;
        case "SELECTING_CHARACTER":
            sendCommand("play user choose [" + codeFromCharacter(selectedCard) + "]", mk_callback(success_callback))
            break;
        case "PLAYING_CHARACTER":
            if (moves.length == 0) {
                success_callback()
                return
            }
            let m = moves[0]
            moves.shift()
            let cmd = null
            switch (m.type) {
                case move_types.jwld:
                    cmd = "play user power [{\"start\": " + pos2json(graphicPos2solverPos(m.start)) + ", \"end\": " + pos2json(jwld2wldir(jwld)) + "}]"
                    break
                case move_types.ask_sherlock:
                    cmd = "play user power []"
                    break
                case move_types.move:
                    cmd = "play user move {\"start\": " + pos2json(graphicPos2solverPos(m.start)) + ", \"end\": " + pos2json(graphicPos2solverPos(m.end)) + "}"
                    break
                case move_types.power:
                    let ms = [m]
                    while (moves.length > 0 && moves[0].type == move_types.power) {
                        ms.push(moves[0])
                        moves.shift()
                    }
                    cmd = ""
                    for (let m of ms) {
                        if (cmd)
                            cmd += ", "
                        cmd += "{\"start\": " + pos2json(graphicPos2solverPos(m.start)) + ", \"end\": " + pos2json(graphicPos2solverPos(m.end)) + "}"
                    }
                    cmd = "play user power [" + cmd + "]"
                    break
            }
            sendCommand(cmd, mk_callback(() =>
                sendMoves(status, moves, jwld, selectedCards, selectedCard, success_callback, failure_callback)))
            break;
    }
}

function sendBack(success_callback, failure_callback) {
    function callback(response) {
        if (response.status == 0)
            success_callback()
        else
            failure_callback(response.status)
    }
    sendCommand("back", callback)
}

module.exports = {
    gameConfigFromFile:gameConfigFromFile,
    spawnSolver:spawnSolver,
    gameConfigFromSolver:gameConfigFromSolver,
    sendMoves: sendMoves,
    sendBack: sendBack
}
