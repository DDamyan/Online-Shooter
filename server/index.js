var players = {};

const {uid} = require('uid');
const {WeaponInRange, CheckHIT} = require('./functions');

const ValidSpeed = 8,
  BulletSpeed = 0.5,
  MaxBulletAge = 1,
  PlayerRadius = 1,
  MAGAZIN = 14,
  RELOAD_TIME = 1500,
  DigitRound = Math.pow(10, 9);

const randomColor = () =>
  '#' +
  Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, 'f');

//Express setup
const express = require('express')();
var server = express.listen(8080, () => {
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
      color: randomColor(),
      rotation: data.rotation,
      radius: data.radius,
      playerSpeed: data.playerSpeed,
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

      if (RoundServerDistance === RoundClientDistance) {
        if (players[socket.id].validName) {
          players[socket.id].lastPosition = data.position;
          players[socket.id].rotation = data.rotation;
        }
        IO.emit('GPS', players);
      } else socket.emit('invalidGPS', players);
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
    var maxAge = new Date(new Date(Created).setSeconds(Created.getSeconds() + MaxBulletAge));

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

        IO.emit('Chat', {
          message: players[socket.id].name + ' >>> ' + players[hitted].name,
          name: 'Killed',
          color: players[socket.id].color,
        });
      }
    }

    IO.emit('shot', bullet);
  }

  socket.on('reload', () => {
    var weapon = players[socket.id].weapon;

    if (!weapon.IsReloading && weapon.ammo < MAGAZIN) {
      weapon.IsReloading = true;
      socket.emit('reload');
      setTimeout(() => {
        weapon.ammo = MAGAZIN;
        socket.emit('magazin', weapon.ammo);
        weapon.IsReloading = false;
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
              // TODO: Magazin und nachladen
              weapon.lastShot = new Date();

              /*
      AllShots.push({
        ID: Shot_IDcounter,
        gunner: socket.id,
        timeStep: new Date(),
        origin: players[socket.id].lastPosition,
        rotation: players[socket.id].rotation,
        expire: false,
        Current position
      });
      */

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
                  //speed: BulletSpeed,
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
