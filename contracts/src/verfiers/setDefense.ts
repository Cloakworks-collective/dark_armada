import { PlanetaryDefense} from '../utils/globalObjects';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class SetDefenseVerifiers {

    static verifyDefenseStrength(defense: PlanetaryDefense) {
        const fleetStrength = defense.strength();
        fleetStrength.assertLessThanOrEqual(Const.MAX_DEFENSE_STRENGTH, Error.DEFENSE_STRENGTH);
    }
    
}