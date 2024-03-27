import { 
    Field,
    SmartContract, 
    state,
    State, 
    method,
    PublicKey,
    MerkleMapWitness,
    MerkleWitness,
    Poseidon
} from 'o1js';


import { Const } from './utils/consts';
import {Error} from './utils/errors';
// import { PlanetDetails, Fleet } from './utils/models';
// import {verifyFleetStrength, calculateWinner} from './utils/gameLogic';

export class DarkArmada extends SmartContract {
    /**
     * State variables. on-chain game state (max 8 fields)
     */
    @state(Field) numberOfPlanets = State<Field>(); // Number of initalized planets
    @state(Field) planetTreeRoot = State<Field>(); // Planet ownership MerkleTree root (index -> planetDetailsHash)
    @state(Field) ownershipTreeRoot = State<Field>(); // Planet ownership MerkleTree root (index -> playerAddress)
    @state(Field) defenseTreeRoot = State<Field>(); // Planetary defense MerkleTree root (index -> defenseHash)
    @state(Field) attackTreeRoot = State<Field>(); // Incoming attack MerkleTree root (index -> serializedAttack)
    @state(Field) playerNullifierRoot = State<Field>(); // Player nullifier MerkleMap root (playerAddress -> boolean)
    @state(Field) locationNullifierRoot = State<Field>(); // Planet nullifier MerkleMap root (coordinateHash -> boolean)


    /** 
     * Game Events  
     */
    events = { 
        "Planet Created": Field,
        "Defense Set": Field,
        "Attack Launched": Field,
        "Battle Concluded": Field,
        "Forfeit Claimed": Field,
    }

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
     */
    @method createPlanet() {

        // verify max number of planets constraint
        // verify co-ordinates are within game map
        // verify co-ordinates are not already taken
        // verify co-ordinates are suitable for planet creation
        // verify player does not already have a home planet

        // modify planetTreeRoot
        // modify ownershipTreeRoot
        // modify locationNullifierRoot
        // modify playerNullifierRoot

    }

    /**
     * Set the defense of a planet
     */
    @method setDefense(){

        // verify owndership of planet
        // verify that planet is not under attack
        // verify planetary defense strength is within limits

        // compute defenseHash
        // modify defenseTreeRoot with defenseHash

    }

    /**
     * Launch an attack on a planet
     */
    @method launchAttack(){

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
     */
    @method resolveAttack(){
        
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
     */
    @method claimForfeit(){

        // verify that the attacker is calling this method
        // verify that the forfeit claim is valid (time has passed)

    }
}