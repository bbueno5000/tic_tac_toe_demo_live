"use strict";

var aiDelay = 1000;
var ais;
var game;
var paused = false;

$(function () {

    ais = {};
    ais[Ttt.X] = null;
    ais[Ttt.O] = null;

    var aiTimerId = undefined;
    var $board = $('#board');
    var boardCtx = $board[0].getContext('2d');
    var $oAiNeuralImport = $('#o-ai-neural-import');
    var $oControl = $('#o-control');
    var $pauseButton = $('#pause');
    var $restartButton = $('#restart');
    var $status = $('#status');
    var $stepButton = $('#step');
    var $undoButton = $('#undo');
    var $xAiNeuralImport = $('#x-ai-neural-import');
    var $xControl = $('#x-control');

    restart();

    function cancelAiMove() {
        if (typeof aiTimerId !== 'undefined') {
            window.clearInterval(aiTimerId);
            aiTimerId = undefined;
            clearStatus();
        }
    }

    function clearStatus() {
        $status.text($status.data('empty'));
    }

    function getSquare(x, y) {
        var col = (x - $board.offset().left) / $board.width() * 3 | 0;
        var row = (y - $board.offset().top) / $board.height() * 3 | 0;
        return col + row * 3;
    }

    function makeAiMove() {
        cancelAiMove();
        if (ais[game.turn] && game.winner() === 0) {
            var square = ais[game.turn].getMove(game);
            if (game.getPiece(square) !== 0) {
                throw new Error(
                    "AI chose invalid move " + square.toString() + " in " + game.toString()
                );
            }
            move(square);
        }
    }

    function move(square) {
        game.move(square);
        update();
    }

    function redraw(highlightPiece) {
        game.draw(boardCtx, $board.width(), $board.height(), 0, 0, highlightPiece);
    }

    function restart() {
        game = new Ttt.Game();
        update();
    }

    function scheduleAiMove() {
        if (typeof aiTimerId === 'undefined' && game.winner() === 0 && ais[game.turn] && !paused) {
            aiTimerId = window.setInterval(makeAiMove, aiDelay);
            $status.text($status.data('thinking'));
        }
    }

    function setPaused(p) {
        if (p !== paused) {
            paused = p;
            update();
        }
    }

    function undo() {
        if (game.history.length > 0) {
            game.undo();
            update();
        }
    }

    function update() {
        cancelAiMove();
        redraw();
        switch (game.winner()) {
        case Ttt.X: $status.text($status.data('winner-x')); break;
        case Ttt.O: $status.text($status.data('winner-o')); break;
        case Ttt.TIE: $status.text($status.data('tie')); break;
        default:
            if (ais[game.turn] && paused) {
                $status.text($status.data('paused'));
            }
            else {
                clearStatus();
            }
            break;
        }
        if ($xControl.val() === 'ai-neural') $xAiNeuralImport.removeAttr('disabled');
        else $xAiNeuralImport.attr('disabled', true);
        if ($oControl.val() === 'ai-neural') $oAiNeuralImport.removeAttr('disabled');
        else $oAiNeuralImport.attr('disabled', true);
        $pauseButton.val($pauseButton.data(paused ? 'paused' : 'unpaused'));
        scheduleAiMove();
    }

    function setAi(turn, ai) {
        ais[turn] = ai;
        update();
    }

    function setAiFromSelect(turn) {
        var ai = null;
        switch ((turn === Ttt.X ? $xControl : $oControl).val()) {
        case 'ai-random': ai = new Ai.Random(); break;
        case 'ai-easy': ai = new Ai.Smart(1); break;
        case 'ai-smart': ai = new Ai.Smart(); break;
        case 'ai-neural':
            var importBox = (turn === Ttt.X ? $xAiNeuralImport : $oAiNeuralImport);
            if (importBox.val().length > 0) {
                try {
                    var obj = $.parseJSON(importBox.val());
                    var net = Neural.Net.import(obj);
                    ai = new Ai.Neural(net);
                }
                catch (e) {
                    console.log(e.toString());
                    alert(e.toString());
                }
            }
            break;
        }
        setAi(turn, ai);
    }

    $board.click(function (event) {
        var square = getSquare(event.pageX, event.pageY);
        if (!ais[game.turn] && game.winner() === 0 && game.getPiece(square) === 0) {
            move(square);
        }
    });

    $board.mouseleave(function (event) {
        if (!ais[game.turn] && game.winner() === 0) {
            redraw();
        }
    });

    $board.mousemove(function (event) {
        if (!ais[game.turn] && game.winner() === 0) {
            redraw(getSquare(event.pageX, event.pageY));
        }
    });

    $oAiNeuralImport.change(function (event) {
        setAiFromSelect(Ttt.O);
    });

    $oControl.change(function (event) {
        setAiFromSelect(Ttt.O);
    });

    $pauseButton.click(function (event) {
        setPaused(!paused);
    });

    $restartButton.click(function (event) {
        restart();
    });

    $stepButton.click(function (event) {
        makeAiMove();
    });

    $undoButton.click(function (event) {
        undo();
    });

    $xAiNeuralImport.change(function (event) {
        setAiFromSelect(Ttt.X);
    });

    $xControl.change(function (event) {
        setAiFromSelect(Ttt.X);
    });
});