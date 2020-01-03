
module.exports = {
    item: {
        EMPTY: 'empty',
        NONE: 'none',
        OBSTACLE: 'obstacle',
        SHAFT_OPENED: 'shaft_opened',
        SHAFT_CLOSED: 'shaft_closed',
        LIGHT_ON: 'light_on',
        LIGHT_OFF: 'light_off',
        EXIT_OPENED: 'exit_opened',
        EXIT_CLOSED: 'exit_closed',
    },
    
    character: {
        SH: 'SH',
        JW: 'JW',
        JS: 'JS',
        IL: 'IL',
        MS: 'MS',
        SG: 'SG',
        WG: 'WG',
        JB: 'JB',
    },

    move_types: {
        power: 'power',
        move: 'move',
        jwld: 'jwld',
        do_nothing: 'do_nothing'
    },

    status: {
        RUNNING: "RUNNING",
        JACK_ESCAPED: "JACK_ESCAPED",
        JACK_CAPTURED: "JACK_CAPTURED",
        TIMEOUT: "TIMEOUT"
    }
}
