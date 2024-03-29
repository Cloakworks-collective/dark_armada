export namespace Error {

  // generic errors
  export const INVALID_KEY = 'Not the correct key';
  export const PLAYER_HAS_NO_ACCESS = 'This player has no access to this planet';

  // create a new planet error messages
  export const COORDINATE_OUT_OF_RANGE = 'Coordinate out of range';
  export const PLANET_ALREADY_EXISTS_AT_THIS_LOCATION = 
  'A homeworld has already been created at this location';
  export const MAX_NUM_PLANETS = 
  'Max number of planets for the game has been reached';
  export const COORDINATE_NOT_SUITABLE =
    'Coordinate not suitable for planet creation';
  export const INVALID_FACTION = 'Invalid faction';
  export const PLAYER_HAS_PLANET = 'Player already has a home planet';

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
