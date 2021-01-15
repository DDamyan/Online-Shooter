var players = {},
  speed = 0.2;
//Express setup
const express = require('express')();
var server = express.listen(8080, () => {
  console.log('running -> http://localhost:8080/');
});

//Socket setup
const IO = require('socket.io')(server);
IO.on('connection', socket => {
  console.log('+Client');
  players[socket.id] = {x: 0, y: 0, z: 0};

  socket.on('GPS', data => {
    console.log(data, new Date());
    console.log(new Date() - new Date(data.time));
    var Backward = false,
      Forward = false,
      Left = false,
      Right = false;

    switch (data.Key) {
      case 'w':
        Forward = true;
        //players[socket.id].z -= speed;
        break;
      case 's':
        Backward = true;
        //players[socket.id].z += speed;
        break;
      case 'a':
        Left = true;
        //players[socket.id].x -= speed;
        break;
      case 'd':
        Right = true;
        //players[socket.id].z += speed;
        break;

      default:
        console.warn('Key not registert!');
        break;
    }

    if ((!Backward || !Forward) && (!Left || !Right)) {
      var MoveRotation = Math.PI / 2;
      if (Backward) {
        MoveRotation = Math.PI / -2;
      }

      if (Right && (Backward || Forward)) MoveRotation /= 2;
      else if (Right) MoveRotation = 0;

      if (Left && (Backward || Forward)) MoveRotation *= 1.5;
      else if (Left) MoveRotation = Math.PI;

      //playerPosition.rotation.y = MoveRotation;
      players[socket.id].rotation = MoveRotation;
      //playerPosition.translateX(playerSpeed * delta);
      players.speed = speed;
    }

    IO.emit('GPS', players);
  });

  socket.on('disconnect', () => {
    console.log('-Client');
    delete players[socket.id];
  });
});
