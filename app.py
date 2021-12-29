from flask import Flask, render_template, url_for, redirect, request, send_from_directory, jsonify, session, Response
from flask_sqlalchemy import SQLAlchemy
from flask_heroku import Heroku
import random
import html
import os
import sys
import random as r
import json
import time
import hashlib
from base64 import b64encode
from os import urandom

from flask_socketio import SocketIO, send, join_room, leave_room


app = Flask(__name__)
app.secret_key = "ZpWNmtZBqTeLrJu6SWx6BueHGKWYxfD4fLz7CKTfcerZj4ffVhEG"

# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://localhost/sedario'
heroku = Heroku(app)
app.config['SECRET_KEY'] = 'secret!'


socketio = SocketIO(app)




#      _       _        _
#   __| | __ _| |_ __ _| |__   __ _ ___  ___
#  / _` |/ _` | __/ _` | '_ \ / _` / __|/ _ \
# | (_| | (_| | || (_| | |_) | (_| \__ \  __/
#  \__,_|\__,_|\__\__,_|_.__/ \__,_|___/\___|
#


db = SQLAlchemy(app)

class SysData(db.Model):
    __tablename__ = "SysData"
    id = db.Column(db.Integer, primary_key=True)
    # last_time_ranked = db.Column(db.Text)
    top_10 = db.Column(db.Text)

    def __init__(self):
        # last_time_ranked = '0'
        top_10 = ''


def get_SysData():
    return db.session.query(SysData)[0]

def set_user_ranks():
    users = list(db.session.query(User))
    users.sort(key = lambda u: -u.elo)
    rank = 0
    last = 0
    top_10 = []
    for user in users:
        if last != user.elo:
            rank += 1
        user.rank = rank
        if rank <= 10:
            top_10.append((rank, user.username, user.elo))
        last = user.elo
    sd = get_SysData()
    sd.top_10 = str(top_10)
    sd.last_time_ranked = str(time.time())
    db.session.commit()

# def time_tasks():
#     if time.time() > float(get_SysData().last_time_ranked) + 60 * 60:
#         set_user_ranks()

def get_recent_and_public_users():
    public = db.session.query(User).filter(User.public == True)
    recents = []
    for u in public:
        t = int((time.time() - eval(u.last_seen)) / 60)
        if t < 30:
            recents.append([u.username, t])
    recents.sort(key = lambda x: x[1])
    return recents[:30]






class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.Text)
    salt = db.Column(db.Text)
    hashed_password = db.Column(db.Text)
    public = db.Column(db.Boolean)
    last_seen = db.Column(db.Text)
    elo = db.Column(db.Integer)
    rank = db.Column(db.Integer)
    past_games = db.Column(db.Text)
    current_games = db.Column(db.Text)
    challenges = db.Column(db.Text)
    friend_requests = db.Column(db.Text)
    friends = db.Column(db.Text)

    def __init__(self, username, password):
        self.username = username
        self.set_password(password)
        self.public = False
        self.last_seen =str(time.time())
        self.elo = 1000
        self.rank = 0
        self.past_games = '[]'
        self.current_games = '[]'
        self.challenges = '[]' # elements are (username, rated)
        self.friend_requests = '[]'
        self.friends = '[]'

    def check_in(self):
        self.last_seen = str(time.time())
        db.session.commit()

    def set_password(self, password):
        self.salt = get_salt(12)
        self.hashed_password = SHA1(password + self.salt)
        db.session.commit()

    def set_public(self, public):
        self.public = public
        db.session.commit()

    def add_friend_request(self, username):
        friend_requests = eval(self.friend_requests)
        if not username in friend_requests:
            self.friend_requests = str(friend_requests + [username])
            db.session.commit()
    def has_friend_request(self, username):
        return username in eval(self.friend_requests)
    def remove_friend_request(self, username):
        friend_requests = eval(self.friend_requests)
        friend_requests.remove(username)
        self.friend_requests = str(friend_requests)
        db.session.commit()

    def add_friend(self, username):
        friends = eval(self.friends)
        if not username in friends:
            self.friends = str(friends + [username])
            db.session.commit()
    def has_friend(self, username):
        return username in eval(self.friends)
    def remove_friend(self, username):
        friends = eval(self.friends)
        friends.remove(username)
        self.friends = str(friends)
        db.session.commit()

    def add_challenge(self, username, rated):
        challenges = eval(self.challenges)
        if not username in challenges:
            self.challenges = str(challenges + [(username, rated)])
            db.session.commit()
    def get_challenge(self, username):
        for el in eval(self.challenges):
            if username == el[0]:
                return True, el
        return False, None
    def remove_challenge(self, username):
        old_challenges = eval(self.challenges)
        new_challenges = [el for el in old_challenges if el[0] != username]
        self.challenges = str(new_challenges)
        db.session.commit()

    def add_game(self, gameid):
        self.current_games = str(eval(self.current_games) + [gameid])
        db.session.commit()
    def has_game(self, gameid):
        return gameid in eval(self.current_games) or gameid in eval(self.past_games)

    def end_game(self, gameid):
        games = eval(self.current_games)
        games.remove(gameid)
        self.current_games = str(games)
        self.past_games = str(eval(self.past_games) + [gameid])
        db.session.commit()




