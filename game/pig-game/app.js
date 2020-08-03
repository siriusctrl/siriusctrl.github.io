/*
GAME RULES:

- The game has 2 players, playing in rounds
- In each turn, a player rolls a dice as many times as he whishes. Each result get added to his ROUND score
- BUT, if the player rolls a 1, all his ROUND score gets lost. After that, it's the next player's turn
- The player can choose to 'Hold', which means that his ROUND score gets added to his global score. After that, it's the next player's turn
- The first player to reach 100 points on GLOBAL score wins the game

*/
winningScore = 100;

// the game object
let gameState = {
  scores: [0, 0],
  roundScore: 0,
  activePlayer: 0,
  playing: true,
};

// init the games at the very beginning
initGame();

//add event listen to the roll-button
document.querySelector(".btn-roll").addEventListener("click", () => {
  if (gameState.playing) {
    // rolling all the dice
    document.querySelectorAll(".dice").forEach((item) => {
      let dice = Math.floor(Math.random() * 6) + 1;
      item.src = "dice-" + dice + ".png";
      item.style.display = "block";

      if (dice !== 1) {
        gameState.roundScore += dice;
      } else {
        gameState.roundScore = 0;
        changePlayer();
      }
    });

    document.getElementById("current-" + gameState.activePlayer).textContent =
      gameState.roundScore;
  } else {
    initGame();
  }
});

// add event listener to hold button
document.querySelector(".btn-hold").addEventListener("click", () => {
  if (gameState.playing) {
    // hide the dice
    document.querySelectorAll(".dice").forEach((item) => {
      item.style.display = "none";
    });

    winningScore = document.querySelector(".final-score").value
      ? document.querySelector(".final-score").value
      : 100;
    changePlayer();
  }
});

// add event listener to new game
document.querySelector(".btn-new").addEventListener("click", initGame);

/**
 * Init the game
 */
function initGame() {
  // reset winner and active state
  document.querySelector(".player-0-panel").classList.remove("winner");
  document.querySelector(".player-1-panel").classList.remove("winner");
  document.querySelector(".player-0-panel").classList.remove("active");
  document.querySelector(".player-1-panel").classList.remove("active");


  gameState.scores = [0, 0];
  gameState.roundScore = 0;
  gameState.activePlayer = Math.floor(Math.random() * 2); // start with random player
  gameState.playing = true;

  document
  .querySelector(".player-" + gameState.activePlayer + "-panel")
  .classList.add("active");

  // hide all dice at the beginning
  document.querySelectorAll(".dice").forEach((item) => {
    item.style.display = "none";
  });

  // reset the score and name
  document.getElementById("name-0").textContent    = "PLAYER 1";
  document.getElementById("name-1").textContent    = "PLAYER 2";
  document.getElementById("score-0").textContent   = gameState.scores[0];
  document.getElementById("score-1").textContent   = gameState.scores[1];
  document.getElementById("current-0").textContent = 0;
  document.getElementById("current-1").textContent = 0;
}

function changePlayer() {
  gameState.scores[gameState.activePlayer] += gameState.roundScore;
  gameState.roundScore = 0;
  document.getElementById("current-" + gameState.activePlayer).textContent = 0;
  document.getElementById("score-" + gameState.activePlayer).textContent =
    gameState.scores[gameState.activePlayer];

  if (gameState.scores[gameState.activePlayer] >= winningScore) {
    let winner = document.querySelector(
      ".player-" + gameState.activePlayer + "-panel"
    );
    winner.classList.add("winner");
    winner.classList.remove("active");
    winner.querySelector(".player-name").innerHTML = "<u>winner!</u>";
    document.querySelector(".dice").style.display = "none";
    gameState.playing = false;
  } else {
    // no winner, game continue
    document.querySelector(".player-0-panel").classList.toggle("active");
    gameState.activePlayer = Math.abs(gameState.activePlayer - 1);
    // need to change the DOM to reflect player change
    document.querySelector(".player-1-panel").classList.toggle("active");
  }
}
