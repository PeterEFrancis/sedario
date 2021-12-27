
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

  _set_arrow(arrow) {
    // remove old arrow
    for (let i = 0; i < this.arrow.length; i++) {
      this.board[this.arrow[i]] -= ARROW;
    }

    this.arrow = arrow;

    // set new arrow
    for (let i = 0; i < this.arrow.length; i++) {
      this.board[this.arrow[i]] += ARROW;
    }

  }

  _arrowize(sq_a, sq_b, sq_c) {
    // get arrow from last move a -> b, c

    let a = this._mod(sq_a);
    let b = this._mod(sq_b);
    let c = this._mod(sq_c);

    let arrow = [];

    // if c is on the line, no arrow. Otherwise, make a new arrow
    if (!is_on_line([a, b], c)) {
      for (let i = 0; i < this.n * this.n; i++) {
        if (is_on_line([a, b], this._mod(i))) {
          arrow.push(i);
        }
      }
    }

    return arrow;
  }

  set_from_combo_moves(combo_moves) {
    this.board = new Array(this.n * this.n).fill(EMPTY);

    for (let i = 0; i < combo_moves.length; i++) {
      if (i % 2 === 0) {
        this.moves[WHITE].push(combo_moves[i]);
      } else {
        this.moves[BLACK].push(combo_moves[i]);
      }
      this.board[combo_moves[i]] = FILLED;
    }

    this.board[get_last(this.moves[WHITE])] = WHITE;
    this.board[get_last(this.moves[BLACK])] = BLACK;

    this.current_player = combo_moves.length % 2 == 0 ? WHITE : BLACK;

    if (this.moves[this._opponent()].length >= 2) {
      let arrow = this._arrowize(
        ...py_slice(this.moves[this._opponent()], -2),
        get_last(this.moves[this.current_player])
      );
      this._set_arrow(arrow);
    }
    this._find_possible_moves();
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
    if (this.moves[this.current_player].length == 0) {
      for (let i = 0; i < this.board.length; i++) {
        if (this.board[i] === EMPTY) {
          this.possible_moves.push(i);
        }
      }
    } else {
      let current_mod = this._mod(get_last(this.moves[this.current_player]));
      const dirs = [
        [1, 0],   // 0    down
        [1, 1],   // 1    right down
        [0, 1],   // 2    right
        [-1, 1],  // 3    right up
        [-1, 0],  // 4    up
        [-1, -1], // 5    left up
        [0, -1],  // 6    left
        [1, -1]   // 7    left down
      ];
      for (let d = 0; d < dirs.length; d++) {
        let r = current_mod.r + dirs[d][0];
        let c = current_mod.c + dirs[d][1];
        while (c >= 0 && c < this.n && r >= 0 && r < this.n) {
          let sq = this._sq(r, c);
          if (
            (this.board[sq] != EMPTY)
            || ((d == 1) && this.arrow.includes(sq - this.n) && this.arrow.includes(sq - 1)) // moving down + right
            || ((d == 3) && this.arrow.includes(sq + this.n) && this.arrow.includes(sq - 1)) // moving up + right
            || ((d == 5) && this.arrow.includes(sq + this.n) && this.arrow.includes(sq + 1)) // moving up + left
            || ((d == 7) && this.arrow.includes(sq - this.n) && this.arrow.includes(sq + 1)) // moving down + left
          ) {
            break;
          }
          this.possible_moves.push(sq);
          r += dirs[d][0];
          c += dirs[d][1];
        }
      }
    }
  }

  can_move_to(sq) {
    return this.possible_moves.includes(sq) || (this.moves[this.current_player].length == 0 && this.board[sq] == EMPTY);
  }

  move_to(square) {
    // assuming that this is an allowed move
    let first_placing = this.moves[this.current_player].length == 0;
    if (!first_placing) {
      this.board[get_last(this.moves[this.current_player])] = FILLED;
    }
    this.board[square] = this.current_player;
    this.moves[this.current_player].push(square);
    if (!first_placing) {
      let arrow = this._arrowize(
        ...py_slice(this.moves[this.current_player], -2),
        get_last(this.moves[this._opponent()])
      );
      this._set_arrow(arrow);
    }
    this._switch_players();
    this._find_possible_moves();
  }

}








