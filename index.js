
var { item, character, character_status, status } = require('./defs');

let empty = { i:item.EMPTY, c:null }
let none = { i:item.NONE, c:null }

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
    ],
    jwld: 0,
    turn: 0,
    prevchars: [],
    remchars: [],
    currentchar: null,
    status: status.RUNNING,
    used_move: false,
    used_power: false
}
let moves = []
let moveInProgress = null

const Honeycomb = require('honeycomb-grid')
const PIXI = require('pixi.js')
/*const { InteractionManager } = require('@pixi/interaction')
PIXI.Renderer.registerPlugin('interaction', InteractionManager)*/
const { Button } = require('./button')
var utils = require('./utils');

const CASE_SIZE = 25
function init() {

    function getState() {
        game = utils.gameConfigFromFile("game.json")
        moves = []
        moveInProgress = null
    }
    getState()

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
        let button_h = 40;

        let text = "TURN " + game.turn.toString() + "\n\n";
        text += "STATUS:\n" + game.status + "\n\n";
        text += "ACTIONS: " + (game.used_move ? "" : "MOVE ") + (game.used_power ? "" : "POWER") + "\n\n";
        text += "REMAINING CHARACTERS:\n"
        let color = 0xbbbbbb;
        text = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'left'});
        text.x = panel_x*wr;
        text.y = oh*hr/2 - text.height;
        panelContainer.addChild(text)

        let character_buttons = [character.SH, character.JW, character.JS, character.IL,
            character.MS, character.SG, character.WG, character.JB]
        let button_x = panel_x*wr + button_w_small*wr/2
        let button_y = text.y + text.height + button_h/2*hr
        let i = 0
        for (let c of character_buttons) {
            let button = new Button({
                texture: game.currentchar == c ? 'button-gold.png' : game.remchars.includes(c) ? 'button-blue.png' : 'button-blue-dark.png',
                label: c,
                width: button_w_small*wr,
                height: button_h*hr,
                fontSize: 20,
                onTap: function() {
                    if (game.currentchar == c)
                        game.currentchar = null
                    else if (game.remchars.includes(c)) {
                        let index = game.remchars.indexOf(c);
                        game.remchars.splice(index, 1);
                        if (game.currentchar == null)
                            game.currentchar = c;
                    }
                    else
                        game.remchars.push(c)
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
            onTap: function() {
                getState()
                redraw()
              }
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
            onTap: () => console.log('End move')
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
            if (moveInProgress != null && moveInProgress.x == hex.x && moveInProgress.y == hex.y)
                color = 0xe8db4d
            if (!invisible) {
                if (color != null) graphics.beginFill(color)
                graphics.drawPolygon(polygon)
                if (color != null) graphics.endFill()
            }
            if (m.c != null || m.it != null) {
                let text = m.c != null ? m.c : m.it;
                let color = m.c != null ? colorForCharacterStatus(m.cs, m.cv) : 0x222222;
                text = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'center'});
                text.x = (point.x+hex.width()/2)*wr - text.width/2;
                text.y = (point.y+hex.height()/2)*hr - text.height/2;
                textContainer.addChild(text)
            }

            let r = 3
            if (m.c == character.JW) {
                let i1 = (game.jwld + 4) % 6
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
        graphics.lineStyle(2,0xe8db4d)
        for (let m of moves) {
            let start = m.start.toPoint().add(m.start.center())
            let end = m.end.toPoint().add(m.end.center())
            graphics.moveTo(start.x*wr, start.y*hr)
            graphics.lineTo(end.x*wr, end.y*hr)
            graphics.beginFill(0xe8db4d)
            graphics.drawCircle(end.x*wr, end.y*hr, 5)
            graphics.endFill()
        }
        defaultLineStyle()
    }
    redraw()

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
            if (elt.i != item.NONE) {
                if (moveInProgress) {
                    if (moveInProgress.x != hexCoordinates.x || moveInProgress.y != hexCoordinates.y)
                    moves.push({start:moveInProgress, end:hexCoordinates})
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
            if (elt.c == character.JW) {
                game.jwld = (game.jwld+1) % 6;
            }
        }
        redraw();
        return false;
    }, false);
}

window.onload = init;
