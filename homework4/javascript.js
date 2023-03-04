// Primary game object set within newGame
var game;
var shipValidation;
var useDynamic = false;
var showHint = false;

// Generate the board - done a single time
function buildBoard() {
    for (i = 1; i <= 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        board.appendChild(row);

        // Generate the column for this row
        for (j = 1; j <= 6; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute("name", i + '_' + j);
            cell.id = i + '_' + j;

            // Flex box doesn't like empty div so using empty space HTML
            cell.innerHTML = '&nbsp;';

            row.appendChild(cell);
        }
    }
}

// Begin a new game
function newGame() {
    // Setup default game information
    game = { cells: [], hits: [], sunk: 0, turn: 0, ships: 4, end: 20 };

    // Set turn counter
    turn_counter.innerText = (game.turn + 1) + " / " + game.end;

    // Generate listeners for the board cells
    generateListeners();

    // Clear any output and styling changes
    board.removeAttribute("style");
    message.innerText = "";
    game_status.innerText = "";
    game_status.className = "";
    game_message.innerText = "";

    // Clear all coloring
    let all_cells = document.getElementsByClassName('cell');
    Object.values(all_cells).forEach((element) => {
        element.className = 'cell';
    });

    // Determine dynamic ship placement
    if (useDynamic) {
        placeShips(generateShips());
        showShips();
    } else {
        fetch("ships.json")
            .then(response => response.json())
            .then(placeShips)
            .then(showShips);
    }
}

// Generate click listeners for all cells
function generateListeners() {
    for (i = 1; i <= 6; i++) {
        for (j = 1; j <= 6; j++) {
            // Create single-use click event listener
            const cell = document.getElementById(i + '_' + j);
            cell.removeEventListener("click", clickListener, { once: true }); // Remove any existing listeners
            cell.addEventListener("click", clickListener, { once: true });
        }
    }
}

// Cell listener function -- non-anonymous so usable for both add and remove
function clickListener() {
    checkCell(this);
}

// Place ships from ships JSON
function placeShips(ships) {
    ships.ships.forEach((ship) => {
        let row = ship.coords[0];
        let col = ship.coords[1];
        let rowlength, collength;

        if (ship.orientation == 'horizontal') {
            // Row does not change
            rowlength = row;
            collength = col + ship.size - 1;
        } else {
            // vertical - Col does not change
            rowlength = row + ship.size - 1;
            collength = col;
        }

        // Generate cell information
        for (i = row; i <= rowlength; i++) {
            for (j = col; j <= collength; j++) {
                game.cells[i + '_' + j] = ship.name;
            }
        }

        // Set up hits tracking
        game.hits[ship.name] = { 'hits': 0, 'size': ship.size };
    });
}

// Determine if ship was hit, miss, or sunk
function checkCell(element) {
    game.turn++;

    if (game.cells[element.id] === undefined) {
        // Shot missed
        element.classList.add('miss');
        message.innerText = "Shot missed!";
    } else {
        // Shot hit -- determine if sunk or not
        element.classList.add('hit');

        let ship_name = game.cells[element.id];
        delete game.cells[element.id];
        game.hits[ship_name].hits += 1;

        if (game.hits[ship_name].hits == game.hits[ship_name].size) {
            game.sunk++;
            message.innerText = "Ship was sunk!";
        } else {
            message.innerText = "Ship was hit!";
        }
    }

    // Determine end-game state (don't start checking until victory could occur)
    let game_over = false;
    if (game.turn >= 12) {
        if (game.sunk == game.ships) {
            game_over = true;
            board.setAttribute("style", "pointer-events:none");
            game_status.innerText = "You Win!";
            game_status.className = 'win';
            game_message.innerText = "You've sunk all of the ships!";

            // Color rest of grid
            colorEmptyCells();
        } else if (game.turn == game.end) {
            game_over = true;
            board.setAttribute("style", "pointer-events:none");
            game_status.innerText = "You Lose.";
            game_status.className = 'loss';
            game_message.innerText = "You've failed to sink all of the ships!";

            // Show rest of ships
            Object.keys(game.cells).forEach((id) => {
                const cell = document.getElementById(id);
                cell.classList.add('highlight');
            });

            // Color rest of grid
            colorEmptyCells();
        }
    }

    // Set turn counter
    if (!game_over) {
        if (game.turn != game.end) {
            turn_counter.innerText = (game.turn + 1) + " / " + game.end;
        }
    }
}

