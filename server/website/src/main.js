import * as THREE from 'https://unpkg.com/three@0.123.0/build/three.module.js';
import {GLTFLoader} from '../js/GLTFLoader.module.js';
import stats from '../js/Stats.js';
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
  playSound = true,
  dir = new THREE.Vector3(),
  playerSpeed = 8,
  clock = new THREE.Clock();

const RELOAD_TIME = 1500;
const RELOAD_INVERVAL = 10;

const socket = io('ws://localhost:3000', {transports: ['websocket']});

var RemainingBullets = document.getElementById('bullet-count-remaining');

// // INIT // //
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

  new THREE.FontLoader().load('src/font/helvetiker_regular.typeface.json', function (_font) {
    font = _font;
  });

  playerPosition = new THREE.Object3D();
  playerPosition.position.copy(player.position);
  scene.add(playerPosition);

  let loader = new GLTFLoader();
  loader.load('src/models/scene.gltf', gltf => {
    model = gltf.scene.children[0];
    model.scale.set(0.003, 0.003, 0.003);
    model.position.set(player.geometry.parameters.radius, -0.5 * player.position.y, 0);
    model.visible = false;

    player.add(laser);
    player.add(model);
    scene.add(player);
  });

  scene.add(World.AmbientLight);

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
  stat.domElement.style.cssText =
    'position: absolute; top:0px; left: 50%; transform: translateX(-50%);';
  document.body.appendChild(stat.dom);
  // // // //
}

// // ANIMATE // //
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

// // TWEEN-ANIMATION // //
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

// // WEBSOCKET-EVENTS // //
function ConnectWebsocket() {
  var KnownPlayer = {};

  socket.on('connect', () => {
    console.warn('Connected!');
  });

  socket.on('disconnect', () => {
    console.warn('Disconnected!');
  });

  socket.on('playerColor', newColor => {
    player.material.color = new THREE.Color(newColor);
  });

  var AllBullets = {};

  socket.on('shot', bullet => {
    if (typeof AllBullets[bullet.ID] !== 'undefined') {
      // Known => move
      AllBullets[bullet.ID].position.z = bullet.position.z;
      AllBullets[bullet.ID].position.x = bullet.position.x;
    } else {
      // Unknown => create
      if (playSound) {
        var audio = new Audio('src/sounds/M16_short.mp3');
        audio.volume = 0.5;
        audio.play();
      }

      var bll = World.bullet();
      bll.rotation.y = bullet.rotation;
      bll.position.set(bullet.position.x, bullet.origin.y + 0.7, bullet.position.z);

      scene.add(bll);

      AllBullets[bullet.ID] = bll;

      if (bullet.gunner === socket.id) RemainingBullets.textContent = bullet.remaining;
    }

    //expire => remove Bullet
    if (bullet.expire) {
      scene.getObjectByProperty('uuid', AllBullets[bullet.ID].uuid).geometry.dispose();
      scene.getObjectByProperty('uuid', AllBullets[bullet.ID].uuid).material.dispose();
      scene.remove(AllBullets[bullet.ID]);

      delete AllBullets[bullet.ID];
    }
  });

  socket.on('GPS', data => {
    if (ValidName) {
      const LP = data[socket.id].lastPosition;
      playerPosition.position.set(LP.x, LP.y, LP.z);
      player.position.copy(playerPosition.position);

      Object.entries(data)
        .filter(([x]) => x !== socket.id) // not myself
        .map(([ID, curr]) => {
          if (typeof curr.validName !== 'undefined' && curr.validName) {
            if (!KnownPlayer[ID]) {
              // not known
              const tempObj = new THREE.Object3D();
              tempObj.position.set(curr.lastPosition.x, curr.lastPosition.y, curr.lastPosition.z);
              scene.add(tempObj);

              const newSphere = World.player(curr.color);
              newSphere.add(model.clone());
              newSphere.name = 'player';
              newSphere.rotation.y = curr.rotation;
              tempObj.add(newSphere);

              //console.log(model.name);
              //console.log(newSphere.children[0].name);

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
              if (curr.weapon.IsReloading) {
                KnownPlayer[ID].getObjectByName(model.name).rotation.x = Math.PI;
              } else {
                KnownPlayer[ID].getObjectByName(model.name).rotation.x = Math.PI / -2;
              }
              KnownPlayer[ID].position.set(
                curr.lastPosition.x,
                curr.lastPosition.y,
                curr.lastPosition.z,
              );
            }
          }
        });
    }
  });

  socket.on('damage', remainigHealth => {
    var newEle = document.createElement('div');
    newEle.classList.add('damage');
    document.body.prepend(newEle);
    setTimeout(() => {
      newEle.remove();
    }, 1000);

    const MAX_HEALTH = 100;
    const HSL_PERCENT = remainigHealth / MAX_HEALTH;
    const MAX_HSL = 90;

    var healthpointsFill = document.getElementById('healthpoints-fill');
    healthpointsFill.style.width = remainigHealth + '%';
    healthpointsFill.style.backgroundColor = `hsl(${HSL_PERCENT * MAX_HSL}, 85%, 50%)`;
  });

  socket.on('kills', killCount => {
    document.getElementById('kill-counter').textContent = killCount;
  });

  socket.on('invalidGPS', data => {
    console.log('invalid->', data[socket.id]);
    const {x, y, z} = data[socket.id].lastPosition;
    playerPosition.position.set(x, y, z);
  });

  socket.on('Chat', ({message, name, color}) => {
    let newEle = document.createElement('p');
    var innerChat = document.getElementById('innerChat');

    newEle.innerHTML = `<span style=\"color:${color}\">${name}:</span> ${message}`;
    innerChat.appendChild(newEle);

    innerChat.scrollTop = innerChat.scrollHeight;
  });

  socket.on('playerLeft', id => {
    if (KnownPlayer.hasOwnProperty(id)) {
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
    }
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

// // DOM-EVENTS // //

document.addEventListener(
  'mousemove',
  event => {
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
  const targetID = e.target.id;
  if (targetID.indexOf('PlayerName') === -1 && targetID.indexOf('options') === -1)
    socket.emit('shot', {...model.getWorldPosition(new THREE.Vector3())});
});

document.addEventListener('keydown', e => {
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

document.getElementById('PlayerName-input').addEventListener('keyup', e => {
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Enter') {
    socket.emit('Username', e.target.value);
  }
});

// OPTIONS

var displayToggle = true;

const toggleOptions = function (e) {
  document.getElementById('options-arrow').classList.toggle('rotate');
  document
    .getElementById('options-options')
    .style.setProperty('display', displayToggle ? 'block' : 'none');
  displayToggle = !displayToggle;
};

document.getElementById('options-img').addEventListener('click', toggleOptions);
document.getElementById('options-arrow').addEventListener('click', toggleOptions);

document.getElementById('options-devStage-checkbox').addEventListener('change', function () {
  document.getElementById('devStage').style.setProperty('display', this.checked ? 'block' : 'none');
});

document.getElementById('options-sound-checkbox').addEventListener('change', function () {
  playSound = this.checked;
});

// // DEV:
//socket.emit('Username', 'e.target.value');
// // // //
