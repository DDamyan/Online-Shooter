//import Players from './Players.js';
import * as THREE from 'https://unpkg.com/three@0.123.0/build/three.module.js';
import {GLTFLoader} from '../js/GLTFLoader.module.js';
import stats from '../js/Stats.js';
//import Dev from './Dev.js';
import {World} from './world.js';

let scene,
  camera,
  camera_Offset = {y: 15, z: 8},
  coords_camera,
  cam_tween,
  renderer,
  player,
  playerPosition,
  model,
  map = {},
  validKeys = ['a', 's', 'd', 'w'],
  Shift = 1.0,
  stat,
  laser,
  font,
  ValidName = false,
  dir = new THREE.Vector3(),
  playerSpeed = 8,
  clock = new THREE.Clock();

const RELOAD_TIME = 1500;
const RELOAD_INVERVAL = 50;

const socket = io('http://localhost:8080', {transports: ['websocket']});

var RemainingBullets = document.getElementById('bullet-count-remaining');

function init() {
  renderer = World.renderer();
  document.body.appendChild(renderer.domElement);

  scene = World.scene();

  camera = World.camera();
  scene.add(camera);

  var Ground = World.ground;
  Ground.rotateX(Math.PI / -2);
  scene.add(Ground);

  player = World.player(0x942b2b, true);
  player.position.y = player.geometry.parameters.radius;
  player.visible = false;

  laser = World.laser;
  laser.position.set(
    player.geometry.parameters.radius,
    player.position.y / 4,
    laser.geometry.parameters.depth / 2,
  );
  laser.visible = false;

  new THREE.FontLoader().load('./font/helvetiker_regular.typeface.json', function (_font) {
    font = _font;
  });

  playerPosition = new THREE.Object3D();
  playerPosition.position.copy(player.position);
  scene.add(playerPosition);

  let loader = new GLTFLoader();
  loader.load('models/scene.gltf', gltf => {
    model = gltf.scene.children[0];
    model.scale.set(0.003, 0.003, 0.003);
    model.position.set(player.geometry.parameters.radius, -0.5 * player.position.y, 0);
    model.visible = false;

    player.add(laser);
    //scene.add(gltf.scene);
    player.add(model);
    scene.add(player);
  });

  // const spotLight = new THREE.SpotLight(0xffffff, 2, 15);
  // spotLight.position.y = 5;
  // spotLight.position.x = 2;
  // player.add(spotLight);

  //const light = new THREE.AmbientLight(0x404040, 4);
  scene.add(World.AmbientLight);

  //const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(World.directionalLight);

  //DEV // //
  //scene.add(new THREE.SpotLightHelper(spotLight));
  //scene.add(new THREE.DirectionalLightHelper(directionalLight, 5));
  //player.add(new THREE.AxesHelper(5));
  //playerPosition.add(new THREE.AxesHelper(5));
  //scene.add(new THREE.GridHelper(20, 20, '#ffffff', '#ffffff'));
  //scene.add(new THREE.AxesHelper(20));
  //wconst controls = new THREE.OrbitControls(camera, renderer.domElement);
  stat = stats();
  stat.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  stat.domElement.style.cssText = 'position: absolute; top:0px; right: 0px;';
  document.body.appendChild(stat.dom);
  // // // //
}

