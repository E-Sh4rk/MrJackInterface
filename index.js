
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
    status: status.RUNNING
}

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
    function colorForCharacterStatus(cs) {
        switch (cs) {
            case character_status.UNKNOWN:
                return 0xffa0a0
            case character_status.GUILTY:
                return 0xff1010
            case character_status.INNOCENT_CK:
            case character_status.INNOCENT_HI:
                return 0x60ff60
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

        let text = "TURN " + game.turn.toString() + "\n";
        text += "STATUS: " + game.status + "\n\n";
        text += "REMAINING CHARACTERS:\n"
        let color = 0xbbbbbb;
        text = new PIXI.Text(text, {fontFamily : 'Arial', fontSize: 18, fill : color, align : 'left'});
        text.x = panel_x*wr;
        text.y = oh*hr/2 - text.height - 2 * button_h;
        panelContainer.addChild(text)

        let character_buttons = [character.SH, character.JW, character.JS, character.IL,
            character.MS, character.SG, character.WG, character.JB]
        let button_x = panel_x*wr + button_w_small*wr/2
        let button_y = text.y + text.height + button_h/2*hr
        let i = 0
        for (let c of character_buttons) {
            let button = new Button({
                texture: game.remchars.includes(c) ? 'button-blue.png' : 'button-blue-dark.png',
                label: c,
                width: button_w_small*wr,
                height: button_h*hr,
                fontSize: 20,
                onTap: function() {
                    if (game.remchars.includes(c)) {
                        let index = game.remchars.indexOf(c);
                        game.remchars.splice(index, 1);
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
            label: 'End turn',
            width: button_w*wr,
            height: button_h*hr,
            fontSize: 20,
            onTap: () => console.log('End turn')
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
            switch (m.i) {
                case item.EMPTY:
                    graphics.drawPolygon(polygon)
                    break;
                case item.OBSTACLE:
                    graphics.beginFill(0x555555)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.SHAFT_OPENED:
                    graphics.beginFill(0x578099)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.SHAFT_CLOSED:
                    graphics.beginFill(0x112f45)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.LIGHT_ON:
                    graphics.beginFill(0xfaae34)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.LIGHT_OFF:
                    graphics.beginFill(0x523c1a)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.EXIT_OPENED:
                    graphics.beginFill(0x0f943d)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.EXIT_CLOSED:
                    graphics.beginFill(0x074f20)
                    graphics.drawPolygon(polygon)
                    graphics.endFill(); 
                    break;
                case item.NONE:
                    break;
                default:
            }
            if (m.c != null || m.it != null) {
                let text = m.c != null ? m.c : m.it;
                let color = m.c != null ? colorForCharacterStatus(m.cs) : 0x222222;
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
            let old = game.board[hexCoordinates.y][hexCoordinates.x]
            game.board[hexCoordinates.y][hexCoordinates.x] = { i : item.OBSTACLE }
            redraw()
        }
    })
}

window.onload = init;
