// helper functions
// Just a pivot function 
function swap(lst, a, b) {
    var temp = lst[a];
    lst[a] = lst[b];
    lst[b] = temp;
};

// Given an number and create the random number 
function randomInt(n) {
    return Math.floor(Math.random() * n);
};

// returns boolean value the the random number is less than the rate.
function mutationRate(rate) {
    return Math.random() < rate;
};

// Permutation doubles as a strategy and a node in a trie
function Permutation(perm) { // perm -> given array. 
    this.children = [null, null, null, null];

    if (perm) { // if the perm isn't null then use the given perm 
        this.perm = perm;
    } else {
        var lst = [0, 1, 2, 3]; // 
        this.perm = [];
        while (lst.length > 0) { // add what's in lst into perm. 
            var index = randomInt(lst.length);
            this.perm.push(lst[index]);
            lst.splice(index, 1);
        }
    }
};

Permutation.prototype.clone = function () {
    // inherite from permutation function. 
    // create a new function that has the same code as the original function. 
    var perm = []; // make perm
    for (var i = 0; i < this.perm.length; i++) {
        perm.push(this.perm[i]); // add number that correlates w/ its index. 
    }
    return new Permutation(perm); // pass in the perm into new Permutation.
};

// custom method to permutation. 
Permutation.prototype.mutate = function () {
    // pick random two indexes in perm and swap them. 
    var a = randomInt(this.perm.length);
    var b = randomInt(this.perm.length);
    swap(this.perm, a, b);
};

// Trie stores different strategies based on last sequence of moves
function Trie() {
    this.root = new Permutation();
};

Trie.prototype.evalRecurse = function (prefix, perm) {
    //console.log("Recurse");
    //console.log(prefix);
    //console.log(perm.perm);
    //console.log(perm.children[0]);

    if (prefix.length > 0 && perm.children[prefix[0]] !== null) {
        var index = prefix[0];
        return this.evalRecurse(prefix.splice(0, 1), perm.children[index]);
    }
    else
        return perm;
};

Trie.prototype.evaluate = function (prefix) {
    return this.evalRecurse(prefix, this.root);
};

Trie.prototype.mutateRecurse = function (rate, perm, grow) {
    if (mutationRate(rate)) perm.mutate();
    var growChild = randomInt(perm.children.length);
    for (var i = 0; i < perm.children.length; i++) {
        if (perm.children[i] !== null) {
            var g = i === growChild && grow;
            this.mutateRecurse(rate, perm.children[i], g);
        } else {
            if (i === growChild) perm.children[i] = new Permutation();
        }
    }
};

Trie.prototype.mutate = function (rate) {
    var growTrie = mutationRate(rate);
    this.mutateRecurse(rate, this.root, growTrie);
};

Trie.prototype.cloneRecurse = function (perm) {
    var newPerm = perm.clone();
    for (var i = 0; i < perm.children.length; i++) {
        if (perm.children[i] !== null) {
            newPerm.children[i] = this.cloneRecurse(perm.children[i]);
        } else {
            newPerm.children[i] = null;
        }
    }
    return newPerm;
};

Trie.prototype.clone = function () {
    return new Trie(this.cloneRecurse(this.root));
};

function BlindAgent(trie) {
    this.actions = [];
    this.mutationRate = 0.10;

    this.score = 0;

    if (trie) {
        this.trie = trie;
    } else {
        this.trie = new Trie();
        this.trie.mutate(this.mutationRate);
    }
};

BlindAgent.prototype.selectMove = function () {
    if (this.actions.length > 200) this.actions.splice(100, 100);

    var action = this.trie.evaluate(this.actions);

    return action;
};

BlindAgent.prototype.cloneAndMutate = function () {
    var newTrie = this.trie.clone();
    newTrie.mutate(this.mutationRate);

    return new BlindAgent(newTrie);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
    this.score = 0;
};

AgentBrain.prototype.reset = function () {
    this.score = 0;
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    //console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function LookAheadAgent() {
    this.mutationRate = 0.10;

    this.functionList = [];
    this.genes = [];

    this.loadFunctions();

    for (var i = 0; i < this.functionList.length; i++) {
        this.genes.push(0);
    }

    this.score = 0;
};