def get_user(username):
    users = db.session.query(User).filter(User.username == username)
    is_user = len(list(users)) != 0
    return is_user, users[0] if is_user else None

def get_users_from_list(u_list):
    return [u[1] for u in [get_user(u) for u in u_list] if u[0]]




def get_k(n):
    if n < 25:
        return 100
    if n < 100:
        return 50
    if n < 200:
        return 25
    if n < 500:
        return 10
    return 5

def elo(ra, rb, sa, sb, na, nb):
    qa = 10 ** int(ra / 400)
    qb = 10 ** int(rb / 400)
    ea = qa / (qa + qb)
    eb = qb / (qa + qb)
    return (int(ra + get_k(na) * (sa - ea)), int(rb + get_k(nb) * (sb - eb)))



# game types
#  - h (human v human)
#  - p (pass and play)
#  - c (human v computer)


# game states
# - p (playing)
# - r (review)

class Game(db.Model):
    __tablename__ = "games"
    id = db.Column(db.Integer, primary_key=True)
    white = db.Column(db.Text)
    black = db.Column(db.Text)
    type = db.Column(db.Text)
    state = db.Column(db.Text)
    rated = db.Column(db.Boolean)
    combo_moves = db.Column(db.Text)

    undo_stack = db.Column(db.Text)

    # for review
    # L = db.Column(db.Integer)
    # tree = db.Column(db.Text)



    def __init__(self, white, black, type, rated):
        self.white = white
        self.black = black
        self.state = 'p'
        self.type = type
        self.rated = rated
        self.combo_moves = '[]'
        self.undo_stack = '[]'

    def make_move(self, move):
        self.combo_moves = str(eval(self.combo_moves) + [move])
        self.undo_stack = '[]'
        db.session.commit()

    def get_winner(self):
        # even number of moves => black last to move => black wins
        return [self.black, self.white][len(eval(self.combo_moves)) % 2]

    def get_opponent(self, player):
        if self.black == player:
            return self.white
        elif self.white == player:
            return self.black
        return None

    def undo(self):
        combo_moves = eval(self.combo_moves)
        undo_stack = eval(self.undo_stack)
        self.undo_stack = str(undo_stack + [combo_moves.pop()])
        self.combo_moves = str(combo_moves)
        db.session.commit()

    def redo(self):
        combo_moves = eval(self.combo_moves)
        undo_stack = eval(self.undo_stack)
        self.combo_moves = str(combo_moves + [undo_stack.pop()])
        self.undo_stack = str(undo_stack)
        db.session.commit()


def get_game(gameid):
    games = db.session.query(Game).filter(Game.id == gameid)
    is_game = len(list(games)) != 0
    return is_game, games[0] if is_game else None

