
var { item, character, character_status, status, move_types } = require('./defs');

let empty = { i:item.EMPTY, c:null, visible:false }
let none = { i:item.NONE, c:null, visible:false }

let game = {
    board: [
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
        [none,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty,empty],
    ],
    jwld: 0,
    turn: 0,
    prevchars: [],
    remchars: [],
    currentchar: null,
    status: status.RUNNING,
    can_move: false,
    can_power: false,
    can_select_cards: 0 // 0: no, 1: one, 2: many
}
let moves = []
let moveInProgress = null
let currentMoveType = null
let jwld = null
let selectedCards = null
let selectedCard = null

let displayVisibility = false

const Honeycomb = require('honeycomb-grid')
const PIXI = require('pixi.js')
/*const { InteractionManager } = require('@pixi/interaction')
PIXI.Renderer.registerPlugin('interaction', InteractionManager)*/
const { Button } = require('./button')
var utils = require('./utils');

const CASE_SIZE = 25
function init() {

    utils.spawnSolver()

    function resetMoves() {
        moves = []
        moveInProgress = null
        currentMoveType = null
        jwld = null
        selectedCard = game.currentchar
        selectedCards = game.remchars.slice()
        redraw()
    }

    function getState() {
        /*game = utils.gameConfigFromFile("game.json")
        resetMoves()*/
        function callback(g) {
            game = g
            resetMoves()
        }
        utils.gameConfigFromSolver(callback)
    }

    const app = new PIXI.Application({ transparent: true, resizeTo: window })
    const graphics = new PIXI.Graphics()

    const Hex = Honeycomb.extendHex({ size: CASE_SIZE, orientation: 'flat' })
    const Grid = Honeycomb.defineGrid(Hex)

    document.body.appendChild(app.view)
    let textContainer = new PIXI.Container()
    let panelContainer = new PIXI.Container()
    app.stage.addChild(graphics)
    app.stage.addChild(textContainer)
    app.stage.addChild(panelContainer)
    
    function defaultLineStyle() {
        graphics.lineStyle(3, 0x555555)
    }
    function clearGraphics() {
        graphics.clear()
        defaultLineStyle()
        textContainer.removeChildren()
        panelContainer.removeChildren()
    }
    function colorForCharacterStatus(cs, visible) {
        switch (cs) {
            case character_status.UNKNOWN:
                return visible ? 0xfaae34 : 0x8f631d
            case character_status.GUILTY:
                return visible ? 0xed2828 : 0x851c1c
            case character_status.INNOCENT_CK:
            case character_status.INNOCENT_HI:
                return visible ? 0x00ab14 : 0x006e0d
        }
    }

    width = game.board[0].length
    height = game.board.length
    let panel_w = 250
    let panel_x = CASE_SIZE * 1.75 * width
    let ow = panel_x + panel_w
    let oh = CASE_SIZE * 2 * height

    function redraw() {
        let ww = window.innerWidth
        let wh = window.innerHeight
        let wr = ww/ow
        let hr = wh/oh

        clearGraphics()

        // PANEL
        let button_w = 100;
        let button_w_small = 40;
        let button_w_medium = 75;
        let button_h = 40;
        let color = 0xbbbbbb;

        let text = "TURN " + game.turn.toString() + "\n\n";
        text += "STATUS:\n" + game.status + "\n\n";
        text += "ACTIONS:\n";
        text = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'left'});
        text.x = panel_x*wr;
        text.y = 10*hr;
        panelContainer.addChild(text)

        let button_x = panel_x*wr + button_w_medium*wr/2
        let button_y = text.y + text.height + button_h/2*hr
        let actions = []
        if (game.can_move) actions.push(move_types.move)
        if (game.can_power) actions.push(move_types.power)
        let i = 0
        for (let a of actions) {
            let button = new Button({
                texture: currentMoveType == a ? 'button-gold.png' : 'button-blue.png',
                label: a,
                width: button_w_medium*wr,
                height: button_h*hr,
                fontSize: 20,
                onTap: function() {
                    if (currentMoveType == a)
                        currentMoveType = null
                    else
                        currentMoveType = a
                    redraw()
                }
            })
            button.x = button_x + i*(button_w_medium+10)*wr
            button.y = button_y
            panelContainer.addChild(button)
            i++
        }

        let text2 = new PIXI.Text("REMAINING CHARACTERS:\n", {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'left'});
        text2.x = panel_x*wr;
        text2.y = button_y + button_h/2*hr + 10*hr;
        panelContainer.addChild(text2)

        let character_buttons = [character.SH, character.JW, character.JS, character.IL,
            character.MS, character.SG, character.WG, character.JB]
        button_x = panel_x*wr + button_w_small*wr/2
        button_y = text2.y + text2.height + button_h/2*hr
        i = 0
        for (let c of character_buttons) {
            let button = new Button({
                texture: selectedCard == c ? 'button-gold.png' : selectedCards.includes(c) ? 'button-blue.png' : 'button-blue-dark.png',
                label: c,
                width: button_w_small*wr,
                height: button_h*hr,
                fontSize: 20,
                onTap: function() {
                    if (game.can_select_cards > 1) {
                        if (selectedCard == c)
                            selectedCard = null
                        else if (selectedCards.includes(c)) {
                            if (selectedCard == null)
                                selectedCard = c;
                            let index = selectedCards.indexOf(c);
                            selectedCards.splice(index, 1);
                        }
                        else
                            selectedCards.push(c)
                    }
                    else if (game.can_select_cards > 0) {
                        if (selectedCard == c)
                            selectedCard = null
                        else
                            selectedCard = c
                    }
                    redraw()
                }
            })
            button.x = button_x + (i % 4)*(button_w_small+10)*wr
            button.y = button_y + (~~(i/4))*(button_h+10)*hr
            panelContainer.addChild(button)
            i++
        }

        let button2 = new Button({
            texture: 'button-red.png',
            label: 'Cancel',
            width: button_w*wr,
            height: button_h*hr,
            fontSize: 20,
            onTap: resetMoves
        })
        button2.x = panel_x*wr + button2.width/2
        button2.y = oh*hr - button2.height - 25*hr
        panelContainer.addChild(button2)
        let button1 = new Button({
            texture: 'button-green.png',
            label: 'End move',
            width: button_w*wr,
            height: button_h*hr,
            fontSize: 20,
            onTap: function () {
                utils.sendMoves(game.status, moves, jwld, selectedCards, selectedCard,
                    getState,
                    (code) => console.log("Invalid move: server returned error " + code.toString()))
            }
        })
        button1.x = panel_x*wr + button1.width/2 + button2.width + 10*wr
        button1.y = oh*hr - button1.height - 25*hr
        panelContainer.addChild(button1)
        // BOARD
        Grid.rectangle({ width: width, height: height }).forEach(hex => {
            const point = hex.toPoint()
            const corners = hex.corners().map(corner => new PIXI.Point((corner.x + point.x)*wr, (corner.y + point.y)*hr))
            const polygon = new PIXI.Polygon(corners)
    
            let m = game.board[hex.y][hex.x]
            let color = null;
            let invisible = false;
            if (displayVisibility) {
                if (m.i == item.NONE)
                    invisible = true
                else if (m.i == item.OBSTACLE || m.i == item.LIGHT_OFF || m.i == item.LIGHT_ON)
                    color = 0x555555
                else 
                    color = m.visible ? 0xfaae34 : 0x8f631d
            }
            else {
                switch (m.i) {
                    case item.EMPTY:
                        break;
                    case item.OBSTACLE:
                        color = 0x555555
                        break;
                    case item.SHAFT_OPENED:
                        color = 0x578099
                        break;
                    case item.SHAFT_CLOSED:
                        color = 0x3c5869
                        break;
                    case item.LIGHT_ON:
                        color = 0xfaae34
                        break;
                    case item.LIGHT_OFF:
                        color = 0x8f631d
                        break;
                    case item.EXIT_OPENED:
                        color = 0x0f943d
                        break;
                    case item.EXIT_CLOSED:
                        color = 0x074f20
                        break;
                    case item.NONE:
                        invisible = true;
                        break;
                    default:
                }
            }
            if (moveInProgress != null && moveInProgress.x == hex.x && moveInProgress.y == hex.y)
                color = 0xe8db4d
            if (!invisible) {
                if (color != null) graphics.beginFill(color)
                graphics.drawPolygon(polygon)
                if (color != null) graphics.endFill()
            }
            if (m.c != null || m.it != null) {
                let text = m.c != null ? m.c : m.it;
                let color = m.c != null && !displayVisibility ? colorForCharacterStatus(m.cs, m.cv) : 0x222222;
                text = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'center'});
                text.x = (point.x+hex.width()/2)*wr - text.width/2;
                text.y = (point.y+hex.height()/2)*hr - text.height/2;
                textContainer.addChild(text)
            }

            let r = 3
            if (m.c == character.JW) {
                let i1 = ((jwld == null ? game.jwld : jwld) + 4) % 6
                let i2 = (i1 + 1) % 6
                graphics.lineStyle(0,0)
                graphics.beginFill(0xff5555)
                let x = (corners[i1].x + corners[i2].x)/2
                let y = (corners[i1].y + corners[i2].y)/2
                let center = hex.center().add(point)
                x = (2*x + center.x*wr)/3
                y = (2*y + center.y*hr)/3
                graphics.drawCircle(x,y,r)
                graphics.endFill()
                defaultLineStyle()
            }
            
        })
        
        // MOVES
        for (let m of moves) {
            let color = null
            switch (m.type) {
                case move_types.jwld:
                case move_types.ask_sherlock:
                case move_types.power:
                    color = 0xe8db4d
                    break;
                case move_types.move:
                    color = 0x31f534
                    break;
            }
            graphics.lineStyle(2, color)
            let start = m.start.toPoint().add(m.start.center())
            let end = m.end.toPoint().add(m.end.center())
            graphics.moveTo(start.x*wr, start.y*hr)
            graphics.lineTo(end.x*wr, end.y*hr)
            graphics.beginFill(color)
            graphics.drawCircle(end.x*wr, end.y*hr, 5)
            graphics.endFill()
        }
        defaultLineStyle()
    }
    resetMoves()
    getState()

    function resize() { redraw(); }
    window.onresize = resize;

    app.view.addEventListener('click', ({ offsetX, offsetY }) => {
        let ww = window.innerWidth
        let wh = window.innerHeight
        let wr = ww/ow
        let hr = wh/oh
        const hexCoordinates = Grid.pointToHex(offsetX/wr, offsetY/hr)
        if (hexCoordinates.y < game.board.length && hexCoordinates.x < game.board[0].length) {
            let elt = game.board[hexCoordinates.y][hexCoordinates.x]
            if (elt.i != item.NONE && currentMoveType != null) {
                if (moveInProgress) {
                    if (moveInProgress.x != hexCoordinates.x || moveInProgress.y != hexCoordinates.y)
                        moves.push({type: currentMoveType, start:moveInProgress, end:hexCoordinates})
                    moveInProgress = null
                }
                else
                    moveInProgress = hexCoordinates
            }
            redraw()
        }
    })
    app.view.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        let ww = window.innerWidth
        let wh = window.innerHeight
        let wr = ww/ow
        let hr = wh/oh
        const hexCoordinates = Grid.pointToHex(ev.offsetX/wr, ev.offsetY/hr)
        if (hexCoordinates.y < game.board.length && hexCoordinates.x < game.board[0].length) {
            let elt = game.board[hexCoordinates.y][hexCoordinates.x]
            if (elt.c == character.JW && currentMoveType == move_types.power) {
                jwld = jwld == null ? game.jwld : jwld
                jwld = (jwld+1) % 6;
                moves = moves.filter(m => m.type != move_types.jwld)
                moves.push({type:move_types.jwld, start:hexCoordinates, end:hexCoordinates})
            }
            else if (elt.c == character.SH && currentMoveType == move_types.power) {
                moves = moves.filter(m => m.type != move_types.ask_sherlock)
                moves.push({type:move_types.ask_sherlock, start:hexCoordinates, end:hexCoordinates})
            }
            else if (elt.i != item.NONE)
                displayVisibility = !displayVisibility
        }
        redraw();
        return false;
    }, false);
}

window.onload = init;