LookAheadAgent.prototype.loadFunctions = function() {
    function emptyCells(gameManager) {
        var count = 0;
        function isEmpty(x, y, cell) {
            if (cell === null) count++;
        };

        gameManager.grid.eachCell(isEmpty);
        return count;
    };
    this.functionList.push(emptyCells);

    function score(gameManager) {
        var count = gameManager.score;

        return count;
    };
    this.functionList.push(score);

    var emptyCount = 0;
    function empty(gameManager) {
        var x = Math.floor(emptyCount / 4);
        var y = emptyCount % 4;
        emptyCount = (emptyCount + 1) % 16;
        if (gameManager.grid.cells[x][y] === null) return 0;
        else return 1;
    };

    for (var i = 0; i < 16; i++) {
        this.functionList.push(empty);
    }

    var tileCount = 0;
    function tile(gameManager) {
        var x = Math.floor(tileCount / 4);
        var y = tileCount % 4;
        tileCount = (tileCount + 1) % 16;
        var cell = gameManager.grid.cells[x][y];
        if (cell !== null) return Math.log(cell.value)/Math.LN2;
        else return 0;
    };

    for (var i = 0; i < 16; i++) {
        this.functionList.push(tile);
    }

    var upCount = 0;
    function up(gameManager) {
        var x = Math.floor(upCount / 4) + 1;
        var y = upCount % 4;
        upCount = (upCount + 1) % 12;
        var cell = gameManager.grid.cells[x][y];
        var cell2 = gameManager.grid.cells[x-1][y];
        if (cell && cell2 && cell.value === cell2.value) return 1;
        else return 0;
    };

    for (var i = 0; i < 12; i++) {
        this.functionList.push(up);
    }

    var leftCount = 0;
    function left(gameManager) {
        var x = Math.floor(leftCount / 3);
        var y = leftCount % 3 + 1;
        leftCount = (leftCount + 1) % 12;
        var cell = gameManager.grid.cells[x][y];
        var cell2 = gameManager.grid.cells[x][y-1];
        if (cell && cell2 && cell.value === cell2.value) return 1;
        else return 0;
    };

    for (var i = 0; i < 12; i++) {
        this.functionList.push(left);
    }

    var upCount2 = 0;
    function up2(gameManager) {
        var x = Math.floor(upCount2 / 4) + 1;
        var y = upCount2 % 4;
        upCount2 = (upCount2 + 1) % 12;
        var cell = gameManager.grid.cells[x][y];
        var cell2 = gameManager.grid.cells[x - 1][y];
        if (cell && cell2 && (cell.value * 2 === cell2.value || cell.value === cell2.value * 2)) return 1;
        else return 0;
    };

    for (var i = 0; i < 12; i++) {
        this.functionList.push(up2);
    }

    var leftCount2 = 0;
    function left2(gameManager) {
        var x = Math.floor(leftCount2 / 3);
        var y = leftCount2 % 3 + 1;
        leftCount2 = (leftCount2 + 1) % 12;
        var cell = gameManager.grid.cells[x][y];
        var cell2 = gameManager.grid.cells[x][y - 1];
        if (cell && cell2 && (cell.value * 2 === cell2.value || cell.value === cell2.value * 2)) return 1;
        else return 0;
    };

    for (var i = 0; i < 12; i++) {
        this.functionList.push(left2);
    }

    var maxCount = 0;
    function maxCell(gameManager) {
        var cellX = Math.floor(maxCount / 4);
        var cellY = maxCount % 4;

        var max = gameManager.grid.cells[0][0];
        var xMax = 0;
        var yMax = 0;

        function findMax(x, y, cell) {
            if (cell && cell.value > max) {
                max = cell.value;
                xMax = x;
                yMax = y;
            }
        };

        gameManager.grid.eachCell(findMax);

        return (cellX === xMax) && (cellY === yMax);
    };

    for (var i = 0; i < 16; i++) {
        this.functionList.push(maxCell);
    }

};

LookAheadAgent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    this.lastScore = gameManager.score;
    brain.score = this.lastScore;
    var action = -1;
    var max = Number.NEGATIVE_INFINITY;

    for (var i = 0; i < 4; i++) {
        if (brain.move(i)) {
            var score = Number.NEGATIVE_INFINITY;
            for (var j = 0; j < 4; j++) {
                if (j > 0) brain.move(i);
                if (brain.move(j)) {
                    var val = this.evaluateGrid(brain);
                    if (val > score) {
                        score = val;
                    }
                }
                brain.reset();
            }
            if (score === Number.NEGATIVE_INFINITY) score = this.evaluateGrid(brain);
            if (score > max) {
                max = score;
                action = i;
            }
     //       console.log("score: " + score + " max: " + max);
        } else {
  //          console.log("move failed " + i);
            //action++;
        }
        brain.reset();
    }
    if(action === -1) console.log(action);
    return action;
};

LookAheadAgent.prototype.evaluateGrid = function (gameManager) {
    var that = this;

    var count = 0;

    for (var i = 0; i < this.functionList.length; i++) {
        count += this.genes[i]*this.functionList[i](gameManager);
    }

    return count;
};

LookAheadAgent.prototype.cloneAndMutate = function () {
    var agent = new LookAheadAgent();

    for(var i = 0; i < this.functionList.length; i++) {
        var value = 0;
        if(this.mutationRate > Math.random())
            value = Math.random() > 0.5 ? 1 : -1; 
        agent.genes[i] = this.genes[i] + value;
    }
        
    return agent;
};

// This code runs the simulation and sends the selected moves to the game
function AgentManager(gameManager) {
    this.gameManager = gameManager;

    this.numAgents = 32;
    this.numRuns = 8;
    this.runs = 0;
    this.averageScore = 0;

    this.population = [];

    for (var i = 0; i < this.numAgents; i++) {
        this.population.push(new LookAheadAgent().cloneAndMutate());
    }

    this.agent = 0;
    this.gen = 0;
};

