import { 
    Field, 
    Poseidon, 
    PublicKey, 
    MerkleWitness 
} from 'o1js';

import {ownershipTreeWitness, PlanetaryDefense, AttackFleet} from './globalObjects';
import { Error } from '../utils/errors';

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
    return ownedWorldId
  }


  static getPlanetaryDefense(
    player: PublicKey,
    battleships: Field,
    destroyers: Field,
    carriers: Field,
  ): PlanetaryDefense{
    const playerId = HelperUtils.getPlayerIdFromAddress(player);
    return new PlanetaryDefense({
      playerId: playerId,
      battleships: battleships,
      destroyers: destroyers,
      carriers: carriers
    })
  }


  static getAttackFleet(){}
  
}
