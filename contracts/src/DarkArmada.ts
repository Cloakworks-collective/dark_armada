import {
  Field,
  SmartContract,
  state,
  State,
  method,
  PublicKey,
  MerkleMapWitness,
  MerkleWitness,
  Poseidon,
} from 'o1js';

import { 
    PlanetDetails, 
    PlanetaryDefense,
    AttackFleet,
    planetTreeWitness,
    ownershipTreeWitness,
    defenseTreeWitness,
    attackTreeWitness,
 } from './utils/globalObjects';

import { Const } from './utils/consts';
import { Error } from './utils/errors';
import { HelperUtils } from './utils/helpers';
import { CreatePlanetVerifiers } from './verfiers/createPlanet';
import { ComputeBattleVerifiers } from './verfiers/computeBattle';
import { SetDefenseVerifiers } from './verfiers/setDefense';

export class DarkArmadaZkApp extends SmartContract {
  /**
   * State variables. on-chain game state (max 8 fields)
   */
  @state(Field) numberOfPlanets = State<Field>(); // Number of initalized planets
  @state(Field) planetTreeRoot = State<Field>(); // Planet details MerkleTree root (index -> planetDetailsHash)
  @state(Field) ownershipTreeRoot = State<Field>(); // Planet ownership MerkleTree root (index -> playerAddress)
  @state(Field) defenseTreeRoot = State<Field>(); // Planetary defense MerkleTree root (index -> defenseHash)
  @state(Field) attackTreeRoot = State<Field>(); // Incoming attack MerkleTree root (index -> serializedAttack)
  @state(Field) playerNullifierRoot = State<Field>(); // Player nullifier MerkleMap root (playerAddress -> boolean)
  @state(Field) locationNullifierRoot = State<Field>(); // Planet nullifier MerkleMap root (coordinateHash -> boolean)

  /**
   * Game Events
   */
  events = {
    'Planet Created': Field,
    'Defense Set': Field,
    'Attack Launched': Field,
    'Battle Concluded': Field,
    'Forfeit Claimed': Field,
  };

  /**
   * Constructor
   */
  init() {
    super.init();
    this.numberOfPlanets.set(Field(0));
    this.planetTreeRoot.set(Const.EMPTY_TREE_ROOT12);
    this.ownershipTreeRoot.set(Const.EMPTY_TREE_ROOT12);
    this.defenseTreeRoot.set(Const.EMPTY_TREE_ROOT12);
    this.attackTreeRoot.set(Const.EMPTY_TREE_ROOT12);
    this.playerNullifierRoot.set(Const.EMPTY_MAP_ROOT);
    this.locationNullifierRoot.set(Const.EMPTY_MAP_ROOT);
  }

  /**
   * Create a new planet, after verifying game constraints
   *
   * @param x - x-coordinate of the planet
   * @param y - y-coordinate of the planet
   * @param faction - faction of the planet
   * @param planetWitness - Witness to store planet details at the given leaf index of details merkleTree
   * @param ownerWitness - Witness to store ownership at the given leaf index of ownership merkleTree
   */
  @method createPlanet(
    x: Field,
    y: Field,
    faction: Field,
    planetWitness: planetTreeWitness,
    ownerWitness: ownershipTreeWitness,
    locationNullifierWitness: MerkleMapWitness,
    playerNullifierWitness: MerkleMapWitness
  ) {
    // verify max number of planets constraint
    const numPlanetsState = this.numberOfPlanets.getAndRequireEquals();
    CreatePlanetVerifiers.verifyMaxPlanets(numPlanetsState);

    // verify co-ordinates are within game map
    CreatePlanetVerifiers.verifyCoordinate(x, y);

    // verify co-ordinates are not already taken
    const locationNullifierRoot =
      this.locationNullifierRoot.getAndRequireEquals();
    CreatePlanetVerifiers.verifyLocationHasNoPlanet(
      x,
      y,
      locationNullifierRoot,
      locationNullifierWitness
    );

    // verify co-ordinates are suitable for planet creation
    CreatePlanetVerifiers.verifySuitableCoordinates(x, y);

    // verify that the faction is valid
    CreatePlanetVerifiers.verifyFaction(faction);

    // verify player does not already have a home planet
    const playerId = HelperUtils.getPlayerIdFromAddress(this.sender);
    const playerNullifierRoot = this.playerNullifierRoot.getAndRequireEquals();
    CreatePlanetVerifiers.verifyPlayerHasNoPlanet(
      playerId,
      playerNullifierRoot,
      playerNullifierWitness
    );

    // modify planetTreeRoot
    // modify ownershipTreeRoot
    // modify locationNullifierRoot
    // modify playerNullifierRoot
  }

