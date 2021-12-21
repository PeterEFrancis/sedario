
"use strict";


const SQUARE = 100;

const EMPTY = 0;
const FILLED = 1;
const WHITE = 2;
const BLACK = 3;
const ARROW = 4;


function clone(arr) {
  return JSON.parse(JSON.stringify(arr));
}

function py_slice(arr, a, b) {
  // python-like slice method
  return arr.slice((a + arr.length) % arr.length, b ? (b + arr.length) % arr.length : arr.length);
}

function get_last(arr) {
  return arr[arr.length - 1];
}

function is_on_line(line, point) {
  return (line[0].y - point.y) * (line[0].x - line[1].x) === (line[0].y - line[1].y) * (line[0].x - point.x);
}






class State {

  constructor(n) {
    this.n = n;
    this.moves = {};
    this.moves[WHITE] = [];
    this.moves[BLACK] = [];
    this.current_player = WHITE;
    this.board = new Array(this.n * this.n).fill(EMPTY);
  }

  start(white, black) {
    if (white == black) {
      new Error("you can't place both pieces on the same square");
    }
    this.moves[WHITE].push(white);
    this.moves[BLACK].push(black);
    this.board[white] = WHITE;
    this.board[black] = BLACK;
  }

  _opponent() {
    return WHITE + BLACK - this.current_player;
  }

  switch_players() {
    this.current_player = this._opponent();
  }

  _mod(a) {
    return {
      x: a % this.n,
      y: Math.floor(a / this.n)
    }
  }

  _arrowize(_a, _b, _c) {
    // get arrow from last move a -> b, c

    let a = this._mod(_a);
    let b = this._mod(_b);
    let c = this._mod(_c);

    // if c is on the line, no arrow
    if (!is_on_line([a, b], c)) {

    }





  }

  set_from_combo_moves(combo_moves) {
    this.n = base_state.n;
    this.board = new Array(this.n * this.n).fill(EMPTY);

    let j = 0;
    for (let i = 0; i < combo_moves.length - 2; i++) {
      if (i % 2 === 0) {
        this.moves.white.push(combo_moves[i]);
      } else {
        this.moves.black.push(combo_moves[i]);
      }
      this.board[i] = FILLED;
    }

    this.board[get_last(this.moves[WHITE])] = WHITE;
    this.board[get_last(this.moves[BLACK])] = BLACK;

    this.current_player = combo_moves.length % 2 == 0 ? WHITE : BLACK;

    this._arrowize(
      ...py_slice(this.moves[this._opponent()], -2),
      get_last(this.moves[this.current_player])
    );

  }

  get_combo_moves() {
    let combo_moves = [];
    for (let i = 0; i < this.moves[WHITE].length + this.moves[BLACK].length; i++) {
      combo_moves.push(this.moves[i % 2 == 0 ? WHITE : BLACK][i]);
    }
    return combo_moves;
  }

  can_move_to(sq) {

  }

  move_to(square) {
    // assuming that this is an allowed move
    this.board[get_last(this.moves[this.current_player])] = FILLED;
    this.board[square] = this.current_player;
    this.moves[this.current_player].push(square);
    this._arrowize(
      ...py_slice(this.moves[this.current_player], -2),
      get_last(this.moves[this._opponent()])
    );
    this.switch_players();
  }



}













class ViewState {

  constructor(state, w, h) {
    this.n = state.n;
    this.state = state;

    this.hover_loc = null;

    this.size = SQUARE * this.n + 2 * (this.n + 1);

    this.canvas = document.createElement('canvas');
    this.canvas.style.backgroundColor = "#c7f9fc";
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.width = w;
    this.canvas.style.height = h;

    this.ctx = this.canvas.getContext('2d');

    this.click_handler = function(sq) {};
  }

  _get_loc(num) {
    let _x = num % this.n;
    let _y = Math.floor(num / this.n);
    return {
      x: 2 + _x * (SQUARE + 2) + (SQUARE / 2),
      y: 2 + _y * (SQUARE + 2) + (SQUARE / 2)
    }
  }


  update_display() {
    this.ctx.clearRect(0, 0, this.size, this.size);

    // add the grid lines
    this.ctx.fillStyle = "lightgrey";
    for (let i = 0; i < this.n + 1; i++) {
     this.ctx.fillRect(0, i * (SQUARE + 2), this.size, 2);
     this.ctx.fillRect(i * (SQUARE + 2), 0, 2, this.size);
    }

    // greyed out squares
    this.ctx.fillStyle = "#547172";
    let grey_squares = py_slice(this.state.moves[WHITE], 0, -1);
    grey_squares.push(...py_slice(this.state.moves[BLACK], 0, -1));
    for (let i = 0; i < grey_squares.length; i++) {
      let sq = this._get_loc(grey_squares[i]);
      this.ctx.fillRect(sq.x - (SQUARE / 2), sq.y - (SQUARE / 2), SQUARE, SQUARE);
    }

    // add markers
    this.ctx.shadowColor = "grey";
    this.ctx.shadowBlur = 7;
    this.ctx.shadowOffsetX = 4;
    this.ctx.shadowOffsetY = 4;
    for (let i = 0; i < 2; i++) {
      this.ctx.fillStyle = ['white', 'black'][i];
      let loc = this._get_loc(get_last(this.state.moves[[WHITE, BLACK][i]]));
      this.ctx.beginPath();
      this.ctx.arc(loc.x, loc.y, SQUARE / 3 , 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    //





    //    // suggestion squares
    //    if (document.getElementById('show_suggestions').checked) {
    //      // suggestions
    //      if (player_pos.length === 2) {
    //        if (can_move_to(p)) {
    //          var x = 100 * (p % 8) + 40;
    //          var y = 100 * Math.floor(p / 8) + 40;
    //          ctx.fillStyle = "lightgreen";
    //          ctx.fillRect(x, y, 20, 20);
    //        }
    //      }
    //    }
    //  }

  }



  get_DOM() {
    return this.canvas;
  }


  get_base_state() {
    return;
  }


}
