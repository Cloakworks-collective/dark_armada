import { Field, Poseidon, PublicKey } from 'o1js';

import { Fleet } from '../utils/models';
import { Const } from '../utils/consts';
import { Error } from '../utils/errors';

export class HelperUtils {
  static getPlayerIdFromAddress(playerAddress: PublicKey): Field {
    return Poseidon.hash(playerAddress.toFields());
  }

  static verifyOwnership(
    planetId: Field,
    playerAddress: Field,
    ownershipTreeRoot: Field,
    ownershipTreeWitness: MerkleWitness
  ) {
    const [derivedRoot, derivedValue] =
      ownershipTreeWitness.computeRootAndValue(planetId);
    derivedRoot.assertEquals(
      ownershipTreeRoot,
      Error.INVALID_OWNERSHIP_TREE_ROOT
    );
    derivedValue.assertEquals(playerAddress, Error.INVALID_OWNERSHIP);
  }
}
