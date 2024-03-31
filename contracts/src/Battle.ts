import {
    Field,
    SmartContract,
    state,
    State,
    method,
    MerkleMapWitness,
    Poseidon,
    Provable,
  } from 'o1js';

import {
    PlanetaryInfo,
    PlanetaryDefense,
    AttackFleet,
    detailTreeWitness
  } from './utils/globalObjects';

import { Const } from './utils/consts';
import { Error } from './utils/errors';
import { HelperUtils } from './utils/helpers';
import { CreatePlanetVerifiers } from './verfiers/createPlanet';
import { SetDefenseVerifiers } from './verfiers/setDefense';
import { LaunchAttackVerifiers } from './verfiers/launchAttack';
import { ComputeBattleVerifiers } from './verfiers/computeBattle';

export class DarkArmadaZkApp extends SmartContract {

    /**
     * State variables. on-chain game state (max 8 fields)
     */
    @state(Field) numberOfPlanets = State<Field>(); // Number of initalized planets
    @state(Field) playerNullifierRoot = State<Field>(); // Player nullifier MerkleMap root (playerAddress -> boolean)
    @state(Field) locationNullifierRoot = State<Field>(); // Planet nullifier MerkleMap root (coordinateHash -> boolean)
    @state(Field) detailsTreeRoot = State<Field>(); // Planet details MerkleTree root (index -> planetDetailsHash)


    /**
     * Constructor
     */
    init() {
        super.init();
        this.numberOfPlanets.set(Field(0));
        this.playerNullifierRoot.set(Const.EMPTY_MAP_ROOT);
        this.locationNullifierRoot.set(Const.EMPTY_MAP_ROOT);
        this.detailsTreeRoot.set(Const.EMPTY_TREE_ROOT12);
    }


    @method createPlanet(
        x: Field,
        y: Field,
        faction: Field,
        planetDetailsWitness: detailTreeWitness,
        locationNullifierWitness: MerkleMapWitness,
        playerNullifierWitness: MerkleMapWitness
    ){
        
        const locationHash = CreatePlanetVerifiers.calculateLocationHash(x, y);
        const playerId = HelperUtils.getPlayerIdFromAddress(this.sender);

        // verify max number of planets constraint
        const numPlanetsState = this.numberOfPlanets.getAndRequireEquals();
        CreatePlanetVerifiers.verifyMaxPlanets(numPlanetsState);

        // verify co-ordinates are within game map
        CreatePlanetVerifiers.verifyCoordinate(x, y);

        // verify co-ordinates are not already taken
        const locationNullifierRoot = this.locationNullifierRoot.getAndRequireEquals();
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
        const playerNullifierRoot = this.playerNullifierRoot.getAndRequireEquals();
        CreatePlanetVerifiers.verifyPlayerHasNoPlanet(
            playerId,
            playerNullifierRoot,
            playerNullifierWitness
          );


        // modify detailsTreeRoot
        const infoHash = HelperUtils.getPlanetInfoHash(
            playerId,
            locationHash,
            faction,
            Field(0),
            Const.EMPTY_FIELD,
            Const.EMPTY_FIELD
        );
        const newDetailsRoot = planetDetailsWitness.calculateRoot(infoHash);
        this.detailsTreeRoot.set(newDetailsRoot);

        // modify locationNullifierRoot
        const [updatedLocRoot, updatedLocKey] =
            locationNullifierWitness.computeRootAndKey(Const.FILLED);
        locationHash.assertEquals(updatedLocKey, Error.INVALID_KEY);
        this.locationNullifierRoot.set(updatedLocRoot);

        // modify playerNullifierRoot
        const [updatedPlayerRoot, updatedPlayerKey] =
            playerNullifierWitness.computeRootAndKey(Const.FILLED);
        playerId.assertEquals(updatedPlayerKey, Error.INVALID_KEY);
        this.playerNullifierRoot.set(updatedPlayerRoot);

        // increment number of planets
        this.numberOfPlanets.set(numPlanetsState.add(Field(1)));
    }