// Color empty cells at end-of-game
function colorEmptyCells() {
    let all_cells = document.getElementsByClassName('cell');
    Object.values(all_cells).forEach((element) => {
        if (!element.classList.contains('hit') && !element.classList.contains('miss') && !element.classList.contains('highlight')) {
            // Only class was 'cell'
            element.classList.add('empty');
        }
    });
}

// Enable or disable dynamic ships on newGame
function dynamicShips() {
    const dynamic = document.getElementById('dynamic');
    if (useDynamic == false) {
        useDynamic = true;
        dynamic.classList.add('button-pressed');
    } else {
        useDynamic = false;
        dynamic.classList.remove('button-pressed');
    }
}

// Enable or disable showing ship cells
function showHints() {
    const hint = document.getElementById('hint');
    if (showHint == false) {
        showHint = true;
        hint.innerText = "Hide Ships";
        hint.classList.add('button-pressed');
    } else {
        showHint = false;
        hint.innerText = "Show Ships";
        hint.classList.remove('button-pressed');
    }

    showShips();
}

// Show or hide all ship cells
function showShips() {
    Object.keys(game.cells).forEach((id) => {
        const cell = document.getElementById(id);
        if (showHint) {
            cell.classList.add('hint');
        } else {
            cell.classList.remove('hint');
        }
    });
}

/**
 * Attempt to generate ships dynamically
 * 
 * Rules for placement:
 * 
 * name: unique (shipN)
 * orientation: "horizontal" | "vertical"
 * size: 1x 2, 2x 3, 1x 4
 * coords: [X,Y] -- 1-6
*/
function generateShips() {
    var ships = { "ships": [] }

    // Generate validation information
    shipValidation = [];
    for (i = 1; i <= 6; i++) {
        for (j = 1; j <= 6; j++) {
            shipValidation[i + '_' + j] = false;
        }
    }

    // Generate the ships
    for (i = 1; i <= 4; i++) {
        let orientation = (getRandomInt(2) == 1) ? 'horizontal' : 'vertical';
        let size, coords;

        if (i == 1) {
            size = 4;
        } else if (i == 2) {
            size = 2;
        } else {
            size = 3;
        }

        do {
            // Generate and validate coordinates
            coords = getCoordinates(size, orientation);
        } while (!validCoords(coords, size, orientation));

        let ship = {
            name: "ship" + i,
            orientation: orientation,
            size: size,
            coords: coords
        }

        ships.ships.push(ship);
    }

    return ships;
}

// Helper function for random Integer values
function getRandomInt(max) {
    return Math.floor(Math.random() * max) + 1;
}

// Helper function to generate starting coordinates
function getCoordinates(size, orientation) {
    if (size == 4) {
        if (orientation == 'horizontal') {
            return [getRandomInt(6), getRandomInt(3)];
        } else {
            return [getRandomInt(3), getRandomInt(6)];
        }
    } else if (size == 2) {
        if (orientation == 'horizontal') {
            return [getRandomInt(6), getRandomInt(5)];
        } else {
            return [getRandomInt(5), getRandomInt(6)];
        }
    } else { // size == 3
        if (orientation == 'horizontal') {
            return [getRandomInt(6), getRandomInt(4)];
        } else {
            return [getRandomInt(4), getRandomInt(6)];
        }
    }
}

// Valication function to determine unique coordinates
function validCoords(coords, size, orientation) {
    let row = coords[0], col = coords[1];
    let rowlength, collength;

    if (orientation == 'horizontal') {
        // Row does not change
        rowlength = row;
        collength = col + size - 1;
    } else {
        // vertical - Col does not change
        rowlength = row + size - 1;
        collength = col;
    }

    // Check validation information
    for (a = row; a <= rowlength; a++) {
        for (b = col; b <= collength; b++) {
            if (shipValidation[a + '_' + b]) {
                return false;
            }
        }
    }

    // Store for later checks
    for (a = row; a <= rowlength; a++) {
        for (b = col; b <= collength; b++) {
            shipValidation[a + '_' + b] = true;
        }
    }

    return true;
}