import { Field, Poseidon } from 'o1js';

import { Const } from './consts';
import { Error } from './errors';

export class PlanetUtils {

     static calculateLocationHash(x: Field, y: Field): Field {
        let locationHash = Poseidon.hash([x, y]);
        for (let i = 0; i < Const.CHAIN_HASH_TIMES; i++) {
            locationHash = Poseidon.hash([locationHash, Field(i)]);
        }
        return locationHash;
    }

     static verifyCoordinate(x: Field, y: Field) {
        x.assertLessThanOrEqual(Const.MAX_GAME_MAP_LENGTH, Error.COORDINATE_OUT_OF_RANGE);
        y.assertLessThanOrEqual(Const.MAX_GAME_MAP_LENGTH, Error.COORDINATE_OUT_OF_RANGE);
    }
    
     static verifyFaction(faction: Field) {
        faction.assertLessThanOrEqual(Field(3), Error.INVALID_FACTION);
    }

     static verifyMaxPlanets(numPlanets: Field) {
        numPlanets.assertLessThanOrEqual(Const.MAX_NUM_PLANETS, Error.MAX_NUM_PLANETS);
    }

     static verifySuitableCoordinates(x: Field, y: Field) {
        const locationHash = this.calculateLocationHash(x, y);
        locationHash.assertLessThanOrEqual(Const.BIRTHING_DIFFICULTY_CUTOFF, Error.COORDINATE_NOT_SUITABLE);
    }
    
}