    @method setDefense(
        defense: PlanetaryDefense,
        details: PlanetaryInfo,
        planetDetailsWitness: detailTreeWitness
    ){  

        const playerId = HelperUtils.getPlayerIdFromAddress(this.sender);
        const savedDetailsRoot = this.detailsTreeRoot.getAndRequireEquals();

        // verify validity of planet details
        const infoHash = HelperUtils.getPlanetInfoHash(
            details.owner,
            details.locattionHash,
            details.faction,
            details.points,
            details.defenseHash,
            details.incomingAttackHash
        );
        const derivedDetailsRoot = planetDetailsWitness.calculateRoot(infoHash);
        savedDetailsRoot.assertEquals(derivedDetailsRoot, Error.INVALID_PLANET_DETAILS);

        // verify planet is owned by player
        details.owner.assertEquals(playerId, Error.PLAYER_HAS_NO_ACCESS);

        // verify defense strength is not too high
        SetDefenseVerifiers.verifyDefenseStrength(defense);

        // verify planet is not already under attack
        const incomingAttackHash = details.incomingAttackHash;
        incomingAttackHash.assertNotEquals(Const.EMPTY_FIELD, Error.PLANET_UNDER_ATTACK);

        // modify detailsTreeRoot
        const newDefenseHash = Poseidon.hash(PlanetaryDefense.toFields(defense));
        const newHash = HelperUtils.getPlanetInfoHash(
            details.owner,
            details.locattionHash,
            details.faction,
            details.points,
            newDefenseHash,
            details.incomingAttackHash
        );
        const newDetailsRoot = planetDetailsWitness.calculateRoot(newHash);
        this.detailsTreeRoot.set(newDetailsRoot);
    }

    @method launchAttack(
        attack: AttackFleet,
        attackerDetails: PlanetaryInfo,
        defenderDetails: PlanetaryInfo,
        defenderWitness: detailTreeWitness,
        attackerWitness: detailTreeWitness
    ){

        const playerId = HelperUtils.getPlayerIdFromAddress(this.sender);
        const savedDetailsRoot = this.detailsTreeRoot.getAndRequireEquals();

        // verify attacker details
        const attackerInfoHash = HelperUtils.getPlanetInfoHash(
            attackerDetails.owner,
            attackerDetails.locattionHash,
            attackerDetails.faction,
            attackerDetails.points,
            attackerDetails.defenseHash,
            attackerDetails.incomingAttackHash
        );
        const derivedAttackRoot = attackerWitness.calculateRoot(attackerInfoHash);
        savedDetailsRoot.assertEquals(derivedAttackRoot, Error.INVALID_PLANET_DETAILS);

        // verify defender details
        const defenderInfoHash = HelperUtils.getPlanetInfoHash(
            defenderDetails.owner,
            defenderDetails.locattionHash,
            defenderDetails.faction,
            defenderDetails.points,
            defenderDetails.defenseHash,
            defenderDetails.incomingAttackHash
        );
        const derivedDefenseRoot = defenderWitness.calculateRoot(defenderInfoHash);
        savedDetailsRoot.assertEquals(derivedDefenseRoot, Error.INVALID_PLANET_DETAILS);

        // verify attacker is the caller
        attackerDetails.owner.assertEquals(playerId, Error.PLAYER_HAS_NO_ACCESS);

        // verify attacker has set defense (and has a planet)
        attackerDetails.defenseHash.assertNotEquals(Const.EMPTY_FIELD, Error.PLANET_HAS_NO_DEFENSE);

        // verify player is not attacking their own planet
        attackerDetails.owner.assertNotEquals(defenderDetails.owner, Error.CANNOT_ATTACK_OWN_PLANET);

        // verify attack strength is not too high
        LaunchAttackVerifiers.verifyAttackStrength(attack);

        // verify defender has defense
        defenderDetails.defenseHash.assertNotEquals(Const.EMPTY_FIELD, Error.NO_DEFENSE);

        // verify defender is not already under attack
        defenderDetails.incomingAttackHash.assertEquals(Const.EMPTY_FIELD, Error.PLANET_UNDER_ATTACK);

        // modify detailsTreeRoot
        const newAttackHash = Poseidon.hash(AttackFleet.toFields(attack));
        const newDefenderDetailsHash = HelperUtils.getPlanetInfoHash(
            defenderDetails.owner,
            defenderDetails.locattionHash,
            defenderDetails.faction,
            defenderDetails.points,
            defenderDetails.defenseHash,
            newAttackHash
        );
        const newDefenderRoot = defenderWitness.calculateRoot(newDefenderDetailsHash);
        this.detailsTreeRoot.set(newDefenderRoot);
    }
    
