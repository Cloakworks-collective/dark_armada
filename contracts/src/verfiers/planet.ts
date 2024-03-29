import { Field, Poseidon, MerkleMapWitness } from 'o1js';

import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class PlanetVerifiers {
  static calculateLocationHash(x: Field, y: Field): Field {
    let locationHash = Poseidon.hash([x, y]);
    for (let i = 0; i < Const.CHAIN_HASH_TIMES; i++) {
      locationHash = Poseidon.hash([locationHash, Field(i)]);
    }
    return locationHash;
  }

  static verifyCoordinate(x: Field, y: Field) {
    x.assertLessThanOrEqual(
      Const.MAX_GAME_MAP_LENGTH,
      Error.COORDINATE_OUT_OF_RANGE
    );
    y.assertLessThanOrEqual(
      Const.MAX_GAME_MAP_LENGTH,
      Error.COORDINATE_OUT_OF_RANGE
    );
  }

  static verifyFaction(faction: Field) {
    faction.assertLessThanOrEqual(Field(3), Error.INVALID_FACTION);
  }

  static verifyMaxPlanets(numPlanets: Field) {
    numPlanets.assertLessThanOrEqual(
      Const.MAX_NUM_PLANETS,
      Error.MAX_NUM_PLANETS
    );
  }

  static verifySuitableCoordinates(x: Field, y: Field) {
    const locationHash = this.calculateLocationHash(x, y);
    locationHash.assertLessThanOrEqual(
      Const.BIRTHING_DIFFICULTY_CUTOFF,
      Error.COORDINATE_NOT_SUITABLE
    );
  }

  static verifyLocationHasNoPlanet(
    x: Field,
    y: Field,
    locationNullifierRoot: Field,
    locationNullifierWitness: MerkleMapWitness
  ) {
    const locationHash = this.calculateLocationHash(x, y);
    const [derivedLocRoot, derivedLocKey] =
      locationNullifierWitness.computeRootAndKey(Const.EMPTY_FIELD);
    derivedLocRoot.assertEquals(
      locationNullifierRoot,
      Error.PLANET_ALREADY_EXISTS_AT_THIS_LOCATION
    );
    derivedLocKey.assertEquals(
      locationHash,
      Error.PLANET_ALREADY_EXISTS_AT_THIS_LOCATION
    );
  }

  static verifyPlayerHasNoPlanet(
    playerId: Field,
    playerNullifierRoot: Field,
    playerNullifierWitness: MerkleMapWitness
  ) {
    const [derivedPlayerRoot, derivedPlayerKey] =
      playerNullifierWitness.computeRootAndKey(Const.EMPTY_FIELD);
    derivedPlayerRoot.assertEquals(
      playerNullifierRoot,
      Error.PLAYER_HAS_PLANET
    );
    derivedPlayerKey.assertEquals(playerId, Error.PLAYER_HAS_PLANET);
  }
}
