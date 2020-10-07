var Ai = (function (Ai) {

    "use strict";

    Neural.prototype.getMoves = function Neural_getMoves(game) {
        var that = this;
        return topScoring(game.emptySquares(), function (move) {
            var board = Ttt.move(game.board, move, game.turn);

            that.net.reset();
            var outputs = that.net.run(getInputs(board, game.turn));
            return outputs[0];
        }).moves;
    };

    Random.prototype.getMove = Ai_getMove;

    Random.prototype.getMoves = function Random_getMoves(game) {
        return game.emptySquares();
    };

    Smart.evaluate = function Smart_evaluate(board, winner) {
        winner = (typeof winner === 'undefined' ? Ttt.winner(board) : winner);
        if (winner) {
            return sign(winner === Ttt.TIE ? 0 : winner) * 100;
        }
        return countNearWins(board) * 10 + countPotentialWins(board);
    };

    // We pick randomly from among the best moves available.
    // Adding a random element keeps the opponent on their toes.
    Smart.prototype.getMove = Ai_getMove;

    Smart.prototype.getMoves = function Smart_getMoves(game) {
        if (Ttt.isEmpty(game.board)) {
            return [4];
        }
        if (Ttt.emptySquares(game.board).length === 8) {
            return getSecondMoves(game.board);
        }
        return this.negamax(game.board, game.turn, 0);
    };

    // Basic negamax implementation, with a few modifications
    // (see <http://en.wikipedia.org/wiki/Negamax> or <http://www.hamedahmadi.com/gametree/>).
    // We don't use alpha-beta pruning because we don't just want to find the
    // first valid move with the best score,
    // we want to find all valid moves with the same (and best) score,
    // so we can choose among them.
    // We pick from the best scoring moves with a simple heuristic (see resolveTies()).
    // Because we also use this to instruct us as to which move to make,
    // if we're at the top level we return the list of best moves instead of their score.
    Smart.prototype.negamax = function Smart_negamax(board, turn, depth) {
        var winner = Ttt.winner(board);
        if (depth === this.maxDepth || winner) {
            return sign(turn) * Smart.evaluate(board, winner);
        }
        var that = this;
        var topScore = topScoring(Ttt.emptySquares(board), function (move) {
            return -that.negamax(
                Ttt.move(board, move, turn),
                (turn === Ttt.X ? Ttt.O : Ttt.X),
                depth + 1
            );
        });
        return (depth ? topScore.score : resolveTies(board, topScore.moves, turn)
        );
    };

    function Neural(net) {
        this.net = net;
    }

    function Random() { }

    /**
     * An AI that plays the game with some intelligence.  With maxDepth 7, it
     * plays a perfect game.  With maxDepth 1, it simply picks the move that
     * looks best without looking into the future.  Because it's such a simple
     * game and we've tweaked the evaluation function to be pretty decent, it
     * often makes the same move in either case.
     * 
     * @param {any} maxDepth
     */
    function Smart(maxDepth) {
        this.maxDepth = maxDepth || 7;
    }

    function Ai_getMove(game) {
        return arrayRand(this.getMoves(game));
    }

    function arrayRand(a) {
        return a[Math.floor(Math.random() * a.length)];
    }

    function blocksOpponent(board, move, turn) {
        var opponent = (turn === Ttt.X ? Ttt.O : Ttt.X);
        return (countNearWinsForPlayer(Ttt.move(board, move, turn), opponent)
            < countNearWinsForPlayer(board, opponent)
        );
    }

    function countNearWins(board) {
        return countScoringMoves(board, function (a, b, c) {
            var sum = sign(a) + sign(b) + sign(c);
            return (Math.abs(sum) === 2 ? (sum > 0 ? 1 : -1) : 0);
        });
    }

    function countNearWinsForPlayer(board, player) {
        return countScoringMoves(board, function (a, b, c) {
            var sum = sign(a) + sign(b) + sign(c);
            return (Math.abs(sum) === 2 && sum / 2 === sign(player) ? 1 : 0);
        });
    }

    function countPotentialWins(board) {
        return countScoringMoves(board, function (a, b, c) {
            a = sign(a);
            b = sign(b);
            c = sign(c);
            var sum = a + b + c;
            return (Math.abs(sum) === 1 && (!a || !b || !c) ? sum : 0);
        });
    }

    function countScoringMoves(board, scorer) {
        var pieces = Ttt.toArray(board);
        var scoringMoves = 0;
        for (var i = 0; i < 3; ++i) {
            scoringMoves += scorer(
                pieces[i * 3 + 0],
                pieces[i * 3 + 1],
                pieces[i * 3 + 2]
            );
            scoringMoves += scorer(
                pieces[i + 0],
                pieces[i + 3],
                pieces[i + 6]
            );
        }
        scoringMoves += scorer(pieces[0], pieces[4], pieces[8]);
        scoringMoves += scorer(pieces[2], pieces[4], pieces[6]);
        return scoringMoves;
    }

    function getInputs(board, turn) {
        var inputs = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 9; ++i) {
            var piece = Ttt.getPiece(board, i);
            if (piece === turn) {
                inputs[i * 2] = 1;
            }
            else if (piece) {
                inputs[i * 2 + 1] = 1;
            }
        }
        return inputs;
    }

    function getSecondMoves(board) {
        if (Ttt.getPiece(board, 4)) {
            return [0, 2, 6, 8];
        }
        return [4];
    }

    /**
     * The moves are all equal as far as negamax is concerned,
     * so we've got to choose the best one to play now.
     * If any moves are are an immediate win, we return them.
     * Otherwise, we choose moves blocking an opponent's win,
     * then we just pick the square with the highest evaluation.
     * 
     * @param {any} board
     * @param {any} moves
     * @param {any} turn
     */
    function resolveTies(board, moves, turn) {
        if (moves.length > 1) {
            var win = false;
            moves = topScoring(moves, function (move) {
                if (Ttt.winner(Ttt.move(board, move, turn)) === turn) {
                    win = true;
                    return 1;
                }
                return 0;
            }).moves;
            if (win) {
                return moves;
            }
        }
        if (moves.length > 1) {
            moves = topScoring(moves, function (move) {
                return (blocksOpponent(board, move, turn) ? 1 : 0);
            }).moves;
        }
        if (moves.length > 1) {
            moves = topScoring(moves, function (move) {
                return (sign(turn)
                    * Smart.evaluate(Ttt.move(board, move, turn))
                );
            }).moves;
        }
        return moves;
    }

    function sign(piece) {
        return (piece === 0 ? 0 : (piece === Ttt.X ? 1 : -1));
    }

    function topScoring(moves, evaluator) {
        var max = -Infinity;
        var top = [];
        moves.forEach(function (move) {
            var value = evaluator(move);
            if (value > max) {
                max = value;
                top = [move];
            }
            else if (value === max) {
                top.push(move);
            }
        });
        return {
            score: max,
            moves: top
        };
    }

    Neural.prototype.getMove = Ai_getMove;
    Ai.Random = Random;
    Ai.Smart = Smart;
    Ai.Neural = Neural;
    return Ai;

}(Ai || {}));