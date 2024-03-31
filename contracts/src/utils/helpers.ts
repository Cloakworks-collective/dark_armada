import { Field, Poseidon, PublicKey, UInt64, MerkleWitness } from 'o1js';

import {
  PlanetaryDefense,
  AttackFleet,
  ownershipTreeWitness,
  attackTreeWitness,
  GameWitness,
  defenseTreeWitness,
} from './globalObjects';

import { Const } from './consts';
import { Error } from '../utils/errors';
import { PlanetDetails, PlanetaryInfo } from './globalObjects';

export class HelperUtils {
  /**
   * @param playerAddress
   * @returns playerid computed from playerAddress
   */
  static getPlayerIdFromAddress(playerAddress: PublicKey): Field {
    return Poseidon.hash(playerAddress.toFields());
  }

  /**
   * Helps to get the worldId of the ownerAddress
   *
   *
   * @param ownerAddress
   * @param ownerTreeRoot
   * @param ownerWitness
   * @returns worldId of the ownerAddress
   *
   * @note: The worldId is the index of the leaf in the ownershipTreeWitness,
   *       which is synced with all the trees.Therefore, once we can verify
   *       the ownershipTreeWitness, we can update the correct leafs in other trees.
   */
  static getOwnedWorldId(
    ownerAddress: PublicKey,
    ownerTreeRoot: Field,
    ownerWitness: ownershipTreeWitness
  ): Field {
    const playerId = HelperUtils.getPlayerIdFromAddress(ownerAddress);
    const derivedOwnerTreeRoot = ownerWitness.calculateRoot(playerId);
    ownerTreeRoot.assertEquals(derivedOwnerTreeRoot, Error.INVALID_PLAYER);

    const ownedWorldId = ownerWitness.calculateIndex();
    return ownedWorldId;
  }

  /**
   * Verifies the witness index
   *
   *
   * @param worldIndex
   * @param witness
   * @note: this verifies that the witness has the correct index.
   */
  static verifyWitnessIndex(worldIndex: Field, witness: GameWitness) {
    worldIndex.assertEquals(witness.calculateIndex(), Error.INVALID_WITNESS);
  }

  /**
   * Verifies that the planet is not under attack
   *
   * @param attackTreeRoot
   * @param attackWitness
   * @note: if the planet is not under sttack, the leaf value is empty.
   */
  static verifyPlanetNotUnderAttack(
    attackTreeRoot: Field,
    attackWitness: attackTreeWitness
  ) {
    const derivedAttackRoot = attackWitness.calculateRoot(Const.EMPTY_FIELD);
    attackTreeRoot.assertEquals(derivedAttackRoot, Error.PLANET_UNDER_ATTACK);
  }

  /**
   * Verifies that the planet has defense
   *
   * @param defenseTreeRoot
   * @param defenseWitness
   * @note: if the planet has defense, the leaf value is NOT empty.
   */
  static verifyPlanetHasDefense(
    defenseTreeRoot: Field,
    defenseWitness: defenseTreeWitness
  ) {
    const derivedDefenseRoot = defenseWitness.calculateRoot(Const.EMPTY_FIELD);
    defenseTreeRoot.assertNotEquals(derivedDefenseRoot, Error.NO_DEFENSE);
  }

  static verifyPlanetDetails(
    x: Field,
    y: Field,
    faction: Field,
    points: Field
  ) {
    new PlanetDetails({ x: x, y: y, faction: faction, points: points });
    const planetDetailsHash = Poseidon.hash([x, y, faction, points]);
  }


  // export class PlanetaryInfo extends Struct({
  //   owner: Field,
  //   locattionHash: Field,
  //   faction: Field,
  //   points: Field,
  //   defenseHash: Field,
  //   incomingAttackHash: Field
  // }) {}

  static getPlanetInfoHash(
    playerId: Field,
    locationHash: Field,
    faction: Field,
    points: Field,
    defenseHash: Field,
    incomingAttackHash: Field
  ): Field {
    const info = new PlanetaryInfo({
      owner: playerId,
      locattionHash: locationHash,
      faction: faction,
      points: points,
      defenseHash: defenseHash,
      incomingAttackHash: incomingAttackHash,
    });
    return Poseidon.hash(PlanetaryInfo.toFields(info));
  }


  static getPlanetaryDefense(
    player: PublicKey,
    battleships: Field,
    destroyers: Field,
    carriers: Field
  ): PlanetaryDefense {
    const playerId = HelperUtils.getPlayerIdFromAddress(player);
    return new PlanetaryDefense({
      playerId: playerId,
      battleships: battleships,
      destroyers: destroyers,
      carriers: carriers,
    });
  }

  static getAttackFleet(
    faction: Field,
    attackerAddress: PublicKey,
    battleships: Field,
    destroyers: Field,
    carriers: Field,
    attackLaunchedAt: UInt64
  ) {
    const attackerId = HelperUtils.getPlayerIdFromAddress(attackerAddress);
    return new AttackFleet({
      faction: faction,
      attackerId: attackerId,
      battleships: battleships,
      destroyers: destroyers,
      carriers: carriers,
      attackLaunchedAt: attackLaunchedAt,
    });
  }
}