  /**
   * Set the defense of a planet
   *
   * @param serializedDefense - defense details
   * @param defenderOwnerWitness - Witness to verify ownership of the planet
   * @param defenseWitness - Witness to store defense at the given leaf index of defense merkleTree
   */
  @method setDefense(
    battleships: Field,
    destroyers: Field,
    carriers: Field,
    defenderOwnerWitness: ownershipTreeWitness,
    defenseWitness: defenseTreeWitness,
    attackWitness: attackTreeWitness
  ) {
    // verify ownership of planet (only the planet owner can set defense)
    const ownerRoot = this.ownershipTreeRoot.getAndRequireEquals();
    const ownedWorldIndex = HelperUtils.getOwnedWorldId(this.sender, ownerRoot, defenderOwnerWitness);
    const defenseWitnessIndex = defenseWitness.calculateIndex();
    defenseWitnessIndex.assertEquals(ownedWorldIndex, Error.PLAYER_HAS_NO_ACCESS);

    // verify that planet is not under attack
    const attackWitnessIndex = attackWitness.calculateIndex();
    attackWitnessIndex.assertEquals(ownedWorldIndex, Error.PLAYER_HAS_NO_ACCESS);
    const attackRoot = this.attackTreeRoot.getAndRequireEquals();
    SetDefenseVerifiers.verifyPlanetNotUnderAttack(attackRoot, attackWitness);

    // verify planetary defense strength is within limits
    const defense = HelperUtils.getPlanetaryDefense(this.sender, battleships, destroyers, carriers);
    SetDefenseVerifiers.verifyDefenseStrength(defense);

    // modify defenseTreeRoot
    const defenseHash = Poseidon.hash(PlanetaryDefense.toFields(defense));
    const updatedDefenseRoot = defenseWitness.calculateRoot(defenseHash);
    this.defenseTreeRoot.set(updatedDefenseRoot);
  }

  /**
   * Launch an attack on a planet
   *
   * @param serializedAttack - attack details
   * @param attackerOwnerWitness - Witness to verify attacker's ownership of home planet
   * @param attackerDefenseWitness - Witness to verify attacker's defense
   * @param targetDefenseWitness - Witness to verify target's defense
   * @param targetAttackWitness - Witness to store attack at the given leaf index of attack merkleTree
   */
  @method launchAttack(
    serializedAttack: Field,
    attackerOwnerWitness: ownershipTreeWitness,
    attackerDefenseWitness: defenseTreeWitness,
    targetDefenseWitness: defenseTreeWitness,
    targetAttackWitness: attackTreeWitness
  ) {
    // verify attacker has a home planet
    // verify defender is not the attacker
    // verify defender is not under attack already
    // verify defender has defense
    // verify atacking fleet strength is within limits
    // verify attacker details - faction
    // compute attackHash
    // modify attackTreeRoot with attackHash
  }

  /**
   * Resolve an attack
   *
   * @param serializedAttack - attack details
   * @param serializedDefense - defense details
   * @param serializedPlanetDetails - planet details of the defending planet. e.g. faction
   * @param ownerWitness - Witness to verify ownership of the defending planet
   * @param defenseWitness - Witness to verify defense has not been altered while resolving.
   * @param attackWitness - Witness to verify attack has not been altered while resolving.
   * @param planetWitness - Witness to store planet details after the attack is resolved
   */
  @method resolveAttack(
    serializedAttack: Field,
    serializedDefense: Field,
    serializedPlanetDetails: Field,
    ownerWitness: ownershipTreeWitness,
    defenseWitness: defenseTreeWitness,
    attackWitness: attackTreeWitness,
    planetWitness: planetTreeWitness
  ) {
    // verify ownership of defending planet
    // verify there is no change in attack
    // verify there is no change in defense
    // verify defender details - faction
    // compute winner
    // modify planetTreeRoot - change points
    // modify attackTreeRoot - blank out the attack as it is resolved
  }

  /**
   * Claim a forfeit
   *
   * @param serializedAttack - attack details
   * @param targetAttackWitness - Witness to verify the attack
   */
  @method claimForfeit(
    serializedAttack: Field,
    targetAttackWitness: attackTreeWitness
  ) {
    // verify that the attacker is calling this method
    // verify that the forfeit claim is valid (time has passed)
  }
}
