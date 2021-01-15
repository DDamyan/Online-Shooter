//import Player123 from './Players.js';

let scene,
  camera,
  coords_camera,
  cam_tween,
  renderer,
  player,
  playerPosition,
  weapon,
  map = {},
  validKeys = ['a', 's', 'd', 'w'],
  Shift = 1.0,
  dir = new THREE.Vector3(),
  playerSpeed = 8,
  clock = new THREE.Clock();

function init() {
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setClearColor('#808080', 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = '#efefef';

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  camera.position.y = 4;

  var Ground = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 1, 1),
    new THREE.MeshBasicMaterial({color: '#5f9aba'}),
  );
  Ground.rotateX(Math.PI / -2);
  scene.add(Ground);

  player = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 20),
    new THREE.MeshPhongMaterial({color: 0x942b2b}),
  );
  player.position.y = player.geometry.parameters.radius;
  //player.add(camera);
  //scene.add(player);

  scene.add(camera);

  //tween_camera = new TWEEN.Tween(camera.position);

  playerPosition = new THREE.Object3D();
  playerPosition.position.copy(player.position);
  scene.add(playerPosition);

  let loader = new THREE.GLTFLoader();
  loader.load('models/scene.gltf', gltf => {
    var model = gltf.scene.children[0];
    console.log(model);
    model.scale.set(0.003, 0.003, 0.003);
    model.position.set(player.geometry.parameters.radius, -0.5 * player.position.y, 0);

    //scene.add(gltf.scene);
    player.add(model);
    scene.add(player);
  });

  // const spotLight = new THREE.SpotLight(0xffffff, 2, 15);
  // spotLight.position.y = 5;
  // spotLight.position.x = 2;
  // player.add(spotLight);

  const light = new THREE.AmbientLight(0x404040, 4);
  scene.add(light);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  scene.add(directionalLight);

  //DEV // //
  //scene.add(new THREE.SpotLightHelper(spotLight));
  //scene.add(new THREE.DirectionalLightHelper(directionalLight, 5));
  //player.add(new THREE.AxesHelper(5));
  //playerPosition.add(new THREE.AxesHelper(5));
  //scene.add(new THREE.GridHelper(20, 20, '#ffffff', '#ffffff'));
  //scene.add(new THREE.AxesHelper(20));
  //const controls = new THREE.OrbitControls(camera, renderer.domElement);
  // // // //
}

function animate() {
  requestAnimationFrame(animate);
  var delta = clock.getDelta();

  playerPosition.rotation.y = 0;

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

      SocketSentGPS({position: {...playerPosition.position}, delta, playerSpeed});
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

  //SocketSentGPS(playerPosition.position);
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
  var pressedKey = e.key.toLowerCase();
  if (validKeys.indexOf(pressedKey) !== -1) map[pressedKey] = true;
  if (e.key === 'Shift') Shift = 1.5;
  //console.log(tween_camera);
  //tween_camera.stop();
  //tween_camera = new TWEEN.Tween(camera.position);
  //tween_camera.repeat(Infinity);
  //tween_camera.start();
  //camera.lookAt(player.position);
});

document.addEventListener('keyup', e => {
  var pressedKey = e.key.toLowerCase();
  if (Object.keys(map).indexOf(pressedKey) !== -1) map[pressedKey] = false;
  if (e.key === 'Shift') Shift = 1;
});

document.addEventListener(
  'mousemove',
  event => {
    // mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    // mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    player.rotation.y =
      Math.atan2(
        -(event.clientY / window.innerHeight) * 2 + 1,
        (event.clientX / window.innerWidth) * 2 - 1,
      ) +
      Math.PI / 2 -
      0.1;
    // console.log(
    //   'PR:',
    //   player.rotation.y,
    //   'Y:',
    //   -(event.clientY / window.innerHeight) * 2 + 1,
    //   'X:',
    //   (event.clientX / window.innerWidth) * 2 - 1,
    // );
    // console.log('X:', (event.clientX / window.innerWidth) * 2 - 1);
    // player.lookAt(
    //   1,
    //   -(event.clientY / window.innerHeight) * 2 + 1,
    //   (event.clientX / window.innerWidth) * 2 - 1,
    // );
  },
  false,
);

ConnectWebsocket = () => {
  const socket = io('http://localhost:8080', {transports: ['websocket']});

  const getOtherPlayers = _obj => Object.entries(_obj).filter(val => val.indexOf(socket.id) === -1);

  var KnownPlayer = [];

  SocketSentGPS = _par => {
    socket.emit('GPS', _par);
  };

  socket.on('connect', () => {
    console.warn('Connected!');
    socket.emit('firstGPS', {position: {...playerPosition.position}});
  });

  socket.on('newPlayer', data => {
    const otherPlayers = getOtherPlayers(data);
    otherPlayers.filter(val => console.log('NEW:', val)); //.map(([_ /*ID*/, curr]) => scene.add(getNewPlayer(curr.color)));
  });

  socket.on('disconnect', () => {
    console.warn('Disconnected');
  });

  socket.on('GPS', data => {
    const LP = data[socket.id].lastPosition;
    playerPosition.position.set(LP.x, LP.y, LP.z);

    //const otherPlayers = Object.entries(data).filter(val => val.indexOf(socket.id) === -1);
    const otherPlayers = getOtherPlayers(data);
    //KnownPlayer = [];
    //otherPlayers.map(([ID, curr]) => KnownPlayer.push({[ID]: curr.lastPosition}));
    Object.entries(data).map(([ID, curr]) => {
      if (KnownPlayer.indexOf(ID) === -1) {
        // not known
        KnownPlayer.push(ID);
        console.log('added -> ', ID);
      }
    });
    //console.log(Object.entries(data));
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
};

init();
ConnectWebsocket();
animate();