function animate() {
  requestAnimationFrame(animate);
  stat.update();
  var delta = clock.getDelta();

  playerPosition.rotation.y = 0;
  if (document.activeElement !== document.getElementById('Chat-input')) {
    var Forward = false,
      Backward = false,
      Left = false,
      Right = false,
      keyPressed = false;

    for (const [Key, Value] of Object.entries(map).filter(([_, bll]) => bll == true)) {
      keyPressed = true;

      switch (Key) {
        case 'w':
          Forward = true;
          break;
        case 's':
          Backward = true;
          break;
        case 'a':
          Left = true;
          break;
        case 'd':
          Right = true;
          break;

        default:
          console.warn('Key not registert!');
          break;
      }
    }

    if (keyPressed) {
      if ((!Backward || !Forward) && (!Left || !Right)) {
        var MoveRotation = Math.PI / 2;
        if (Backward) {
          MoveRotation = Math.PI / -2;
        }

        if (Right && (Backward || Forward)) MoveRotation /= 2;
        else if (Right) MoveRotation = 0;

        if (Left && (Backward || Forward)) MoveRotation *= 1.5;
        else if (Left) MoveRotation = Math.PI;

        playerPosition.rotation.y = MoveRotation;
        playerPosition.translateX(playerSpeed * delta);
        player.position.copy(playerPosition.position);

        socket.emit('GPS', {
          position: {...playerPosition.position},
          rotation: player.rotation.y,
          delta,
          playerSpeed,
        });
      }
    }
  }

  TWEEN.update();
  renderer.render(scene, camera);
}

setInterval(() => {
  if (cam_tween) cam_tween.stop();
  coords_camera = {x: camera.position.x, y: camera.position.y, z: camera.position.z};
  cam_tween = new TWEEN.Tween(coords_camera)
    .to(
      {
        x: playerPosition.position.x,
        y: playerPosition.position.y + camera_Offset.y,
        z: playerPosition.position.z + camera_Offset.z,
      },
      500,
    )
    //.easing(TWEEN.Easing.Circular.Out)
    .onUpdate(() => {
      camera.position.set(coords_camera.x, coords_camera.y, coords_camera.z);
      camera.lookAt(playerPosition.position);
      camera.updateProjectionMatrix();
    })
    .start();
}, 500);

window.addEventListener(
  'resize',
  function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  },
  false,
);

document.addEventListener('keydown', e => {
  // console.log('id: ', e.target);
  // if (e.target.id.indexOf('PlayerName') !== -1) return;
  if (ValidName) {
    var pressedKey = e.key.toLowerCase();
    if (pressedKey === 'enter') {
      document.getElementById('Chat-input').focus();
    } else if (pressedKey === 'r') socket.emit('reload');

    if (validKeys.indexOf(pressedKey) !== -1) map[pressedKey] = true;
    if (pressedKey === 'shift') Shift = 1.5;
  }
});

document.addEventListener('keyup', e => {
  var pressedKey = e.key.toLowerCase();
  if (Object.keys(map).indexOf(pressedKey) !== -1) map[pressedKey] = false;
  if (e.key === 'Shift') Shift = 1;
});

document.getElementById('Chat-input').addEventListener('keyup', e => {
  e.preventDefault();
  if (e.key === 'Enter') {
    var Value = e.target.value;
    if (Value.trim().length > 0) {
      socket.emit('Chat', {message: Value});
      e.target.value = '';
      document.activeElement.blur();
    }
  }
});
document.getElementById('Chat-input').addEventListener('mousedown', e => {
  e.preventDefault();
});

document.addEventListener(
  'mousemove',
  event => {
    //player.rotation.y = Math.atan2(event.movementX, event.movementY);
    // // // // // // // //
    if (ValidName) {
      player.rotation.y =
        Math.atan2(
          -(event.clientY / window.innerHeight) * 2 + 1,
          (event.clientX / window.innerWidth) * 2 - 1,
        ) +
        Math.PI / 2 +
        camera.rotation.y * 2;

      socket.emit('rotation', player.rotation.y);
    }
  },
  false,
);
document.addEventListener('mousedown', e => {
  if (e.target.id.indexOf('PlayerName') === -1)
    socket.emit('shot', {...model.getWorldPosition(new THREE.Vector3())});
});
//document.addEventListener('click', e => {
// e.preventDefault();
// e.stopPropagation();
// if (e.target.id.indexOf('PlayerName') === -1)
//   socket.emit('shot', {...model.getWorldPosition(new THREE.Vector3())});
//});

