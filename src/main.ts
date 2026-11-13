// Entry point, loaded by index.html. The game is defined in src/game/ and
// played by the GameManager (src/core/manager/).
import { createGame } from './core/manager/createGame';
import { GAME } from './game/game';
import { DESCRIPTORS, EPISODES } from './game/registry';
import { RUNTIMES } from './game/runtimes';

void createGame({ game: GAME, episodes: EPISODES, descriptors: DESCRIPTORS, runtimes: RUNTIMES });
