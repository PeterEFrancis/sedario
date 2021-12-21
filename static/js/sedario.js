const SQUARE = 100;

const EMPTY = 0;
const FILLED = 1;
const WHITE = 2;
const BLACK = 3;


function clone(arr) {
  return JSON.parse(JSON.stringify(arr));
}


class BaseState {

  constructor(n) {
    this.n = n;
    this.moves = []
  }

}




class State {

  constructor(n) {
    this.n = n;
    this.white = [];
    this.black = [];

    this.arrow = [];

    this.board = new Array(this.n * this.n).fill(EMPTY);
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
    if ((a.y - c.y) * (a.x - b.x) == (a.y - b.y) * (a.x - c.x)) {
      this.arrow = [];
    } else {
      this.arrow = [a, b];
    }
  }

  set_from_base_state(base_state) {
    this.n = base_state.n;
    this.board = new Array(this.n * this.n).fill(EMPTY);

    for (let i = 0; i < base_state.moves.length - 2; i++) {
      if (i % 2 == 0) {
        this.white.push(base_state.moves[i]);
      } else {
        this.black.push(base_state.moves[i]);
      }
      this.board[i] = FILLED;
    }

    this.board[this.white[this.white.length - 1]] = WHITE;
    this.board[this.black[this.black.length - 1]] = BLACK;

    if (this.black.length > this.white.length) {
      this._arrowize(...this.black.slice(this.black.length - 2), this.white[this.white.length - 1]);
    } else {
      this._arrowize(...this.white.slice(this.black.length - 2), this.black[this.black.length - 1]);
    }
  }





}







class ViewState {

  constructor(state, w, h) {
    this.n = state.n;
    this.white = clone(state.white);
    this.black = clone(state.black);

    this.hover_loc = [];

    this.size = SQUARE * this.n + 2 * (this.n + 1);

    this.canvas = document.createElement('canvas');
    this.canvas.style.backgroundColor = "#c7f9fc";
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.width = w;
    this.canvas.style.height = h;

    this.ctx = this.canvas.getContext('2d');

  }

  _get_square(num) {
    let _x = num % this.n;
    let _y = Math.floor(num / this.n);
    return {
      x: 2 + _x * (SQUARE + 2) + 50,
      y: 2 + _y * (SQUARE + 2) + 50
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
    let squares = clone(this.white);
    squares.push(...this.black);
    for (let i = 0; i < squares.length; i++) {
      let sq = this._get_square(squares[i]);
      this.ctx.fillRect(sq.x - (SQUARE / 2), sq.y - (SQUARE / 2), SQUARE, SQUARE);
    }

    // add markers







    // for (p in board) {
    //    var mark = board[p];
    //
    //    ctx.fillStyle = "#547172";
    //    var x = 100 * (p % 8);
    //    var y = 100 * Math.floor(p / 8);
    //
    //    // block piece
    //    if (mark == 1) {
    //      ctx.fillRect(x + 2, y + 2, 98, 98);
    //    }
    //
    //    // suggestion squares
    //    if (document.getElementById('show_suggestions').checked) {
    //      // suggestions
    //      if (player_pos.length == 2) {
    //        if (can_move_to(p)) {
    //          var x = 100 * (p % 8) + 40;
    //          var y = 100 * Math.floor(p / 8) + 40;
    //          ctx.fillStyle = "lightgreen";
    //          ctx.fillRect(x, y, 20, 20);
    //        }
    //      }
    //    }
    //  }
    //
    // // add hover confirmation
    // if (document.getElementById('show_confirmation').checked && can_move_to(hover_loc) && player_pos.length == 2) {
    //  var x = 100 * (hover_loc % 8) + 40;
    //  var y = 100 * Math.floor(hover_loc / 8) + 40;
    //  ctx.fillStyle = "lightgreen";
    //  ctx.fillRect(x, y, 20, 20);
    // }
    //
    // // add numbers
    // if (document.getElementById('numbered').checked) {
    //  ctx.font = "19px Arial";
    //  ctx.fillStyle = "darkgrey";
    //  for (p in board) {
    //    var x = 100 * (p % 8) + 3;
    //    var y = 100 * Math.floor(p / 8) + 97;
    //    ctx.fillText(p, x, y);
    //  }
    // }
    //
    // // add labels
    // if (document.getElementById('labeled').checked) {
    //  ctx.font = "19px Arial";
    //  ctx.fillStyle = "darkgrey";
    //  for (p in board) {
    //    var x = 100 * (p % 8) + 77;
    //    var y = 100 * Math.floor(p / 8) + 18;
    //    ctx.fillText(["a","b","c","d","e","f","g","h"][p % 8] + Math.floor(1 + p / 8), x, y);
    //  }
    // }
    //
    // // edge lines
    // ctx.fillStyle = "lightgrey";
    // ctx.fillRect(0, 798, 800, 2);
    // ctx.fillRect(798, 0, 2, 800);


  }



  get_DOM() {
    return this.canvas;
  }


  get_base_state() {
    return ;
  }


}
