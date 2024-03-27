export namespace Error {
    // create a new planet error messages
    export const COORDINATE_OUT_OF_RANGE = 'Coordinate out of range';
    export const PLANET_NOT_FOUND = 'Planet not found';
    export const PLANET_ALREADY_EXISTS = 'Planet already exists';
    export const MAX_NUM_PLANETS = 'Max number of planets reached';
    export const COORDINATE_NOT_SUITABLE = 'Coordinate not suitable for planet creation';
    
    // fleet error messages
    export const FLEET_STRENGTH = 'Fleet strength too high';

    // attack error messages
    export const PLANET_UNDER_ATTACK = 'Planet is already under attack';
    export const NO_DEFENSE = 'Planet has no defense';

    // invalid player error messages
    export const INVALID_PLAYER = 'Invalid player';

    // resolve attack error messages
    export const ATTACK_DOES_NOT_MATCH = 'Attack does not match';
    export const DEFENSE_DOES_NOT_MATCH = 'Defense does not match';

    // forfeit error messages
    export const FORFEIT_CLAIM = 'Forfeit can not be claimed';
}