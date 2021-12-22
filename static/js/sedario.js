
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
  return (line[0].r - point.r) * (line[0].c - line[1].c) === (line[0].r - line[1].r) * (line[0].c - point.c);
}






class State {

  constructor(n) {
    this.n = n;
    this.moves = {};
    this.moves[WHITE] = [];
    this.moves[BLACK] = [];
    this.current_player = WHITE;
    this.board = new Array(this.n * this.n).fill(EMPTY);
    this.arrow = [];
    this.possible_moves = [];
  }

  start(white, black) {
    if (white == black) {
      new Error("you can't place both pieces on the same square");
    }
    this.moves[WHITE].push(white);
    this.moves[BLACK].push(black);
    this.board[white] = WHITE;
    this.board[black] = BLACK;
    this._find_possible_moves();
  }

  _opponent() {
    return WHITE + BLACK - this.current_player;
  }

  _switch_players() {
    this.current_player = this._opponent();
  }

  _mod(a) {
    return {
      c: a % this.n,
      r: Math.floor(a / this.n)
    }
  }

  _sq(r, c) {
    return c + this.n * r;
  }

  _arrowize(_a, _b, _c) {
    // get arrow from last move a -> b, c

    let a = this._mod(_a);
    let b = this._mod(_b);
    let c = this._mod(_c);

    // remove arrow
    for (let i = 0; i < this.arrow.length; i++) {
      this.board[this.arrow[i]] -= ARROW;
    }

    this.arrow = [];

    // if c is on the line, no arrow. Otherwise, make a new arrow
    if (!is_on_line([a, b], c)) {
      for (let i = 0; i < this.n * this.n; i++) {
        if (is_on_line([a, b], this._mod(i))) {
          this.arrow.push(i);
          this.board[i] += ARROW;
        }
      }
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

  _find_possible_moves() {
    this.possible_moves = [];
    let current_mod = this._mod(get_last(this.moves[this.current_player]));
    const dirs = [
      [1, 0], // 0      right
      [1, 1], // 1      right down
      [0, 1], // 2      down
      [-1, 1], // 3     left down
      [-1, 0], // 4     left
      [-1, -1], // 5    left up
      [0, -1], // 6     up
      [1, -1] // 7      right up
    ];
    for (let d = 0; d < dirs.length; d++) {
      let r = current_mod.r + dirs[d][0];
      let c = current_mod.c + dirs[d][1];
      while (c >= 0 && c < this.n && r >= 0 && r < this.n) {
        let sq = this._sq(r, c);
        if (
          (this.board[sq] != EMPTY)
          || ((d == 1) && this.arrow.includes(sq + this.n) && this.arrow.includes(sq + 1)) // moving down + right
          || ((d == 3) && this.arrow.includes(sq + this.n) && this.arrow.includes(sq - 1)) // moving down + left
          || ((d == 5) && this.arrow.includes(sq - this.n) && this.arrow.includes(sq - 1)) // moving up + left
          || ((d == 7) && this.arrow.includes(sq - this.n) && this.arrow.includes(sq + 1)) // moving up + right
        ) {
          break;
        }

        this.possible_moves.push(sq);
        r += dirs[d][0];
        c += dirs[d][1];
      }
    }
  }

  can_move_to(sq) {
    return this.possible_moves.includes(sq);
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
    this._switch_players();
    this._find_possible_moves();
  }

}







class ViewState {

  constructor(state, w, h) {
    this.n = state.n;
    this.state = state;

    this.hover_loc = null;

    this.size = SQUARE * this.n + 2 * (this.n + 1);

    this.click_handler = function() {};

    this.canvas = document.createElement('canvas');
    this.canvas.style.backgroundColor = "#c7f9fc";
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.width = w;
    this.canvas.style.height = h;
    const t = this;
    this.canvas.addEventListener('click', function(evt) {
      let rect = t.canvas.getBoundingClientRect();
      let x = (evt.clientX - rect.left) * (t.canvas.width / t.canvas.clientWidth);
      let y = (evt.clientY - rect.top) * (t.canvas.height / t.canvas.clientHeight);
      let r = (y - (y % (SQUARE + 2))) / (SQUARE + 2);
      let c = (x - (x % (SQUARE + 2))) / (SQUARE + 2);
      let sq = t.state._sq(r, c);
      if (t.state.can_move_to(sq)) {
        t.state.move_to(sq);
        t.update_display();
        t.click_handler();
      }
    });

    this.ctx = this.canvas.getContext('2d');
  }

  _get_loc(sq) {
    let mod = this.state._mod(sq);
    return {
      x: 2 + mod.c * (SQUARE + 2) + (SQUARE / 2),
      y: 2 + mod.r * (SQUARE + 2) + (SQUARE / 2)
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

    // add suggestion squares
    this.ctx.fillStyle = "lightgreen";
    for (let i = 0; i < this.state.possible_moves.length; i++) {
      let loc = this._get_loc(this.state.possible_moves[i]);
      this.ctx.fillRect(loc.x - SQUARE / 8, loc.y - SQUARE / 8, SQUARE / 4, SQUARE / 4);
    }

  }



  get_DOM() {
    return this.canvas;
  }


  get_base_state() {
    return;
  }


}