def get_games_from_list(g_list):
    return [g[1] for g in [get_game(g) for g in g_list] if g[0]]




#  _          _
# | |__   ___| |_ __   ___ _ __ ___
# | '_ \ / _ | | '_ \ / _ | '__/ __|
# | | | |  __| | |_) |  __| |  \__ \
# |_| |_|\___|_| .__/ \___|_|  |___/
#              |_|


def SHA1(string):
    return hashlib.sha1(string.encode()).hexdigest()

def get_salt(n):
    return b64encode(urandom(n)).decode('utf-8')





#                  _             _
#   ___ ___  _ __ | |_ ___ _ __ | |_
#  / __/ _ \| '_ \| __/ _ | '_ \| __|
# | (_| (_) | | | | ||  __| | | | |_
#  \___\___/|_| |_|\__\___|_| |_|\__|




def get_account_bar():
    # time_tasks()
    is_user_and_logged_in, user = get_session_user()
    username = ''
    num_alerts = 0
    if is_user_and_logged_in:
        username = user.username
        num_alerts=len(eval(user.challenges)) + len(eval(user.friend_requests))
        user.check_in()
    return render_template(
        'account_bar.html',
        logged_in=is_user_and_logged_in,
        username=username,
        num_alerts=num_alerts
    )

def get_footer():
    return render_template('footer.html')

def error_page(num):
    return render_template(
        'error.html',
        account_bar = get_account_bar(),
        footer = get_footer(),
        num = num,
        msg = {
            401: "You must be logged in to view this page.",
            403: "You don't have access to this page.",
            404: "The page you're looking for doesn't exist."
        }[num]
    )





@app.route('/')
@app.route('/index')
def index():
    return render_template(
        'index.html',
        account_bar=get_account_bar(),
        footer=get_footer(),
        logged_in=get_session_user()[0]
    )


@app.route('/all')
def all():
    return render_template(
        'all.html',
        games = db.session.query(Game),
        users = db.session.query(User),
        SysData = get_SysData()
    )


@app.route('/user/<string:username>')
def user(username):
    is_user, user = get_user(username)
    if not is_user:
        return error_page(404)
    logged_in, s_user = get_session_user()
    # owned account
    if logged_in and s_user.username == username:
        return render_template(
            'self_user.html',
            account_bar = get_account_bar(),
            footer = get_footer(),
            user = user
        )
    # other person's account
    return render_template(
        'user.html',
        account_bar = get_account_bar(),
        footer = get_footer(),
        logged_in = logged_in,
        user = user,
        s_user = s_user
    )


@app.route('/game')
@app.route('/play')
def play():
    logged_in, s_user = get_session_user()
    if not logged_in:
        return error_page(401)
    return render_template(
        'play.html',
        account_bar = get_account_bar(),
        footer = get_footer(),
        s_user = s_user,
        recent_players = get_recent_and_public_users(),
        friends = get_users_from_list(eval(s_user.friends))
    )


@app.route('/game/<int:gameid>')
def game(gameid):
    logged_in, s_user = get_session_user()
    if not logged_in:
        return error_page(401)
    is_game, game = get_game(gameid)
    if not is_game:
        return error_page(404)
    if not s_user.has_game(game.id):
        return error_page(403)

    # if game.state == 'r':
    #     return redirect(f'/review/{gameid}')

    if game.type == 'h':
        return render_template(
            'game.html',
            user = s_user,
            opponent = game.get_opponent(s_user.username),
            account_bar = get_account_bar(),
            footer = get_footer(),
            game = game
        )
    if game.type == 'p':
        return render_template(
            'pass_and_play.html',
            user = s_user,
            account_bar = get_account_bar(),
            footer = get_footer(),
            game = game
        )
    if game.type == 'c':
        return render_template(
            'comp.html',
            user = s_user,
            account_bar = get_account_bar(),
            footer = get_footer(),
            game = game,
            comp_strategy = game.get_opponent(s_user.username).split('@')[1]
        )