    @method resolveAttack(
        attackerDetails: PlanetaryInfo,
        defenderDetails: PlanetaryInfo,
        defense: PlanetaryDefense,
        attack: AttackFleet,
        attackerWitness: detailTreeWitness,
        defenderWitness: detailTreeWitness
    ){
        const playerId = HelperUtils.getPlayerIdFromAddress(this.sender);
        const savedDetailsRoot = this.detailsTreeRoot.getAndRequireEquals();

        // verify attacker details
        const attackerInfoHash = HelperUtils.getPlanetInfoHash(
            attackerDetails.owner,
            attackerDetails.locattionHash,
            attackerDetails.faction,
            attackerDetails.points,
            attackerDetails.defenseHash,
            attackerDetails.incomingAttackHash
        );
        const derivedAttackRoot = attackerWitness.calculateRoot(attackerInfoHash);
        savedDetailsRoot.assertEquals(derivedAttackRoot, Error.INVALID_PLANET_DETAILS);

        // verify defender details - attack and defense hash is not modified
        const defenderInfoHash = HelperUtils.getPlanetInfoHash(
            defenderDetails.owner,
            defenderDetails.locattionHash,
            defenderDetails.faction,
            defenderDetails.points,
            defenderDetails.defenseHash,
            defenderDetails.incomingAttackHash
        );
        const derivedDefenseRoot = defenderWitness.calculateRoot(defenderInfoHash);
        savedDetailsRoot.assertEquals(derivedDefenseRoot, Error.INVALID_PLANET_DETAILS);

        // verify defender is the caller
        defenderDetails.owner.assertEquals(playerId, Error.PLAYER_HAS_NO_ACCESS);

        // verify defense 
        const derivedDefenseHash = Poseidon.hash(PlanetaryDefense.toFields(defense));
        defenderDetails.defenseHash.assertEquals(derivedDefenseHash, Error.DEFENSE_DOES_NOT_MATCH);

        // verify attack 
        const derivedAttackHash = Poseidon.hash(AttackFleet.toFields(attack));
        defenderDetails.incomingAttackHash.assertEquals(derivedAttackHash, Error.ATTACK_DOES_NOT_MATCH);
        
        // calculate the result of the battle
        const winnerId = ComputeBattleVerifiers.calculateWinner(attack, defense);

        // modify detailsTreeRoot
        let defenderPoints = defenderDetails.points;

        const updatedDefenderPoints = Provable.if(
            winnerId.equals(defenderDetails.owner),
            defenderPoints.add(Const.WIN_POINTS),
            defenderPoints.sub(Const.LOSE_POINTS)
        );

        const updatedDefenderHash = HelperUtils.getPlanetInfoHash(
            defenderDetails.owner,
            defenderDetails.locattionHash,
            defenderDetails.faction,
            updatedDefenderPoints,
            defenderDetails.defenseHash,
            Field(0)
        );

        const newDetailsRoot = defenderWitness.calculateRoot(updatedDefenderHash);

        const updatedAttackerPoints = Provable.if(
            winnerId.equals(attackerDetails.owner),
            attackerDetails.points.add(Const.WIN_POINTS),
            attackerDetails.points.sub(Const.LOSE_POINTS)
        ); 
            // TODO: USE ACTION-REDUCER PATTERN TO UPDATE THE STATE CHANGES
    }

    @method forfeit(
        attackerDetails: PlanetaryInfo,
        defenderDetails: PlanetaryInfo,
        attackerWitness: detailTreeWitness,
        defenderWitness: detailTreeWitness
    ){
        // verify player is the attacker
        // verify the claim duration has passed

        // modify detailsTreeRoot
    }

}