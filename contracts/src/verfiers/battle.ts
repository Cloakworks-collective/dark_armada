import { Field, Provable } from 'o1js';

import { Fleet } from '../utils/models';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class BattleVerifiers {

    verifyFleetStrength(fleet: Fleet) {
        const fleetStrength = fleet.strength();
        fleetStrength.assertLessThanOrEqual(Const.MAX_FLEET_STRENGTH, Error.FLEET_STRENGTH);
    }

    calculateWinner(attackFleet: Fleet, defenseFleet: Fleet): Field {
        const attackeBattleships = attackFleet.battleships.mul(Const.BATTLESHIP_STRENGTH);
        const attackeDestroyers = attackFleet.destroyers.mul(Const.DESTROYER_STRENGTH);
        const attackeCarriers = attackFleet.carriers.mul(Const.CARRIER_STRENGTH);

        const defenderBattleships = defenseFleet.battleships.mul(Const.BATTLESHIP_STRENGTH);
        const defenderDestroyers = defenseFleet.destroyers.mul(Const.DESTROYER_STRENGTH);
        const defenderCarriers = defenseFleet.carriers.mul(Const.CARRIER_STRENGTH);

        //  battleships > destroyers
        const battleshipsBeatsDestroyers = attackeBattleships.sub(defenderDestroyers);

        // destroyers > carriers
        const destroyersBeatsCarriers = attackeDestroyers.sub(defenderCarriers);

        // carriers > battleships
        const carriersBeatsBattleships = attackeCarriers.sub(defenderBattleships);

        const battleResult = battleshipsBeatsDestroyers
            .add(destroyersBeatsCarriers)
            .add(carriersBeatsBattleships);

        const calculatedWinner = Provable.if(
            battleResult.greaterThanOrEqual(Field(0)),
            defenseFleet.playerId,
            attackFleet.playerId
        );

        return calculatedWinner;
    }

}