AgentManager.prototype.selectMove = function () {
    // 0: up, 1: right, 2: down, 3: left
    //if (this.gameManager.over) setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);
    //else
    //    if (!this.gameManager.move(this.agent.selectMove(this.gameManager))) console.log("bad move");

    // game over
    if (this.gameManager.over) {
        console.log("Agent " + this.agent + " Run " + this.runs + " Score " + this.gameManager.score);
        var score = this.gameManager.score;
        this.averageScore += score / this.numRuns;
        this.runs++;
        if (this.runs === this.numRuns) {
            this.population[this.agent].score = this.averageScore;
            this.averageScore = 0;
            this.runs = 0;
            console.log("Agent " + this.agent + " Averarge Score " + this.population[this.agent].score);
            console.log(this.population[this.agent].genes);
            this.agent++;
            if (this.agent === this.numAgents) {
                this.population.sort(function (a, b) {
                    return a.score - b.score;
                });

                for (var i = 0; i < this.numAgents; i++) {
                    console.log(this.population[i].score);
                }

                console.log("GENERATION " + this.gen++);
                console.log("Max Score " + this.population[this.population.length - 1].score);

                this.population.splice(0, this.numAgents / 2);
                var len = this.population.length;
                for (var i = 0; i < this.numAgents - this.numAgents / 2; i++) {
                    var index = randomInt(len);
                    this.population.push(this.population[index].cloneAndMutate());
                }

                this.agent = 0;
            }
        }
        
        setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);
    } else { // game ongoing
        var agent = this.population[this.agent];
        if (this.gameManager.won && !this.gameManager.keepPlaying) setTimeout(this.gameManager.keepPlaying.bind(this.gameManager), 1);
        else if (!this.gameManager.move(agent.selectMove(this.gameManager))) console.log("bad move");
    }
};


/**
 
 class UtilityFunctions {
  static swap(lst, a, b) {
    const temp = lst[a];
    lst[a] = lst[b];
    lst[b] = temp;
  }

  static randomInt(n) {
    return Math.floor(Math.random() * n);
  }

  static mutationRate(rate) {
    return Math.random() < rate;
  }
}

class Permutation {
  constructor(perm) {
    this.children = [null, null, null, null];
    this.perm = perm || this.generateRandomPermutation();
  }

  generateRandomPermutation() {
    const lst = [0, 1, 2, 3];
    const perm = [];
    while (lst.length > 0) {
      const index = UtilityFunctions.randomInt(lst.length);
      perm.push(lst[index]);
      lst.splice(index, 1);
    }
    return perm;
  }

  clone() {
    const perm = this.perm.slice();
    return new Permutation(perm);
  }

  mutate() {
    const a = UtilityFunctions.randomInt(this.perm.length);
    const b = UtilityFunctions.randomInt(this.perm.length);
    UtilityFunctions.swap(this.perm, a, b);
  }
}

class Trie {
  constructor() {
    this.root = new Permutation();
  }

  evalRecurse(prefix, per`````m) {
    if (prefix.length > 0 && perm.children[prefix[0]] !== null) {
      const index = prefix[0];
      return this.evalRecurse(prefix.slice(1), perm.children[index]);
    } else {
      return perm;
    }
  }

  evaluate(prefix) {
    return this.evalRecurse(prefix, this.root);
  }

  mutateRecurse(rate, perm, grow) {
    if (UtilityFunctions.mutationRate(rate)) perm.mutate();
    const growChild = UtilityFunctions.randomInt(perm.children.length);
    for (let i = 0; i < perm.children.length; i++) {
      if (perm.children[i] !== null) {
        const g = i === growChild && grow;
        this.mutateRecurse(rate, perm.children[i], g);
      } else if (i === growChild) {
        perm.children[i] = new Permutation();
      }
    }
  }

  mutate(rate) {
    const growTrie = UtilityFunctions.mutationRate(rate);
    this.mutateRecurse(rate, this.root, growTrie);
  }

  cloneRecurse(perm) {
    const newPerm = perm.clone();
    for (let i = 0; i < perm.children.length; i++) {
      if (perm.children[i] !== null) {
        newPerm.children[i] = this.cloneRecurse(perm.children[i]);
      } else {
        newPerm.children[i] = null;
      }
    }
    return newPerm;
  }

  clone() {
    return new Trie(this.cloneRecurse(this.root));
  }
}

class BlindAgent {
  constructor(trie) {
    this.actions = [];
    this.mutationRate = 0.10;
    this.score = 0;
    this.trie = trie || new Trie();
  }

  selectMove() {
    if (this.actions.length > 200) this.actions.splice(100, 100);
    const action = this.trie.evaluate(this.actions);
    return action;
  }

  cloneAndMutate() {
    const newTrie = this.trie.clone();
    newTrie.mutate(this.mutationRate);
    return new BlindAgent(newTrie);
  }
}

// Define other classes like AgentBrain, LookAheadAgent, and AgentManager similarly.

 */