class ViewState {

  constructor(state, one_sided) {
    this.n = state.n;
    this.state = state;

    this.one_sided = one_sided; // ommit for False

    this.hover_sq = null;

    this.size = SQUARE * this.n + 2 * (this.n + 1);

    this.click_handler = function() {};

    this.canvas = document.createElement('canvas');
    this.canvas.style.backgroundColor = "#c7f9fc";
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.maxWidth = "100%";
    const t = this;
    this.canvas.addEventListener('click', function(evt) {
      let sq = t._get_sq_from_evt(evt);
      if (
        t.state.can_move_to(sq) &&
        (!t.one_sided || t.one_sided == t.state.current_player)
      ) {
        t.state.move_to(sq);
        t.update_display();
        t.click_handler(sq);
        t.hover_loc = null;
      }
    });

    this.canvas.addEventListener('mousemove', function(evt) {
      let sq = t._get_sq_from_evt(evt);
      if (t.state.can_move_to(sq)) {
        t.hover_sq = sq;
      } else {
        t.hover_sq = null;
      }
      if (t.state.possible_moves.length > 0) {
        t.update_display();
      }
    });

    this.canvas.addEventListener('mouseout', function(evt) {
      t.hover_sq = null;
      if (t.state.possible_moves.length > 0) {
        t.update_display();
      }
    });

    this.ctx = this.canvas.getContext('2d');
  }

  _get_sq_from_evt(evt) {
    let rect = this.canvas.getBoundingClientRect();
    let x = (evt.clientX - rect.left) * (this.canvas.width / this.canvas.clientWidth);
    let y = (evt.clientY - rect.top) * (this.canvas.height / this.canvas.clientHeight);
    let r = (y - (y % (SQUARE + 2))) / (SQUARE + 2);
    let c = (x - (x % (SQUARE + 2))) / (SQUARE + 2);
    return this.state._sq(r, c);
  }

  _get_loc_from_mod(mod) {
    return {
      x: 2 + mod.c * (SQUARE + 2) + (SQUARE / 2),
      y: 2 + mod.r * (SQUARE + 2) + (SQUARE / 2)
    }
  }

  _get_loc_from_sq(sq) {
    let mod = this.state._mod(sq);
    return this._get_loc_from_mod(mod);
  }

