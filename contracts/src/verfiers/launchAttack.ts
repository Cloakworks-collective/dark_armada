import { AttackFleet} from '../utils/globalObjects';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class LaunchAttackVerifiers {

    static verifyAttackStrength(attack: AttackFleet) {
        const fleetStrength = attack.strength();
        fleetStrength.assertLessThanOrEqual(Const.MAX_ATTACK_STRENGTH, Error.ATTACK_FLEET_STRENGH);
    }

}

