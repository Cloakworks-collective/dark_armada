![alt text](images/cover.png)

# Dark Armada: Masters of  the Void

- [Dark Armada: Masters of  the Void](#dark-armada--masters-of--the-void)
  * [Background](#background)
  * [Introduction to the game](#introduction-to-the-game)
  * [How are Planets initiated and discovered?](#how-are-planets-initiated-and-discovered)
  * [How Battles work?](#how-battles-work)
  * [ZKPs in the game:](#zkps-in-the-game)
    + [Planet Initiation](#planet-initiation)
    + [Fleet Initialization](#fleet-initialization)
    + [Battle computation](#battle-computation)
  * [Spawning Solar systems/Planets](#spawning-solar-systems-planets)
    + [Numerical Insights on spawning:](#numerical-insights-on-spawning)
  * [Mining Planets (Benchmarking)](#mining-planets--benchmarking)
      - [Poseidon hashing on M1 Mac](#poseidon-hashing-on-m1-mac)
      - [Keccak256 hashing on M1 Mac](#keccak256-hashing-on-m1-mac)
      - [Chain Poseidon hash on M1 Mac](#chain-poseidon-hash-on-m1-mac)
  * [Game state](#game-state)    
  * [Game Progress](#game-progress)    
  * [References](#references)

## Background

"Dark Armada: Masters of the Void" is a massively multiplayer online (MMO) game that utilizes Zero Knowledge Proofs (ZKPs) to create a verifiable fog of war. Inspired by the "Dark Forest zkSNARK space warfare" game, which was implemented on EVM with Circom circuits, this version is developed in O1js—a TypeScript embedded DSL for ZK—and the contracts are deployed on Mina. Additionally, the game logic has been significantly revised to enhance strategic depth,a nd provide a completely different experience than that of "dark forest".

## Introduction to the game 

Imagine an expansive galaxy teeming with myriad planets, each fortified and primed for cosmic conflict. As a player, you are thrust into this universe by assuming command of one of these planets, becoming its ruler and guardian. Upon embarking on this interstellar journey, players take control of planets and covertly organize defensive fleets, concealed from adversaries through the use of zero-knowledge proofs (zk-SNARKs). 

Both the planet coordinates and their defensive strategies remain private. Only the hashes of these coordinates and defensive tactics are stored in public off-chain storage. The Mina smart contract on-chain maintains the root of Merkle Maps for planet location and planet defense, verifying the integrity of the off-chain storage.



## How are Planets initiated and discovered?

Planet coordinates are kept private, with only their Poseidon hash values stored in public off-chain storage. The on-chain Mina smart contract secures the integrity of these locations through the root of Merkle Maps. Players must "mine" to uncover the concealed coordinates of other planets, scanning the vast universe with limited range and employing Poseidon hash collision techniques to discover them.

Picture yourself navigating the immense universe, where you're limited to scanning (enumerating) the nearby space—using hash collision to seek out other planets.

Here is the 2 step process of Initiating a planet, and "mining" for the location of the planet: 

Step 1: Initiating Planets

A player picks a co-ordinate, e.g. (3,1), and generates proof that those co-ordinates are within the game universe. Once the proof is verified on Mina Blockchain, the merkle map root is updated, and the markle map is stored off-chain.

![alt text](images/initiate.png)

Step 2: Mining (Discovering Hidden Planets)

Other players, represented by Player 2 here, "mines" for the location of planets. Player 2 iterates over pairs of co-ordinate values (x, y), applying the Poseidon hash function to each pair, and comparing the resulting hash to the hash of a specific pairs, that has initiated planets. In our example [3,1] is one such pair.

![alt text](images/mine.png)

## How Battles work? 

Once a player discovers another planet, they have the option to "attack" it. However, the defensive measures of the planet remain confidential, while the attacks are conducted openly. The outcome of the defense, whether successful or not, results in the leakage of some information, enabling future attackers to formulate educated guesses about the planet's defenses.

Here's the 4 step process of how battles work: 

Step 1: Initiating Defense Fleet

Player 1 (Planet owner), sets up a hidden defense fleet for a planet. The details of this fleet are kept private and stored off-chain. To validate the existence and the integrity of the fleet without revealing its specifics, a zero-knowledge proof (ZK Proof) is generated and then verified. Once the proof is verified, the merkle map roots to reflect the new state in Mina blockchain.

![alt text](images/step1_battle.png)

 Step 2: Public Attack

Player 2 initiates a public attack on a planet by deploying an attack fleet, the details of which are stored off-chain but visible to all. A zero-knowledge proof for this fleet is generated and verified. Upon successful verification, the Mina smart contract is updated to include the new proof in the verified Merkle Map roots.

![alt text](images/step2_battle.png)

Step 3: Battle Computations

 Since only the defender (Player 1) possesses complete knowledge of their defense fleet, they are responsible for calculating the outcome of the battle, taking into account both their private defense details and the publicly known attacking fleet. They must then submit both the proof and the result of the battle on-chain. This two-step resolution process, although less than ideal, affects the user experience. Unfortunately, it was the only method I could devise to ensure a fair and verifiable battle.

![alt text](images/step3_battle.png)

Step 4(Optional) : Plunder Planet

If the defender (Player 1) anticipates that an incoming attack will likely lead to a defeat, they may opt to "ghost" the attacker by failing to submit the required proof. To address this scenario, we've introduced a "collect forfeit" mechanism. This allows an attacker (Player 2) to essentially loot the planet if the defender does not provide proof of defense within a specified timeframe.

![alt text](images/step4_battle.png)

## ZKPs in the game:

Dark Armada uses ZKP to prove 3 operations regarding planet location and fleet engagements: 

1. Planet initiation - verify that the location is within the game universe.
2. Planet defense initialization - verify that the defense fleet follows game rules regarding fleet composition and maximum strtength.
3. Battle Computation - verify that the battle computation is correct based on the engagement rules.

### Planet Initiation 

While initiating a planet we submit a proof three things: 

1. The max number of planets not reached
2. Player is in the whitelist 
3. Initiated Planet co-ordinates are within the game universe.

```typescript
   // STEP 1: check if the number of planets reached MAX_NUM_PLANETS
    let planetsNumBefore = this.numberOfPlanets.getAndRequireEquals();
    planetsNumBefore.assertLessThan(Const.MAX_NUM_PLANETS, Errors.MAX_NUM_PLANETS_ERROR);

    // STEP 2: check if the player is in the whitelist, and has not initiated a homeworld
    const currentPlayer = Poseidon.hash(this.sender.toFields());
    let nullRootBefore = this.playerNullifierRoot.getAndRequireEquals();

    [ derivedNullRoot, derivedNullKey ] = nullifierKeyWitness.computeRootAndKey(Const.WHITELISTED_VALUE);
    derivedNullRoot.assertEquals(nullRootBefore, Errors.PLAYER_CANNOT_INITIATE_ERROR);
    derivedNullKey.assertEquals(currentPlayer, Errors.PLAYER_CANNOT_INITIATE_ERROR);
    

    // STEP 3: check if the coordinate is within the game radius
    const gameLength = this.gameLength.getAndRequireEquals();

    x.assertLessThan(gameLength, Errors.COORDINATE_OUT_OF_RANGE_ERROR);
    y.assertLessThan(gameLength, Errors.COORDINATE_OUT_OF_RANGE_ERROR);
```

### Fleet Initialization

While initiating a planetary defense, or assembling an atatck fleet to attack other planets
We check that the fllet strength does not exceed the max limit set in the game

```typescript
export function verifyFleetStrength(fleet: Fleet){
    const fleetStrength = fleet.strength();
    fleetStrength.assertLessThanOrEqual(Const.MAX_FLEET_STRENGTH, Errors.FLEET_STRENGTH_ERROR);
}
```

### Battle computation 

Last, but not the least - we compute fleet battles on client computer of the defender and submit the proof to be validated. 

```typescript
  @method computeBattle(
      attackFleet: Fleet,
      defenseFleet: Fleet,
      battleKeyWitness: MerkleMapWitness
  )
  {
      // STEP 0: make sure that the attacking army is valid
      verifyFleetStrength(attackFleet);
    
      // STEP 1 :calculate the winner
      const winner = calculateWinner(attackFleet, defenseFleet);
      
      // STEP 2 : Set the winner 
      const [battleMapRoot, _] = battleKeyWitness.computeRootAndKey(winner);
      this.battleHistoryMapRoot.set(battleMapRoot);
      
      // STEP 3 : Increment the number of battles
      const currentBattles = this.numberOfBattles.getAndRequireEquals();
      this.numberOfBattles.set(currentBattles.add(Field(1)));

      // STEP 4 : emit the event
      this.emitEvent("battle winner", winner);
  }
```

Now let's explain the `calculateWinner() function`.In the game POC, as of now the fleets consist of 3 units - Battleships, Destroyers and Carriers


In the Rock-Paper-Scissor esque fashion, some units perform better (has an advantage over other units)
1. Battleship: Powerful and heavily armored, capable of enduring a lot of damage. Its strength lies in its ability to overpower Destroyers with its superior firepower.
2. Destroyer: Equipped with fast, agile, and specialized in anti-aircraft and missile defense systems. It can effectively protect against and neutralize Carriers by intercepting their aircraft and missiles.
3. Carrier: Launches aircraft and drones, providing a significant advantage over Battleships by attacking from a distance and avoiding direct firepower.

For now, We simply find winners of Battleship-Destroyer, Destroyer-Carrier and Carrier-Battleship engagements, and the player who won 2 out of 3 engagements in vrowned the winner.
This is subject to more change as the game evolves.

```typescript
function calculateWinner(attackFleet: Fleet, defenseFleet: Fleet): Field{
  const attackeBattleships = attackFleet.battleships.mul(Const.BATTLESHIP_COST);
  const attackeDestroyers = attackFleet.destroyers.mul(Const.DESTROYER_COST);
  const attackeCarriers = attackFleet.carriers.mul(Const.CARRIER_COST);

  const defenderBattleships = defenseFleet.battleships.mul(Const.BATTLESHIP_COST);
  const defenderDestroyers = defenseFleet.destroyers.mul(Const.DESTROYER_COST);
  const defenderCarriers = defenseFleet.carriers.mul(Const.CARRIER_COST);

    //  battleships > destroyers
    const battleshipsBeatsDestroyers = attackeBattleships.sub(defenderDestroyers);

    // destroyers > carriers
    const destroyersBeatsCarriers = attackeDestroyers.sub(defenderCarriers);

    // carriers > battleships
    const carriersBeatsBattleships = attackeCarriers.sub(defenderBattleships);

    const battleResult = battleshipsBeatsDestroyers.add(destroyersBeatsCarriers).add(carriersBeatsBattleships);

    const calculatedWinner = Provable.if(
      battleResult.greaterThanOrEqual(
        Field(0)
      ),
      defenseFleet.playerId,
      attackFleet.playerId
    );

    return calculatedWinner
} 
```


## Spawning Solar systems/Planets
Creating a universe that balances realism with engaging gameplay presents a unique challenge. 
We use Poseidon hash functions to generate planet coordinates, adjusting their rarity by modifying the number of leading zeros in the hash values. This method creates a randomized yet controlled distribution of planets, essential for gameplay dynamics. 

![alt text](images/spawn.png)


### Numerical Insights on spawning:

The scripts for the numerical tests is in `helpers/birthing.ts` 

**Initial Test**: On a 200 x 200 grid (40,000 locations), the number of planets varied significantly with the change in leading zeros:

* With one zero, 7,151 planets (17.8775%)
* With two zeros, 243 planets (0.60825%)

Increasing leading zeros requirement  further drastically reduced the number of planets.

## Mining Planets (Benchmarking)

The coordinates of planets are stored as private data and are not publicly disclosed.The only information available to the public is the Poseidon hash of these coordinates, leveraging the Poseidon.hash([x, y]) function, known for its efficiency in SNARK-friendly environments.

In a game arena, be it a square grid of dimensions N x N or a circle with radius R, the objective is to discover the private coordinates of all planets. This is achieved through identifying hash collisions - by generating and comparing the Poseidon hashes for every possible coordinate pair within the game's defined space.

The experiment at `helpers/exp/mining.ts` aims to determine the time frame necessary to uncover the coordinates of all planets via hash collisions. The findings from this experiment will be pivotal in defining the size of the search space (game world), ensuring it offers an adequate level of challenge while maintaining cryptographic integrity.

We also compare Poseidon with with Keccak 

#### Poseidon hashing on M1 Mac
* time taken to hash 100 coordinates: 29 ms
* time taken to hash 1000 coordinates: 253 ms
* time taken to hash 10000 coordinates: 2475 ms

#### Keccak256 hashing on M1 Mac
* time taken to hash 100 coordinates: 124 ms
* time taken to hash 1000 coordinates: 1043 ms
* time taken to hash 10000 coordinates: 10320 ms

Hashing with `Hash.SHA3_256.hash(bytes), Hash.SHA3_512.hash(bytes) and Hash.SHA3_384.hash(bytes)`, yielded similar results to keccak256 

Therefore, it might be better to use the Keccak hash to save planet locations publicly to add extra layer of protection. Ironically, because Keccak is less efficient, it yields better protection.

On [Shigoto-dev19](https://github.com/Shigoto-dev19)'s, recommenation, chain Poseidon hash, was experimented with is to create a final hash, where we hash a Field to itself N number of times to increase the hashing time.

#### Chain Poseidon hash on M1 Mac 
* time taken to hash 100 coordinates: 25062 ms

Therefore, We can arbitrarily increase the time needed to hash every co-ordinate to make this super hard for anyone to bruteforce all the co-ordinates in the map easily.

e.g. with a N of 100,000 -  hasing 100 co-ordinates will take more than 4 minutes. 

Thus, given a big enough universe, it would be quite hard for anyone to bruteforce all the co-ordinates.


## Game State

I came to a conclusion that the last game state design in the previous repository: [DarkForest_mina](https://github.com/enderNakamoto/Darkforest_Mina) was flawed and not quite working for our purposes. The idea of dividing up the contracts in three different parts and somehow composing them together, is not the best idea. 

Therefore, two different game state architectures were tried and tested:

### State Architecture 1: Putting the entire state in a Struct and Hashing it, 1 Merkle Tree per planet: 

The Game state in this scenario would be: 
Implementation - https://github.com/Cloakworks-collective/dark_armada/blob/main/contracts/src/DarkArmadaSingle.ts

```
    @state(Field) numberOfPlanets = State<Field>(); // Number of initalized planets

    @state(Field) playerNullifierRoot = State<Field>(); // Player nullifier MerkleMap root (playerAddress -> boolean)

    @state(Field) locationNullifierRoot = State<Field>(); // Planet nullifier MerkleMap root (coordinateHash -> boolean)

    @state(Field) detailsTreeRoot = State<Field>(); // Planet details MerkleTree root (index -> planetDetailsHash)

```
Note: the main Merkle Tree Root that holds all the data is `detailsTreeRoot`.

We have a struct `PlanetInfo`:

 ```
export class PlanetaryInfo extends Struct({
  owner: Field,
  locattionHash: Field,
  faction: Field,
  points: Field,
  defenseHash: Field,
  incomingAttackHash: Field
}) {}
```

Where, 
defenseHash is the Poseidon Hash of the struct 

```
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
```

and incomingAttackhash is the poseidon hash of the struct: 

```
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
```
Storing this in the merkle tree leaf and verifying the validity of the daata in all the functions works in theory. 

#### Issue with this structure (Architecture 1): 

After computing the battle result, both the defenderPlanet and attackingPlanet structs need to be updated. 

It is challenging. updating the merkle tree twice in one transaction with two different witnesses

- There are a couple of ways of solving it: 
Path 1 : https://github.com/o1-labs/o1js/issues/659

Use of Action/Reducer pattern does not quite work in a single method because once tree is updated, the secondWitness becomes stale, and the state is erroneously updated. 

and Path 2: https://github.com/berzanorg/o1js-merkle-double-witness

or 

https://github.com/o1-labs/o1js/issues/659#issuecomment-1360787468


- This seems a bit hacky. So I tried another approach to solve the issue: 

### State Architecture 2: Have multiple merkle trees divide up the data. 

Imoplementation - https://github.com/Cloakworks-collective/dark_armada/blob/main/contracts/src/DarkArmada.ts

In this method, the state looks like: 

```
@state(Field) numberOfPlanets = State<Field>(); // Number of initalized planets

  @state(Field) planetTreeRoot = State<Field>(); // Planet details MerkleTree root (index -> planetDetailsHash)

  @state(Field) ownershipTreeRoot = State<Field>(); // Planet ownership MerkleTree root (index -> playerAddress)

  @state(Field) defenseTreeRoot = State<Field>(); // Planetary defense MerkleTree root (index -> defenseHash)

  @state(Field) attackTreeRoot = State<Field>(); // Incoming attack MerkleTree root (index -> serializedAttack)

  @state(Field) playerNullifierRoot = State<Field>(); // Player nullifier MerkleMap root (playerAddress -> boolean)

  @state(Field) locationNullifierRoot = State<Field>(); // Planet nullifier MerkleMap root (coordinateHash -> boolean)

  @state(Field) detailsTreeRoot = State<Field>(); // Planet details MerkleTree root (index -> planetDetailsHash)
```

The 4 Merkle Tree Roots - planetTreeRoot,ownershipTreeRoot, defenseTreeRoot, and attackTreeRoot shares the same index, which is also synced with numberOfPlanets

e.g. Leaf 1n in ownerShipTree is the PlayerId of the player that owns the planet in Leaf 1n of PlanetTree.

Leaf 1n of Defense Tree is the Defense Hash of the same planet, and Lean 1n of Attrak Merkle Tree has the Incoming Attack on the same planet. 

Having multiple Merkle Trees makes it seemingly hard, but it also bypasses teh issue of having to use Action?reducer of state Architecture 1, which does not quite work! 

In the contracts, once you verify the ownership with Owner Tree for leaf `1n`, you can verify that you are the owner of all the data in all the `1n` leaves of other trees.

## Development Progress

* :white_check_mark: Mining Benchmark
* :white_check_mark: Spawning Benchmark
* :white_check_mark: Fleet ZKP
* :white_check_mark: Init Plamet ZKP
* :white_check_mark: Battle ZKP
* :white_check_mark: Contract Composition 
* :wrench: E2E Testing 
* :x: Game Simulation
* :x: UI - contract interaction
* :x: UI - Initiate planet 
* :x: UI - Mine for planet locations


## References 

* [Simple Game Explanation](https://trapdoortech.medium.com/dark-forest-one-interesting-game-with-zk-snark-technology-47528fa7691e)
* [ZK Global Game Overview](https://www.youtube.com/watch?v=nwUCccUS75k)
* [Original DF git repo](https://github.com/darkforest-eth)