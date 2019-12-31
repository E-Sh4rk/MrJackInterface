var fs = require('fs');
var { item, character, character_status, status } = require('./defs');

let none = { i:item.NONE }
let mnone = { "type": "OUT_OF_BOUNDS", "status": false, "lampid": 0, "character": 0 }

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
function graphicPos2solverPos(x, y) {
    x = x - 1 // Because we start at index 1 for the x-axis
    y = 2*y
    if (x%2 == 0) y++
    return [y, x]
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
            return arr[0]
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
    matrix = matrix[0].map((col, i) => matrix.map(row => row[i]))

    let board = []
    for (let j = 0; j < ~~(matrix.length/2)+1; j++) {
        let line = [none]
        let l1 = matrix[2*j]
        let l2 = l1.map((v, i) => mnone)
        if (matrix[2*j+1] != null)
            l2 = matrix[2*j+1]
        for (let i = 0; i < l1.length; i++) {
            let elt = l1[i]
            if (elt.type == "INVALID")
                elt = l2[i]
            let item = tile2item(elt.type, elt.activated)
            let character = characterFromCode(elt.character)
            let char_status = character != null ? config.cstatus[elt.character] : null
            let char_visible = character != null ? config.visible[elt.character] : null
            let it = elt.lampid == 0 ? null : elt.lampid.toString()
            line.push( {i:item, c:character, it:it, cs:char_status, cv:char_visible} )
        }
        board.push(line)
    }

    // Transpose the board
    //board = board[0].map((col, i) => board.map(row => row[i]))

    // Output
    let remchars = config.remchars.map(characterFromCode)
    let prevchars = config.prev_chars.map(characterFromCode)
    return { board: board, jwld: wldir2jwld(config.wldir), turn: config.turn, remchars: remchars, prevchars: prevchars, status: config.status,
        currentchar: characterFromCode(config.selected), used_move: config.used_move, used_power: config.user_power }
}

function gameConfigFromFile(filename) {
    let rawdata = fs.readFileSync(filename)
    return parseGameConfig(JSON.parse(rawdata))
}

// COMMUNICATION

let solver = null
let answerInProgress = null

function sendCommand(cmd, callback) {
    if (solver == null || answerInProgress != null)
        return;
    answerInProgress = ""
    solver.stdin.write(cmd + "\n")
    solver.stdin.flush()
    solver.stdout.on('data', (data) => {
        try {
            answerInProgress += data
            let json = JSON.parse(answerInProgress)
            solver.stdout.removeAllListeners('data')
            callback(json)
            answerInProgress = null
        }
        catch (e) {
            console.log ("Invalid solver answer. Assuming the answer takes multiple chunks.")
        }
    });
}

const { spawn } = require("child_process");

function spawnSolver() {
    if (solver != null)
        return;
    solver = spawn("solver", [], {stdio: ['pipe', 'pipe', 'pipe']});
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

module.exports = {
    gameConfigFromFile:gameConfigFromFile,
    spawnSolver:spawnSolver,
    gameConfigFromSolver:gameConfigFromSolver
}
