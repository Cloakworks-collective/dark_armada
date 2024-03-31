import { Field, Provable } from 'o1js';

import { PlanetaryDefense, AttackFleet } from '../utils/globalObjects';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class ComputeBattleVerifiers {

  static calculateWinner(
    attackFleet: AttackFleet,
    defense: PlanetaryDefense
  ): Field {
    const attackeBattleships = attackFleet.battleships.mul(
      Const.BATTLESHIP_STRENGTH
    );
    const attackeDestroyers = attackFleet.destroyers.mul(
      Const.DESTROYER_STRENGTH
    );
    const attackeCarriers = attackFleet.carriers.mul(Const.CARRIER_STRENGTH);

    const defenderBattleships = defense.battleships.mul(
      Const.BATTLESHIP_STRENGTH
    );
    const defenderDestroyers = defense.destroyers.mul(Const.DESTROYER_STRENGTH);
    const defenderCarriers = defense.carriers.mul(Const.CARRIER_STRENGTH);

    //  battleships > destroyers
    const battleshipsBeatsDestroyers =
      attackeBattleships.sub(defenderDestroyers);

    // destroyers > carriers
    const destroyersBeatsCarriers = attackeDestroyers.sub(defenderCarriers);

    // carriers > battleships
    const carriersBeatsBattleships = attackeCarriers.sub(defenderBattleships);

    const battleResult = battleshipsBeatsDestroyers
      .add(destroyersBeatsCarriers)
      .add(carriersBeatsBattleships);

    const calculatedWinner = Provable.if(
      battleResult.greaterThanOrEqual(Field(0)),
      defense.playerId,
      attackFleet.attackerId
    );

    return calculatedWinner;
  }
}