  _get_arrow_info(arrow) {
    let mods = arrow.map(x => this.state._mod(x));
    let mod_cs = mods.map(x => x.c);
    let mod_rs = mods.map(x => x.r);
    let a_c = Math.min(...mod_cs);
    let a_r = Math.min(...mod_rs);
    let b_c = Math.max(...mod_cs);
    let b_r = Math.max(...mod_rs);
    let a_loc = this._get_loc_from_mod({c:a_c, r:a_r});
    let b_loc = this._get_loc_from_mod({c:b_c, r:b_r});
    if (a_r == b_r) { // horizontal
      return {
        start: {x: 0, y: a_loc.y},
        end: {x: this.size, y: a_loc.y}
      };
    } else if (a_c == b_c) { // vertical
      return {
        start: {x: a_loc.x, y: 0},
        end: {x: a_loc.x, y: this.size},
      };
    } else if (arrow.includes(a_c + this.n * a_r)) { // slanted down
      return {
        start: {x: a_loc.x - SQUARE / 2, y: a_loc.y - SQUARE / 2},
        end: {x: b_loc.x + SQUARE / 2, y: b_loc.y + SQUARE / 2},
      };
    } else { // slanted up
      return {
        start: {x: a_loc.x - SQUARE / 2, y: b_loc.y + SQUARE / 2},
        end: {x: b_loc.x + SQUARE / 2, y: a_loc.y - SQUARE / 2}
      };
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
      let sq = this._get_loc_from_sq(grey_squares[i]);
      this.ctx.fillRect(sq.x - (SQUARE / 2), sq.y - (SQUARE / 2), SQUARE, SQUARE);
    }

    // add markers
    this.ctx.shadowColor = "grey";
    this.ctx.shadowBlur = 7;
    this.ctx.shadowOffsetX = 4;
    this.ctx.shadowOffsetY = 4;
    for (let i = 0; i < 2; i++) {
      this.ctx.fillStyle = ['white', 'black'][i];
      let loc = this._get_loc_from_sq(get_last(this.state.moves[[WHITE, BLACK][i]]));
      this.ctx.beginPath();
      this.ctx.arc(loc.x, loc.y, SQUARE / 2.5 , 0, 2 * Math.PI);
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;

    // draw arrow
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 4;
    if (this.state.arrow != []) {
      let arrow_info = this._get_arrow_info(this.state.arrow);
      this.ctx.beginPath();
      this.ctx.moveTo(arrow_info.start.x, arrow_info.start.y);
      this.ctx.lineTo(arrow_info.end.x, arrow_info.end.y);
      this.ctx.stroke();
    }

    if (!this.one_sided || this.one_sided == this.state.current_player) {
      // add suggestion squares
      this.ctx.fillStyle = "lightgreen";
      for (let i = 0; i < this.state.possible_moves.length; i++) {
        let loc = this._get_loc_from_sq(this.state.possible_moves[i]);
        this.ctx.fillRect(loc.x - SQUARE / 8, loc.y - SQUARE / 8, SQUARE / 4, SQUARE / 4);
      }

      // hover
      if (this.hover_sq != null) {
        // hover piece
        this.ctx.fillStyle = this.state.current_player == WHITE ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
        let loc = this._get_loc_from_sq(this.hover_sq);
        this.ctx.beginPath();
        this.ctx.arc(loc.x, loc.y, SQUARE / 2.5 , 0, 2 * Math.PI);
        this.ctx.fill();

        // hover arrow
        this.ctx.strokeStyle = "grey";
        this.ctx.lineWidth = 2;
        let arrow = this.state._arrowize(
          get_last(this.state.moves[this.state.current_player]),
          this.hover_sq,
          get_last(this.state.moves[this.state._opponent()]),
        );
        if (arrow != []) {
          let arrow_info = this._get_arrow_info(arrow);
          this.ctx.beginPath();
          this.ctx.moveTo(arrow_info.start.x, arrow_info.start.y);
          this.ctx.lineTo(arrow_info.end.x, arrow_info.end.y);
          this.ctx.stroke();
        }
      }

    }

    // if won
    if (this.state.possible_moves.length === 0) {
      let crown = new Image();
      const t = this;
      const loc = this._get_loc_from_sq(get_last(this.state.moves[this.state._opponent()]));
      this.ctx.fillStyle = "yellow";
      this.ctx.strokeStyle = "black";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(loc.x-29, loc.y-15);
      let points = [[-25, 18], [25, 18], [29, -15], [14, 1], [0, -15], [-14, 1]];
      for (let i = 0; i < points.length; i++) {
        this.ctx.lineTo(loc.x + points[i][0], loc.y + points[i][1]);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else if (!this.one_sided || this.one_sided == this.state.current_player) {
      // red dot
      this.ctx.fillStyle = 'red';
      let loc = this._get_loc_from_sq(get_last(this.state.moves[this.state.current_player]));
      this.ctx.beginPath();
      this.ctx.arc(loc.x, loc.y, SQUARE / 10 , 0, 2 * Math.PI);
      this.ctx.fill();
    }



  }

  sheen(sec) {
    this.ctx.fillStyle = "rgba(0,0,0,0.01)";
    const t = this;
    var i = 0;
    const int = setInterval(function() {
      t.ctx.fillRect(0, 0, t.canvas.width, t.canvas.height);
      i += 1;
      if (i == 100) {
        clearInterval(int);
      }
    }, sec * 1000 / 100);
  }

  get_DOM() {
    return this.canvas;
  }

  is_current_player() {
    return this.one_sided && (this.one_sided == this.state.current_player);
  }

}