function ConnectWebsocket() {
  //const getOtherPlayers = _obj => Object.entries(_obj).filter(val => val.indexOf(socket.id) === -1);
  //const AllPlayers = {};
  var KnownPlayer = {};

  // function SocketSentGPS(_par) {
  //   socket.emit('GPS', _par);
  // }

  socket.on('connect', () => {
    console.warn('Connected!');
  });

  //socket.on('newPlayer', ({_id, lastPosition, color}) => {
  //const otherPlayers = getOtherPlayers(data);
  //otherPlayers.filter(val => console.log('NEW:', val)); //.map(([_ /*ID*/, curr]) => scene.add(getNewPlayer(curr.color)));
  // const newSphere = new THREE.Mesh(
  //   new THREE.SphereGeometry(1, 20, 20),
  //   new THREE.MeshPhongMaterial({color}),
  // );
  // newSphere.position.set(lastPosition.x, lastPosition.y, lastPosition.z);
  // scene.add(newSphere);
  // KnownPlayer[_id] = newSphere;
  //});

  socket.on('disconnect', () => {
    console.warn('Disconnected!');
  });

  socket.on('playerColor', newColor => {
    player.material.color = new THREE.Color(newColor);
  });

  //var Intervals = {};

  // function handle_Shot(data, bullet) {
  //   //console.log(data);
  //   console.log('bullet', bullet);

  //   //Object.entries(AllShots).map(([_, shot]) => (shot.position.x += 0.02));
  //   bullet.translateZ(0.2);
  //   //clearInterval(Intervals[shot.ID]);

  //   var Created = new Date(data.timeStep);
  //   var maxAge = new Date(Created.setSeconds(Created.getSeconds() + 1));
  //   if (maxAge.getTime() < new Date().getTime()) {
  //     scene.getObjectByProperty('uuid', bullet.uuid).geometry.dispose();
  //     scene.getObjectByProperty('uuid', bullet.uuid).material.dispose();
  //     scene.remove(scene.getObjectByProperty('uuid', bullet.uuid));
  //     clearInterval(Intervals[data.ID]);
  //   }
  // }

  var AllBullets = {};

  socket.on('shot', bullet => {
    if (typeof AllBullets[bullet.ID] !== 'undefined') {
      // Known
      if (!bullet.expire) {
        // AllBullets[bullet.ID].translateZ(
        //   bullet.position - AllBullets[bullet.ID].userData.lastPosition,
        // );
        //AllBullets[bullet.ID].userData.lastPosition = bullet.position;
        AllBullets[bullet.ID].position.z = bullet.position.z;
        AllBullets[bullet.ID].position.x = bullet.position.x;
        // console.log(AllBullets[bullet.ID].position.z);
        //AllBullets[bullet.ID].position.z = bullet.position;
        //var Created = new Date(bullet.timeStep).getTime();
        //console.log(new Date().getTime() - Created);
        //AllBullets[bullet.ID].translateZ(bullet.speed);
      } else {
        scene.getObjectByProperty('uuid', AllBullets[bullet.ID].uuid).geometry.dispose();
        scene.getObjectByProperty('uuid', AllBullets[bullet.ID].uuid).material.dispose();
        scene.remove(AllBullets[bullet.ID]);

        delete AllBullets[bullet.ID];
      }
    } else {
      // Unknown

      var audio = new Audio('sounds/M16_short.mp3');
      audio.volume = 0.5;
      audio.play();

      var bll = World.bullet();
      bll.rotation.y = bullet.rotation;
      bll.position.set(bullet.position.x, bullet.origin.y + 0.7, bullet.position.z);
      // bll.position.set(bullet.origin.x, bullet.origin.y + 0.7, bullet.origin.z);

      //bll.translateX(player.geometry.parameters.radius);
      //bll.translateZ(2.3);
      //bll.userData.lastPosition = 0;

      scene.add(bll);

      AllBullets[bullet.ID] = bll;

      if (bullet.gunner === socket.id) RemainingBullets.textContent = bullet.remaining;
    }

    // Intervals[data.ID] = setInterval(() => handle_Shot(data, bullet), 10);
  });

  socket.on('GPS', data => {
    const LP = data[socket.id].lastPosition;
    playerPosition.position.set(LP.x, LP.y, LP.z);
    //const otherPlayers = Object.entries(data).filter(val => val.indexOf(socket.id) === -1);
    //const otherPlayers = getOtherPlayers(data);

    //KnownPlayer = [];
    //otherPlayers.map(([ID, curr]) => KnownPlayer.push({[ID]: curr.lastPosition}));
    if (ValidName) {
      Object.entries(data)
        .filter(([x]) => x !== socket.id)
        .map(([ID, curr]) => {
          //const Curr_KnownPlayer = KnownPlayer.filter(v => v.id === ID);
          //if (Curr_KnownPlayer.length === 0) {
          if (!KnownPlayer[ID]) {
            // not known
            //const PP = new Players(ID, curr.lastPosition, curr.color);
            const tempObj = new THREE.Object3D();
            tempObj.position.set(curr.lastPosition.x, curr.lastPosition.y, curr.lastPosition.z);
            scene.add(tempObj);

            const newSphere = World.player(curr.color);
            newSphere.add(model.clone());
            newSphere.name = 'player';
            newSphere.rotation.y = curr.rotation;
            tempObj.add(newSphere);

            var nameTag = new THREE.Mesh(
              new THREE.TextGeometry(curr.name, {
                font,
                size: 0.5,
                height: 0.05,
                curveSegments: 6,
                bevelEnabled: false,
              }),
              new THREE.MeshBasicMaterial({color: 0xffffff}),
            );
            nameTag.position.x = player.geometry.parameters.radius;
            nameTag.rotation.x = Math.PI / -4;
            nameTag.name = 'username';
            tempObj.add(nameTag);

            KnownPlayer[ID] = tempObj;
          } else {
            // already known
            KnownPlayer[ID].getObjectByName('player').rotation.y = curr.rotation;
            KnownPlayer[ID].position.set(
              curr.lastPosition.x,
              curr.lastPosition.y,
              curr.lastPosition.z,
            );
          }
        });
    }
  });

  socket.on('invalidGPS', data => {
    console.log('invalid->', data[socket.id]);
    const {x, y, z} = data[socket.id].lastPosition;
    playerPosition.position.set(x, y, z);
    //const {x, y, z, rotation} = data[socket.id];
    //var prevPos = {...playerPosition.position};
    //console.log('Prev_PP:', prevPos);
    //console.log('X:', x, 'Y:', y, 'Z:', z);
    //PP.position.x = 5;
    //TODO: PlayerPosition drehen und in richtung bewegen nach backcall vom Server!
    // console.log(
    //   'PP',
    //   playerPosition.position.x,
    //   playerPosition.position.y,
    //   playerPosition.position.z,
    // );
    // playerPosition.rotation.y = rotation;
    // playerPosition.translateX(data.speed);
    // player.position.copy(playerPosition.position);
    // Get Distance between 2 points
    //const A = prevPos.x - playerPosition.position.x;
    //const B = prevPos.y - playerPosition.position.y;
    //console.log('DIS:', Math.sqrt(A * A + B * B));
    // // // // // // // // // // //
    //prevPos = playerPosition.position;
  });

  socket.on('Chat', ({message, name, color}) => {
    let newEle = document.createElement('p');
    newEle.innerHTML = `<span style=\"color:${color}\">${name}:</span> ${message}`;
    document.getElementById('innerChat').appendChild(newEle);
  });

  socket.on('playerLeft', id => {
    scene
      .getObjectByProperty('uuid', KnownPlayer[id].getObjectByName('player').uuid)
      .geometry.dispose();
    scene
      .getObjectByProperty('uuid', KnownPlayer[id].getObjectByName('player').uuid)
      .material.dispose();

    scene
      .getObjectByProperty('uuid', KnownPlayer[id].getObjectByName('username').uuid)
      .geometry.dispose();
    scene
      .getObjectByProperty('uuid', KnownPlayer[id].getObjectByName('username').uuid)
      .material.dispose();

    scene.remove(KnownPlayer[id].getObjectByName('player'));
    scene.remove(
      scene.getObjectByProperty('uuid', KnownPlayer[id].getObjectByName('username').uuid),
    );
    scene.remove(scene.getObjectByProperty('uuid', KnownPlayer[id].uuid));

    // KnownPlayer[id].getObjectByName('player').geometry.dispose();
    // KnownPlayer[id].getObjectByName('player').material.dispose();
    // scene.remove(KnownPlayer[id].getObjectByName('player'));

    delete KnownPlayer[id];
  });

  socket.on('reload', () => {
    var root = document.documentElement;

    root.style.setProperty('--reloading-visible', 'visible');
    const modelPositionX = model.rotation.x;
    laser.visible = false;
    model.rotation.x -= Math.PI / 2;

    var timePassed = 0;
    const Interval = setInterval(() => {
      const percentage = 1 - timePassed / RELOAD_TIME;
      const percent = percentage * 100;

      root.style.setProperty('--reloading-grant-percent', percent.toFixed(2) + '%');
      timePassed += RELOAD_INVERVAL;

      if (timePassed > RELOAD_TIME) {
        clearInterval(Interval);
        model.rotation.x = modelPositionX;
        laser.visible = true;
        setTimeout(() => {
          root.style.setProperty('--reloading-visible', 'hidden');
          root.style.setProperty('--reloading-grant-percent', '100%');
        }, 100);
      }
    }, RELOAD_INVERVAL);
  });

  socket.on('magazin', ammo => {
    RemainingBullets.textContent = ammo;
  });

  socket.on('PlayerNameValid', ({Remove}) => {
    eval(Remove);

    ValidName = true;
    socket.emit('firstGPS', {
      position: {...playerPosition.position},
      rotation: player.rotation.y,
      radius: player.geometry.parameters.radius,
      playerSpeed,
    });

    player.visible = true;
    laser.visible = true;
    model.visible = true;
  });

  socket.on('PlayerNameError', ErrorMessage => {
    document.getElementById('PlayerName-error').textContent = ErrorMessage;
  });
}

