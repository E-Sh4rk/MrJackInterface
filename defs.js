
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
        SH: 'sh',
        JW: 'jw',
        JS: 'js',
        IL: 'il',
        MS: 'ms',
        SG: 'sg',
        WG: 'wg',
        JB: 'jb',
    },

    move_types: {
        power: 'power',
        move: 'move',
        jwld: 'jwld',
        ask_sherlock: 'ask_sherlock'
    },

    status: {
        RUNNING: "RUNNING",
        JACK_ESCAPED: "JACK_ESCAPED",
        JACK_CAPTURED: "JACK_CAPTURED",
        TIMEOUT: "TIMEOUT"
    },

    character_status: {
        UNKNOWN: "UNKNOWN",
        GUILTY: "GUILTY",
        INNOCENT_CK: "INNOCENT_CK",
        INNOCENT_HI: "INNOCENT_HI"
    }
}