@app.route('/review/<int:gameid>')
def review(gameid):
    logged_in, s_user = get_session_user()
    if not logged_in:
        return error_page(401)
    is_game, game = get_game(gameid)
    if not is_game:
        return error_page(404)
    if not s_user.has_game(game.id):
        return error_page(403)
    return render_template(
        'review.html',
        user = s_user,
        account_bar = get_account_bar(),
        footer = get_footer(),
        game = game
    )



@app.route('/AI')
def AI_test():
    return render_template(
        'AI_test.html',
        account_bar = get_account_bar(),
        footer = get_footer()
    )





#    __ _  ___ ___ ___ ___ ___
#   / _` |/ __/ __/ _ / __/ __|
#  | (_| | (_| (_|  __\__ \__ \
#   \__,_|\___\___\___|___|___/





@app.route('/login', methods=['POST'])
def login():
    is_user, user = get_user(request.form['username'])
    if not is_user:
        return 'No user with this username exists.', 401
    if user.hashed_password != SHA1(request.form['password'] + user.salt):
        return 'The entered password is incorrect.', 401
    session['username'] = request.form['username']
    return 'Login successful', 200


@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return 'Logout successful', 200


@app.route('/signup', methods=['POST'])
def signup():
    username = request.form['username']
    if not username.isalnum():
        return 'Username must contain only alphanumeric characters.', 401
    if len(list(db.session.query(User).filter(User.username == request.form['username']))) != 0:
        return 'A user with this username already exists.', 401
    db.session.add(User(request.form['username'],request.form['password']))
    db.session.commit()
    return 'Signup successful', 200





@app.route('/sys_access', methods=['POST'])
def sys_access():

    method = request.form['method']
    if method == "recent_players":
        return jsonify(get_recent_and_public_users()), 200
    if method == "get_top_10":
        return jsonify(eval(get_SysData().top_10))

    return "The method you are trying to access doesn't exist", 403


