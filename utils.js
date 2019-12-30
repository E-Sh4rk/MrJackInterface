var fs = require('fs');
var { item, character, character_status, status } = require('./defs');

const MATRIX_WIDTH = 17
const MATRIX_HEIGHT = 13

let none = { i:item.NONE }
let mnone = { "type": 1, "status": false, "lampid": 0, "character": 0 }

function tile2item(type, status) {
    switch(type) {
        case 0:
            console.error("Invalid call to tile2item")
            return null
        case 1:
            return item.NONE
        case 2:
            return item.OBSTACLE
        case 3:
            return item.EMPTY
        case 4:
            return status ? item.SHAFT_OPENED : item.SHAFT_CLOSED
        case 5:
            return status ? item.LIGHT_ON : item.LIGHT_OFF
        case 6:
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

charactersArr = [character.SH, character.JB, character.WG, character.JW, character.IL,
    character.MS, character.JS, character.SG]
function characterFromCode(code) {
    if (code <= 0)
        return null
    return charactersArr[code-1]
}
function codeFromCharacter(c) {
    if (c == null)
        return 0
    return charactersArr.indexOf(c)+1;
}

function parseGameConfig(rawdata) {
    let config = JSON.parse(rawdata)

    // Give a proper shape to the array, and transpose the resulting matrix
    let matrix = []
    for (let i = 0; i < MATRIX_HEIGHT; i++) {
        let line = []
        for (let j = 0; j < MATRIX_WIDTH; j++) {
            line.push(config.board[i*MATRIX_WIDTH+j])
        }
        matrix.push(line)
    }
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
            if (elt.type == 0)
                elt = l2[i]
            let item = tile2item(elt.type, elt.activated)
            let character = characterFromCode(elt.character)
            let char_status = character != null ? config.cstatus[elt.character-1] : null
            let it = elt.lampid == 0 ? null : elt.lampid.toString()
            line.push( {i:item, c:character, it:it, cs:char_status} )
        }
        board.push(line)
    }

    // Transpose the board
    //board = board[0].map((col, i) => board.map(row => row[i]))

    // Output
    let remchars = config.remchars.map(characterFromCode)
    let prevchars = config.prevchars.map(characterFromCode)
    return { board: board, jwld: wldir2jwld(config.wldir), turn: config.turn, remchars: remchars, prevchars: prevchars, status: config.status }
}

function gameConfigFromFile(filename) {
    let rawdata = fs.readFileSync(filename)
    return parseGameConfig(rawdata)
}

module.exports = {
    gameConfigFromFile:gameConfigFromFile
}