init();
ConnectWebsocket();
animate();

document.getElementById('PlayerName-input').addEventListener('keyup', e => {
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Enter') {
    socket.emit('Username', e.target.value);
  }
});

/*

var canvas = document.querySelector('canvas');

canvas.addEventListener('click', e => {
  e.target.requestPointerLock();
});

canvas.addEventListener('mousemove', e => {
  if (document.pointerLockElement) {
    //console.log(camera.position.z - playerPosition.position.z - camera_Offset.z);
    console.log(
      Math.atan2(
        camera.position.z - playerPosition.position.z - camera_Offset.z,
        camera.position.x - playerPosition.position.x,
      ),
    );
    //player.rotation.y = Math.atan2(e.movementX, e.movementY);
  }
});*/

// // DEV:
socket.emit('Username', 'e.target.value');
// // // //

/*
if (cam_tween) cam_tween.stop();
  coords_camera = {x: camera.position.x, y: camera.position.y, z: camera.position.z};
  cam_tween = new TWEEN.Tween(coords_camera)
    .to(
      {
        x: playerPosition.position.x,
        y: playerPosition.position.y + 15,
        z: playerPosition.position.z + 8,
      },
      500,
    )
    //.easing(TWEEN.Easing.Circular.Out)
    .onUpdate(() => {
      camera.position.set(coords_camera.x, coords_camera.y, coords_camera.z);
      camera.lookAt(playerPosition.position);
      camera.updateProjectionMatrix();
    })
    .start();
*/

// Lock or Unlock
// document.addEventListener(
//   'pointerlockchange',
//   e => {
//     console.log(e);
//   },
//   false,
// );

/*
var Focus = true;
document.addEventListener('mousemove', e => {
  //console.log(e);
});*/