@app.route('/user_access', methods=['POST'])
def user_access():
    username = request.form['username']
    is_user, user = get_user(username)
    logged_in, s_user = get_session_user()
    if not is_user:
        return "Access Denied: User doesn't exist", 401
    if not logged_in:
        return 'Access Denied: You are not logged in', 401
    if s_user.username != username:
        return "Access Denied: You don't have access to this account", 403

    user.check_in()

    method = request.form['method']
    if method == 'save_account_settings':
        user.set_public(request.form['public'] == 'true')
        return 'save_account_settings successful', 200
    if method == 'request_friend':
        r_username = request.form['r_username']
        r_is_user, r_user = get_user(r_username)
        if not r_is_user:
            return 'No such user exists', 403
        if r_user.username == user.username:
            return "You can't friend request yourself!", 403
        if r_user.has_friend_request(user.username):
            return "You already requested to be their friend", 403
        r_user.add_friend_request(username)
        socketio.emit('alert', {
            'msg':f'You have a friend request from {user.username}.',
            'add': 1,
            'link': f'/user/{r_user.username}#friend-requests'
        }, room='user-'+r_user.username)
        socketio.emit('update friend requests', room='user-'+r_user.username)
        return 'request_friend successful', 200
    if method == 'accept_friend_request':
        a_username = request.form['a_username']
        a_is_user, a_user = get_user(a_username)
        if not a_is_user:
            return 'no such user exists', 403
        user.remove_friend_request(a_username)
        user.add_friend(a_username)
        a_user.add_friend(user.username)
        socketio.emit('alert', {
            'msg':user.username + " accepted your friend request",
            'add': 0,
            'link': f'/user/{a_user.username}#friends'
        }, room="user-" + a_user.username)
        socketio.emit('update friends', room='user-'+a_user.username)
        return 'accept_friend_request successful', 200
    if method == 'deny_friend_request':
        d_username = request.form['d_username']
        user.remove_friend_request(d_username)
        return 'deny_friend_request successful', 200
    if method == 'challenge':
        c_username = request.form['c_username']
        rated = request.form['rated']
        c_is_user, c_user = get_user(c_username)
        if not c_is_user:
            return 'No such user exists', 403
        if c_user.username == user.username:
            return "You can't challenge yourself!", 403
        if c_user.get_challenge(user.username)[0]:
            return "You already challenged them", 403
        if not (user.has_friend(c_user.username) or c_user.public):
            return "You can only challenge public users or your friends", 403
        c_user.add_challenge(username, rated == 'true')
        socketio.emit('alert', {
            'msg': username + " challenged you!",
            'add': 1,
            'link': f'/user/{c_user.username}#challenges'
        }, room="user-"+c_user.username);
        socketio.emit('update challenges')
        return 'request_friend successful', 200
    if method == 'accept_challenge':
        c_username = request.form['c_username']
        c_is_user, c_user = get_user(c_username)
        if not c_is_user:
            return 'no such user exists', 403
        has_challenge, challenge = user.get_challenge(c_username)
        if not has_challenge:
            return 'no such challenge to accept', 403
        user.remove_challenge(c_username)
        game = Game(user.username, challenge[0], 'h', challenge[1])
        db.session.add(game)
        db.session.commit()
        user.add_game(game.id)
        c_user.add_game(game.id)
        db.session.commit()
        socketio.emit('alert', {
            'msg': f"{user.username} accepted your challenge.",
            'add': 0,
            'link': f'/game/{game.id}'
        }, room='user-' + c_user.username)
        socketio.emit('update current games', room='user-'+c_user.username)
        socketio.emit('update current games', room='user-'+user.username)
        return f'/game/{game.id}', 200
    if method == 'deny_challenge':
        c_username = request.form['c_username']
        user.remove_challenge(c_username)
        return 'deny_challenge successful', 200
    if method == 'start_pass_and_play':
        game = Game(user.username, user.username, 'p', False)
        db.session.add(game)
        db.session.commit()
        user.add_game(game.id)
        db.session.commit()
        socketio.emit('update current games', room='user-'+user.username)
        return str(game.id), 200
    if method == 'start_comp_game':
        white = 'COMP@' + request.form['comp-strategy']
        black = user.username
        if ((request.form['play-as'] == 'random') and random.randint(0, 1) or
            (request.form['play-as'] == 'white')):
            white, black = black, white
        game = Game(white, black, 'c', False)
        db.session.add(game)
        db.session.commit()
        user.add_game(game.id)
        db.session.commit()
        socketio.emit('update current games', room='user-'+user.username)
        return str(game.id), 200

    if method == 'get_friend_requests':
        return jsonify(eval(user.friend_requests)), 200
    if method == 'get_friends':
        return jsonify([[u.username, u.elo] for u in get_users_from_list(eval(user.friends))]), 200
    if method == 'get_challenges':
        return jsonify(eval(user.challenges)), 200
    if method == 'get_current_games':
        return jsonify([[g.black if g.white == s_user.username else g.white, g.id] for g in get_games_from_list(eval(user.current_games))])
    if method == 'get_past_games':
        past = [[
            g.get_opponent(s_user.username),
            g.id,
            g.get_winner()
        ] for g in get_games_from_list(eval(user.past_games))]
        past.sort(key = lambda x: -x[1])
        return jsonify(past)

    return 'Access Denied: The method you are trying to access does not exist', 403


