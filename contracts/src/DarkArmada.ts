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
  Provable,
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
import { SetDefenseVerifiers } from './verfiers/setDefense';
import { LaunchAttackVerifiers } from './verfiers/launchAttack';
import { ComputeBattleVerifiers } from './verfiers/computeBattle';
import { p } from 'o1js/dist/node/bindings/crypto/finite-field';

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
    const pd = new PlanetDetails({
      x: x,
      y: y,
      faction: faction,
      points: Field(0),
    });
    const planetDetailsHash = Poseidon.hash(PlanetDetails.toFields(pd));
    const updatedPlanetDetailsRoot =
      planetWitness.calculateRoot(planetDetailsHash);
    this.planetTreeRoot.set(updatedPlanetDetailsRoot);

    // modify ownershipTreeRoot
    const updatedOwnershipRoot = ownerWitness.calculateRoot(playerId);
    this.ownershipTreeRoot.set(updatedOwnershipRoot);

    // modify locationNullifierRoot after verifying key
    const planetHash = CreatePlanetVerifiers.calculateLocationHash(x, y);
    const [updatedLocRoot, updatedLocKey] =
      locationNullifierWitness.computeRootAndKey(Const.FILLED);
    planetHash.assertEquals(updatedLocKey, Error.INVALID_KEY);
    this.locationNullifierRoot.set(updatedLocRoot);

    // modify playerNullifierRoot after verifying key
    const [updatedPlayerRoot, updatedPlayerKey] =
      playerNullifierWitness.computeRootAndKey(Const.FILLED);
    planetHash.assertEquals(updatedPlayerKey, Error.INVALID_KEY);
    this.playerNullifierRoot.set(updatedPlayerRoot);
  }

  /**
   * Set the defense of a planet
   *
   * @param battleships - defense details
   * @param destroyers - defense details
   * @param carriers - defense details
   * @param defenderOwnerWitness - Witness to verify ownership of the planet
   * @param defenseWitness - Witness to store defense at the given leaf index of defense merkleTree
   * @param attackWitness - Witness to verify planet is not under attack
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
    const ownedWorldIndex = HelperUtils.getOwnedWorldId(
      this.sender,
      ownerRoot,
      defenderOwnerWitness
    );
    HelperUtils.verifyWitnessIndex(ownedWorldIndex, defenseWitness);

    // verify that planet is not under attack
    HelperUtils.verifyWitnessIndex(ownedWorldIndex, attackWitness);
    const attackRoot = this.attackTreeRoot.getAndRequireEquals();
    HelperUtils.verifyPlanetNotUnderAttack(attackRoot, attackWitness);

    // verify planetary defense strength is within limits
    const defense = HelperUtils.getPlanetaryDefense(
      this.sender,
      battleships,
      destroyers,
      carriers
    );
    SetDefenseVerifiers.verifyDefenseStrength(defense);

    // modify defenseTreeRoot
    const defenseHash = Poseidon.hash(PlanetaryDefense.toFields(defense));
    const updatedDefenseRoot = defenseWitness.calculateRoot(defenseHash);
    this.defenseTreeRoot.set(updatedDefenseRoot);
  }

  /**
   * Launch an attack on a planet
   *
   * @param battleships - attack details
   * @param destroyers - attack details
   * @param carriers - attack details
   * @param faction - faction of the attacker
   * @param attackerOwnerWitness - Witness to verify attacker's ownership of home planet
   * @param attackerDefenseWitness - Witness to verify attacker's defense
   * @param targetDefenseWitness - Witness to verify target's defense
   * @param targetAttackWitness - Witness to store attack at the given leaf index of attack merkleTree
   * @param planetWitness - Witness to verify planet details
   *
   */
  @method launchAttack(
    x: Field,
    y: Field,
    battleships: Field,
    points: Field,
    destroyers: Field,
    carriers: Field,
    faction: Field,
    attackerOwnerWitness: ownershipTreeWitness,
    attackerDefenseWitness: defenseTreeWitness,
    attackerPlanetWitness: planetTreeWitness,
    targetDefenseWitness: defenseTreeWitness,
    targetAttackWitness: attackTreeWitness
  ) {
    // verify attacker has a home planet
    const ownerRoot = this.ownershipTreeRoot.getAndRequireEquals();
    const ownedWorldIndex = HelperUtils.getOwnedWorldId(
      this.sender,
      ownerRoot,
      attackerOwnerWitness
    );

    // verify attacker has defense
    HelperUtils.verifyWitnessIndex(ownedWorldIndex, attackerDefenseWitness);
    const defenseRoot = this.defenseTreeRoot.getAndRequireEquals();
    HelperUtils.verifyPlanetHasDefense(defenseRoot, attackerDefenseWitness);

    // verify defender is not the attacker - players cannot attack their own planets
    const attackerIndex = attackerOwnerWitness.calculateIndex();
    const defenderIndex = targetDefenseWitness.calculateIndex();
    attackerIndex.assertNotEquals(
      defenderIndex,
      Error.CANNOT_ATTACK_OWN_PLANET
    );

    // verify defender is not under attack already
    const attackRoot = this.attackTreeRoot.getAndRequireEquals();
    HelperUtils.verifyPlanetNotUnderAttack(attackRoot, targetAttackWitness);

    // verify defender has defense
    HelperUtils.verifyPlanetHasDefense(defenseRoot, targetDefenseWitness);

    // verify atacking fleet strength is within limits
    const currentTime = this.network.timestamp.get();
    const attackingFleet = HelperUtils.getAttackFleet(
      faction,
      this.sender,
      battleships,
      destroyers,
      carriers,
      currentTime
    );
    LaunchAttackVerifiers.verifyAttackStrength(attackingFleet);

    // verify attacker details - faction
    // TODO: defender cannot know the attacker's x,y
    const apd = new PlanetDetails({
      x: x,
      y: y,
      faction: faction,
      points: points,
    });
    const apdHash = Poseidon.hash(PlanetDetails.toFields(apd));
    const planetRoot = this.planetTreeRoot.getAndRequireEquals();
    const derivedplanetRoot = attackerPlanetWitness.calculateRoot(apdHash);
    planetRoot.assertEquals(derivedplanetRoot, Error.INVALID_ATTACKER_DETAILS);

    // modify attackTreeRoot with attackHash
    const attackHash = Poseidon.hash(AttackFleet.toFields(attackingFleet));
    const updatedAttackRoot = targetAttackWitness.calculateRoot(attackHash);
    this.attackTreeRoot.set(updatedAttackRoot);
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
    attackFleet: AttackFleet,
    planetaryDefense: PlanetaryDefense,
    defenderDetails: PlanetDetails,
    attackerDetails: PlanetDetails,
    defenderOwnerWitness: ownershipTreeWitness,
    defenseWitness: defenseTreeWitness,
    attackWitness: attackTreeWitness,
    defenderPlanetWitness: planetTreeWitness,
    attackerPlanetWitness: planetTreeWitness
  ) {
    // verify ownership of defending planet
    const ownerRoot = this.ownershipTreeRoot.getAndRequireEquals();
    const ownedWorldIndex = HelperUtils.getOwnedWorldId(
      this.sender,
      ownerRoot,
      defenderOwnerWitness
    );

    // verify there is no change in attack
    const attackRoot = this.attackTreeRoot.getAndRequireEquals();
    HelperUtils.verifyWitnessIndex(ownedWorldIndex, attackWitness);
    const attackHash = Poseidon.hash(AttackFleet.toFields(attackFleet));
    const derivedAttackRoot = attackWitness.calculateRoot(attackHash);
    attackRoot.assertEquals(derivedAttackRoot, Error.ATTACK_DOES_NOT_MATCH);

    // verify there is no change in defense
    const defenseRoot = this.defenseTreeRoot.getAndRequireEquals();
    HelperUtils.verifyWitnessIndex(ownedWorldIndex, defenseWitness);
    const defenseHash = Poseidon.hash(
      PlanetaryDefense.toFields(planetaryDefense)
    );
    const derivedDefenseRoot = defenseWitness.calculateRoot(defenseHash);
    defenseRoot.assertEquals(derivedDefenseRoot, Error.DEFENSE_DOES_NOT_MATCH);

    // verify defender details - faction
    const planetRoot = this.planetTreeRoot.getAndRequireEquals();
    const planetDetailsHash = Poseidon.hash(
      PlanetDetails.toFields(defenderDetails)
    );
    const derivedplanetRoot =
      defenderPlanetWitness.calculateRoot(planetDetailsHash);
    planetRoot.assertEquals(derivedplanetRoot, Error.INVALID_ATTACKER_DETAILS);

    // compute winner
    const winnerId = ComputeBattleVerifiers.calculateWinner(
      attackFleet,
      planetaryDefense
    );

    // modify planetTreeRoot - change points
    let defenderPoints = defenderDetails.points;
    const updatedDefenderPoints = Provable.if(
      winnerId.equals(planetaryDefense.playerId),
      defenderPoints.add(Const.WIN_POINTS),
      defenderPoints.sub(Const.LOSE_POINTS)
    );
    const updatedDefenderDetails = new PlanetDetails({
      x: defenderDetails.x,
      y: defenderDetails.y,
      faction: defenderDetails.faction,
      points: updatedDefenderPoints,
    });
    const updatedPlanetDetailsHash = Poseidon.hash(
      PlanetDetails.toFields(updatedDefenderDetails)
    );
    const updatedPlanetRoot = defenderPlanetWitness.calculateRoot(
      updatedPlanetDetailsHash
    );
    this.planetTreeRoot.set(updatedPlanetRoot);

    let attackerPoints = attackerDetails.points;
    const updatedAttackerPoints = Provable.if(
      winnerId.equals(planetaryDefense.playerId),
      attackerPoints.sub(Const.WIN_POINTS),
      attackerPoints.add(Const.LOSE_POINTS)
    );
    const updatedAttackerDetails = new PlanetDetails({
      x: attackerDetails.x,
      y: attackerDetails.y,
      faction: attackerDetails.faction,
      points: updatedAttackerPoints,
    });
    const updatedAttackerDetailsHash = Poseidon.hash(
      PlanetDetails.toFields(updatedAttackerDetails)
    );
    const updatedAttackerRoot = attackerPlanetWitness.calculateRoot(
      updatedAttackerDetailsHash
    );
    this.planetTreeRoot.set(updatedAttackerRoot);

    // modify attackTreeRoot - blank out the attack as it is resolved
    const updatedAttackRoot = attackWitness.calculateRoot(Const.EMPTY_FIELD);
    this.attackTreeRoot.set(updatedAttackRoot);
  }

  /**
   * Claim a forfeit
   *
   * @param serializedAttack - attack details
   * @param targetAttackWitness - Witness to verify the attack
   */
  @method claimForfeit(
    attackFleet: AttackFleet,
    attackerDetails: PlanetDetails,
    defenderAttackWitness: attackTreeWitness,
    attackerPlanetWitness: planetTreeWitness
  ) {
    // verify that the attacker is calling this method
    const attackRoot = this.attackTreeRoot.getAndRequireEquals();
    const attackFleetHash = Poseidon.hash(AttackFleet.toFields(attackFleet));
    const derivedAttackRoot =
      defenderAttackWitness.calculateRoot(attackFleetHash);
    attackRoot.assertEquals(derivedAttackRoot, Error.NOT_ATTACKER);

    const attackerId = HelperUtils.getPlayerIdFromAddress(this.sender);
    attackerId.assertEquals(attackFleet.attackerId, Error.NOT_ATTACKER);

    // verify that the forfeit claim is valid (time has passed)
    const currentTime = this.network.timestamp.get();
    const attackLaunchedAt = attackFleet.attackLaunchedAt;
    const timePassed = currentTime.sub(attackLaunchedAt);
    timePassed.assertLessThanOrEqual(
      Const.FORFEIT_CLAIM_DURATION,
      Error.FORFEIT_CLAIM_DURATION
    );

    // modify attacker points
    const planetRoot = this.planetTreeRoot.getAndRequireEquals();
    const attackerDetailsHash = Poseidon.hash(
      PlanetDetails.toFields(attackerDetails)
    );
    const derivedplanetRoot =
      attackerPlanetWitness.calculateRoot(attackerDetailsHash);
    planetRoot.assertEquals(derivedplanetRoot, Error.INVALID_ATTACKER_DETAILS);

    let attackerPoints = attackerDetails.points;
    const updatedAttackerPoints = attackerPoints.add(Const.FORFEIT_POINTS);
    const updatedAttackerDetails = new PlanetDetails({
      x: attackerDetails.x,
      y: attackerDetails.y,
      faction: attackerDetails.faction,
      points: updatedAttackerPoints,
    });
    const updatedAttackerDetailsHash = Poseidon.hash(
      PlanetDetails.toFields(updatedAttackerDetails)
    );
    const updatedAttackerRoot = attackerPlanetWitness.calculateRoot(
      updatedAttackerDetailsHash
    );
    this.planetTreeRoot.set(updatedAttackerRoot);
  }
}
