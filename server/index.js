var players = {};

const {uid} = require('uid');
const {WeaponInRange, CheckHIT} = require('./functions');

const ValidSpeed = 8,
  VALIDSPEED_RANGE = 0.6,
  //BulletSpeed = 0.5,
  MAX_BULLET_AGE = 1,
  BULLET_DAMAGE = 25,
  PLAYER_RADIUS = 1,
  MAGAZIN = 14,
  RELOAD_TIME = 1500,
  DigitRound = Math.pow(10, 6); // ??? => 9

const randomColor = () =>
  '#' +
  Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, 'f');

//Express setup
const express = require('express');
const app = express();

app.use(express.static('website'));
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/website/src/main.html');
});

var server = app.listen(8080, () => {
  console.log('running -> http://localhost:8080/');
});

//Socket setup
const IO = require('socket.io')(server);
IO.on('connection', socket => {
  console.log('+Client');
  players[socket.id] = {};
  socket.on('firstGPS', data => {
    players[socket.id] = {
      ...players[socket.id],
      lastPosition: data.position,
      lastUpdate: new Date(),
      color: randomColor(),
      healthPoints: 100,
      rotation: data.rotation,
      radius: data.radius,
      playerSpeed: data.playerSpeed,
      kills: 0,
      weapon: {ammo: MAGAZIN, lastShot: new Date(), IsReloading: false, shots: []},
    };
    //IO.emit('newPlayer', players[socket.id]);
    socket.emit('playerColor', players[socket.id].color);
    IO.emit('GPS', players);
  });

  socket.on('rotation', newRotation => {
    if (players[socket.id].validName) {
      players[socket.id].rotation = newRotation;
      IO.emit('GPS', players);
    }
  });

  socket.on('GPS', data => {
    //TODO: überprüfen ob letzte Client position mit letzte Server position übereintimt
    if (data.playerSpeed === ValidSpeed && players[socket.id].playerSpeed === ValidSpeed) {
      const A = data.position.x - players[socket.id].lastPosition.x;
      const B = data.position.z - players[socket.id].lastPosition.z;

      const RoundServerDistance = Math.floor(Math.sqrt(A * A + B * B) * DigitRound) / DigitRound;
      const RoundClientDistance =
        Math.floor(data.playerSpeed * data.delta * DigitRound) / DigitRound;

      console.log(data.delta);
      const speedCalculation = RoundServerDistance / data.delta;
      // if (
      //   speedCalculation < ValidSpeed + VALIDSPEED_RANGE &&
      //   speedCalculation > ValidSpeed - VALIDSPEED_RANGE
      // )
      //   console.log('test:', speedCalculation, ' ===> ', 8);
      // console.log(new Date(players[socket.id].lastUpdate) - new Date());
      // players[socket.id].lastUpdate = new Date();
      if (
        RoundServerDistance === RoundClientDistance &&
        speedCalculation < ValidSpeed + VALIDSPEED_RANGE &&
        speedCalculation > ValidSpeed - VALIDSPEED_RANGE
      ) {
        if (players[socket.id].validName) {
          players[socket.id].lastPosition = data.position;
          players[socket.id].rotation = data.rotation;
        }
        console.log(RoundServerDistance, '===', RoundClientDistance);
        IO.emit('GPS', players);
      } else {
        socket.emit('invalidGPS', players);
        console.log('test:', speedCalculation, ' ===> ', 8);
        console.log(' ===> INVALID ->', RoundServerDistance, '===', RoundClientDistance);
      }
    } else socket.disconnect();
  });

  socket.on('Chat', data => {
    if (players[socket.id].validName)
      IO.emit('Chat', {
        message: data.message,
        name: players[socket.id].name,
        color: players[socket.id].color,
      });
  });

  socket.on('Username', NewName => {
    if (NewName.length > 2) {
      let NameTaken = false;
      Object.entries(players).map(([_, {name}]) => {
        if (name) {
          if (name === NewName) NameTaken = true;
        }
      });
      if (!NameTaken) {
        players[socket.id].name = NewName;
        players[socket.id].validName = true;
        socket.emit('PlayerNameValid', {
          Remove: "document.getElementById('PlayerName').remove()",
        });
        IO.emit('Chat', {
          message: players[socket.id].name + ' has joined the Game!',
          name: '[+]',
          color: '#00b700',
        });
      } else {
        socket.emit('PlayerNameError', 'Name already taken.');
      }
    } else socket.emit('PlayerNameError', 'Name too short, min. 3 chars.');
  });

  var ShotIntervals = {};

  function handle_Shots(bullet) {
    var Created = new Date(bullet.timeStep);
    var maxAge = new Date(new Date(Created).setSeconds(Created.getSeconds() + MAX_BULLET_AGE));

    if (maxAge.getTime() < new Date().getTime()) {
      clearInterval(ShotIntervals[bullet.ID]);
      bullet.expire = true;
    } else {
      var UnitsToMove = Number(
        (((1000 - (maxAge.getTime() - new Date().getTime())) * 0.1) / 5).toFixed(2),
      );
      //bullet.position = UnitsToMove;

      bullet.position = {
        z: bullet.origin.z + (UnitsToMove + 2) * Math.cos(bullet.rotation),
        x: bullet.origin.x + (UnitsToMove + 2) * Math.sin(bullet.rotation),
      };

      var hitted = CheckHIT(players, bullet.position, socket.id);
      if (hitted) {
        bullet.expire = true;
        clearInterval(ShotIntervals[bullet.ID]);
        //console.log(players[hitted].name, 'got hit by', players[socket.id].name);
        players[hitted].healthPoints -= BULLET_DAMAGE;
        socket.broadcast.to(hitted).emit('damage', players[hitted].healthPoints);
        if (players[hitted].healthPoints <= 0) {
          //players[hitted] is dead
          players[hitted] = {
            ...players[hitted],
            healthPoints: 100,
            lastPosition: {x: 0, y: 1, z: 0},
          };
          players[bullet.gunner].kills++;
          socket.emit('kills', players[bullet.gunner].kills);
          IO.emit('GPS', players);
          IO.emit('Chat', {
            message: players[bullet.gunner].name + ' 🕱 ' + players[hitted].name,
            name: 'Killed',
            color: players[socket.id].color,
          });

          socket.broadcast.to(hitted).emit('damage', players[hitted].healthPoints);
        }
      }
    }

    IO.emit('shot', bullet);
  }

  socket.on('reload', () => {
    var weapon = players[socket.id].weapon;

    if (!weapon.IsReloading && weapon.ammo < MAGAZIN) {
      weapon.IsReloading = true;
      socket.emit('reload');
      IO.emit('GPS', players);
      setTimeout(() => {
        weapon.ammo = MAGAZIN;
        socket.emit('magazin', weapon.ammo);
        weapon.IsReloading = false;
        IO.emit('GPS', players);
      }, RELOAD_TIME);
    }
  });

  socket.on('shot', weaponPos => {
    if (players[socket.id]) {
      let weapon = players[socket.id].weapon;
      if (players[socket.id].validName && !weapon.IsReloading) {
        var PlayerLastPosition = players[socket.id].lastPosition;

        if (
          WeaponInRange(weaponPos.x, PlayerLastPosition.x) &&
          WeaponInRange(weaponPos.y, PlayerLastPosition.y)
        ) {
          if (weapon.ammo > 0) {
            let dt = new Date();
            dt.setMilliseconds(dt.getMilliseconds() - 200);

            if (dt.getTime() > weapon.lastShot.getTime()) {
              weapon.ammo--;
              weapon.lastShot = new Date();

              var UID = uid(),
                rotation = players[socket.id].rotation,
                origin = weaponPos, //{...players[socket.id].lastPosition},
                timeStep = new Date();

              ShotIntervals[UID] = setInterval(() => {
                handle_Shots({
                  ID: UID,
                  gunner: socket.id,
                  timeStep,
                  origin,
                  rotation,
                  position: 0,
                  expire: false,
                  remaining: weapon.ammo,
                });
              }, 10);

              // IO.emit('shots', {
              //   ID: uid(),
              //   gunner: socket.id,
              //   timeStep: new Date(),
              //   origin: players[socket.id].lastPosition,
              //   rotation: players[socket.id].rotation,
              //   expire: false,
              //   speed: BulletSpeed,
              // });
            }
          }
          //clearInterval(ShotInterval);
          //ShotInterval = setInterval(EmitShots, 1000 / 60);
          //IO.emit('GPS', players);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('-Client');
    IO.emit('playerLeft', socket.id);

    IO.emit('Chat', {
      message: players[socket.id].name + ' has left the Game!',
      name: '[-]',
      color: 'red',
    });

    delete players[socket.id];
  });
});