@app.route('/game_access', methods=['POST'])
def game_access():
    logged_in, s_user = get_session_user()
    if not logged_in:
        return 'Access Denied: You are not logged in', 401

    game_id = int(request.form['id'])

    is_game, game = get_game(game_id)
    if not is_game:
        return "no such game", 403
    if not s_user.has_game(game_id):
        return "you don't have access to this game", 403

    s_user.check_in()


    method = request.form['method']

    if method == 'get':
        return jsonify(eval(game.combo_moves)), 200

    if game.type == 'h':
        if method == 'move_h':
            game.make_move(int(request.form['square']))
            socketio.emit('update game', room=f'game-{game_id}')
            if request.form['game_over'] == "true":
                game.state = 'r'
                white = get_user(game.white)[1]
                black = get_user(game.black)[1]
                white.end_game(game.id)
                black.end_game(game.id)
                if game.rated:
                    ws = len(eval(game.combo_moves)) % 2 == 1 # white's turn => black wins
                    bs = 1 - ws
                    white.elo, black.elo = elo(white.elo, black.elo, ws, bs, len(eval(white.past_games)), len(eval(white.past_games)))
                    set_user_ranks()
                    socketio.emit('update top 10')
                db.session.commit()
                socketio.emit('update past games', room='user-'+game.white)
                socketio.emit('update past games', room='user-'+game.black)
            return 'move_h success', 200
    if game.type == 'p':
        if method == 'move_p':
            game.make_move(int(request.form['square']))
            if request.form['game_over'] == "true":
                s_user.end_game(game.id)
                game.state = 'r'
                db.session.commit()
                socketio.emit('update past games', room='user-'+s_user.username)
            return 'move_p success', 200
        if method == 'undo_p':
            game.undo()
            return 'undo_p success', 200
        if method == 'redo_p':
            game.redo()
            return 'redo_p success', 200
    if game.type == 'c':
        if method == 'move_c':
            game.make_move(int(request.form['square']))
            if request.form['game_over'] == "true":
                game.state = 'r'
                s_user.end_game(game.id)
                db.session.commit()
                socketio.emit('update past games', room='user-'+s_user.username)
            return 'move success', 200





    return "Either you do not have permission, or the method you are trying to access doesn't exist", 403



#                 _        _
#  ___  ___   ___| | _____| |_
# / __|/ _ \ / __| |/ / _ \ __|
# \__ \ (_) | (__|   <  __/ |_
# |___/\___/ \___|_|\_\___|\__|



@socketio.on('join game')
def join_game_p(data):
    join_room('game-' + data['id'])



@socketio.on('check in')
def check_in(data):
    join_room('user-' + data['username'])




#                   _
#  ___  ___ ___ ___(_) ___  _ __
# / __|/ _ / __/ __| |/ _ \| '_ \
# \__ |  __\__ \__ | | (_) | | | |
# |___/\___|___|___|_|\___/|_| |_|


@app.route('/session')
def sess():
    return "<style>table,th,tr,td{border: 1px solid black;}</style><table><tr><th colspan='2'>Session</th><tr>" + "</tr><tr>".join(f"<td>{el}</td><td>{session[el]}</td>" for el in session) + "</tr></table>"


def get_session_user():
    if 'username' in session:
        is_user, user = get_user(session['username'])
        if not is_user:
            session.pop('username', None)
        else:
            return is_user, user
    return False, None





#            _           _
#   __ _  __| |_ __ ___ (_)_ __
#  / _` |/ _` | '_ ` _ \| | '_ \
# | (_| | (_| | | | | | | | | | |
#  \__,_|\__,_|_| |_| |_|_|_| |_|


@app.route('/initialize')
def initialize():
    db.drop_all()
    db.create_all()
    users = [
        ['aaa1','7he9J08ghw9hr','f998a13487d4f1b7f273e80716fcebc02f1d69fd'],
        ['aaa2','7he9J08ghw9hr','f998a13487d4f1b7f273e80716fcebc02f1d69fd'],
        ['aaa3','7he9J08ghw9hr','f998a13487d4f1b7f273e80716fcebc02f1d69fd'],
        ['aaa4','7he9J08ghw9hr','f998a13487d4f1b7f273e80716fcebc02f1d69fd'],
    ]
    for username, salt, hash in users:
        u = User(username,'pass')
        u.salt = salt
        u.hashed_password = hash
        u.public = True
        db.session.add(u)
        db.session.commit()

    get_user('aaa1')[1].add_friend('aaa2')
    get_user('aaa2')[1].add_friend('aaa1')

    db.session.add(SysData())
    db.session.commit()

    set_user_ranks()

    return 'Initialization is done.'






if __name__ == "__main__":
    app.debug = True
    # app.run()
    socketio.run(app)
