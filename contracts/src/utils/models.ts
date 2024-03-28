import { Struct, Field } from 'o1js';

export class Fleet extends Struct({
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

export class PlanetDetails extends Struct({
  x: Field,
  y: Field,
  faction: Field,
  points: Field,
}) {}
