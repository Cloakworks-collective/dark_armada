import { Field, Struct, MerkleWitness, UInt64 } from 'o1js';
import { PublicKey } from 'o1js/dist/node/provable/curve-bigint';

/**
 * MerkleTree witnesses
 *
 * @note: The height of the tree is 12, therefor the number of leaves is 2^(12-1) = 2048
 * @note: The max number of planets is 1000, so, the tree is big enough to hold all the planets, with room for expansion
 * @note: the index of the leaf is planetId, and the same index(planetId) is used in all the trees, to store the same planet data
 * @note: e.g. leaf 2 in planetTreeWitness, ownershipTreeWitness, defenseTreeWitness, attackTreeWitness, all represent the same planet(planetId=2)
 */
export class planetTreeWitness extends MerkleWitness(12) {}
export class ownershipTreeWitness extends MerkleWitness(12) {}
export class defenseTreeWitness extends MerkleWitness(12) {}
export class attackTreeWitness extends MerkleWitness(12) {}
export class detailTreeWitness extends MerkleWitness(12) {}

export type GameWitness =
  | planetTreeWitness
  | ownershipTreeWitness
  | defenseTreeWitness
  | attackTreeWitness;

export class PlanetaryDefense extends Struct({
  playerId: Field,
  battleships: Field,
  destroyers: Field,
  carriers: Field,
}) {
  strength() {
    const fleetStrength = this.battleships
      .add(this.destroyers)
      .add(this.carriers);
    return fleetStrength;
  }
}

export class AttackFleet extends Struct({
  faction: Field,
  attackerId: Field,
  battleships: Field,
  destroyers: Field,
  carriers: Field,
  attackLaunchedAt: UInt64,
}) {
  strength() {
    const fleetStrength = this.battleships
      .add(this.destroyers)
      .add(this.carriers);
    return fleetStrength;
  }
}

export class PlanetDetails extends Struct({
  x: Field,
  y: Field,
  faction: Field,
  points: Field,
}) {}

export class PlanetaryInfo extends Struct({
  owner: Field,
  locattionHash: Field,
  faction: Field,
  points: Field,
  defenseHash: Field,
  incomingAttackHash: Field
}) {}
