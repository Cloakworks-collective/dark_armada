import { Field } from 'o1js';

import { PlanetaryDefense, attackTreeWitness} from '../utils/globalObjects';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class SetDefenseVerifiers {

    static verifyPlanetNotUnderAttack(
        attackTreeRoot: Field, 
        attackWitness: attackTreeWitness
    ) {
        const derivedAttackRoot = attackWitness.calculateRoot(Const.EMPTY_FIELD);
        attackTreeRoot.assertEquals(derivedAttackRoot, Error.PLANET_UNDER_ATTACK);
    }

    static verifyDefenseStrength(defense: PlanetaryDefense) {
        const fleetStrength = defense.strength();
        fleetStrength.assertLessThanOrEqual(Const.MAX_DEFENSE_STRENGTH, Error.FLEET_STRENGTH);
    }
    
}