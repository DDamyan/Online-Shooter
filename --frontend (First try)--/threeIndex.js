//github comit test
let scene,
  controls,
  camera,
  cameraOrbit,
  playerOrbit,
  playerPosition,
  renderer,
  map = {},
  PlayerModel,
  actions = {},
  validKeys = ['a', 's', 'd', 'w', ' '],
  Shift = 1.0,
  mixer,
  Jumped = false,
  JumpHeight = 4,
  dir = new THREE.Vector3(),
  playerSpeed = 8,
  clock = new THREE.Clock();

/*
  //TODO: Animation beim springen: https://stackoverflow.com/questions/49934594/three-js-animate-from-one-position-to-another
const createMoveAnimation = ({mesh, startPosition, endPosition}) => {
  mesh.userData.mixer = new THREE.AnimationMixer(mesh);
  let track = new THREE.VectorKeyframeTrack(
    '.position',
    [0, 1],
    [
      startPosition.x,
      startPosition.y,
      startPosition.z,
      endPosition.x,
      endPosition.y,
      endPosition.z,
    ],
  );
  const animationClip = new THREE.AnimationClip(null, 5, [track]);
  const animationAction = mesh.userData.mixer.clipAction(animationClip);
  animationAction.setLoop(THREE.LoopOnce);
  animationAction.play();
  mesh.userData.clock = new THREE.Clock();
  //this.animationsObjects.push(mesh);
};*/

function init() {
  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setClearColor('#808080', 1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = '#efefef';

  cameraOrbit = new THREE.Object3D();
  cameraOrbit.position.y = 3;

  playerOrbit = new THREE.Object3D();
  playerPosition = new THREE.Object3D();
  playerPosition.add(playerOrbit);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 10;
  cameraOrbit.add(camera);
  scene.add(cameraOrbit);

  controls = new THREE.PointerLockControls(cameraOrbit, document.body);
  controls.minPolarAngle = Math.PI / 2.3;
  controls.maxPolarAngle = Math.PI / 1.1;

  const light = new THREE.AmbientLight(0x404040, 3);
  scene.add(light);

  let loader = new THREE.GLTFLoader();
  loader.load('models/Robot/scene.gltf', function (gltf) {
    model = gltf.scene.children[0];
    model.scale.set(0.3, 0.3, 0.3);
    //model.add(new THREE.AxesHelper(5));

    PlayerModel = gltf.scene;
    PlayerModel.position.z = -1;
    playerOrbit.add(PlayerModel);
    scene.add(playerPosition);

    //console.log(gltf);

    mixer = new THREE.AnimationMixer(model);

    actions.walk = mixer.clipAction(gltf.animations[0]);
    actions.walk.setLoop(THREE.LoopRepeat);
    actions.walk.clampWhenFinished = false;
    actions.walk.setDuration(0.5);
    //actions.walk.enabled = false;

    actions.idle = mixer.clipAction(gltf.animations[2]);
    actions.idle.setLoop(THREE.LoopRepeat);
    actions.idle.clampWhenFinished = false;
    //actions.idle.enabled = false;
    actions.idle.setDuration(7);
    actions.idle.play();
  });

  scene.add(new THREE.GridHelper(20, 20, '#ffffff', '#ffffff'));
  scene.add(new THREE.AxesHelper(20));
}

// setInterval(() => {
//   console.log(playerPosition.position);
// }, 1000);

function animate() {
  requestAnimationFrame(animate);
  if (controls.isLocked) {
    var delta = clock.getDelta();

    var NoMove = true,
      Forward = false,
      Backward = false,
      PlusRotation = 0;

    for (const [Key, Value] of Object.entries(map)) {
      if (Value === true) {
        dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        var angl = Math.atan2(dir.x, dir.z);

        NoMove = false;

        if (Shift === 1) {
          actions.idle.play();
          actions.walk.play();
          actions.walk.setEffectiveWeight(0.5);
          actions.idle.setEffectiveWeight(0.5);
          actions.walk.setDuration(0.5);
        } else {
          actions.idle.stop();
          actions.walk.play();
          actions.walk.setDuration(0.5);
          actions.walk.setEffectiveWeight(1);
        }

        switch (Key) {
          case 'w':
            //playerOrbit.translateZ(playerSpeed * Shift * delta);
            playerPosition.translateZ(playerSpeed * Shift * delta);
            Forward = true;
            break;
          case 's':
            //playerOrbit.translateZ(-playerSpeed * delta);
            playerPosition.translateZ(-playerSpeed * delta);
            actions.walk.setDuration(-0.5);
            Backward = true;
            break;
          case 'a':
            //playerOrbit.translateX(playerSpeed * Shift * delta);
            playerPosition.translateX(playerSpeed * Shift * delta);
            PlusRotation += Math.PI / 2;
            break;
          case 'd':
            //playerOrbit.translateX(-(playerSpeed * Shift) * delta);
            playerPosition.translateX(-(playerSpeed * Shift) * delta);
            PlusRotation += Math.PI / -2;
            break;

          case ' ':
            if (!Jumped) {
              Jumped = true;

              playerPosition.translateY(JumpHeight);
            }
            break;

          default:
            console.warn('Key not registert!');
            break;
        }

        //model.rotation.z = PlusRotation;
        playerPosition.rotation.y = angl;
      }
    }

    if (PlayerModel) {
      //model.rotation.z = Forward ? PlusRotation / 2 : PlusRotation ? PlusRotation : 0;

      if (Forward) {
        playerOrbit.rotation.y = PlusRotation / 2;
      } else if (Backward) {
        if (PlusRotation) playerOrbit.rotation.y = PlusRotation * 1.5;
        else playerOrbit.rotation.y = Math.PI;
      } else {
        if (PlusRotation) playerOrbit.rotation.y = PlusRotation;
      }
      //}

      if (playerPosition.position.y > 0) {
        playerPosition.position.y -= 0.1;
      } else {
        Jumped = false;
      }

      cameraOrbit.position.copy(
        new THREE.Vector3(
          playerPosition.position.x,
          playerPosition.position.y + 3,
          playerPosition.position.z,
        ),
      );

      if (NoMove) {
        actions.walk.stop();
        actions.idle.play();
        actions.idle.setEffectiveWeight(1);
      }
    }
  }
  if (mixer) {
    mixer.update(delta);
  }

  renderer.render(scene, camera);
}

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
});

document.addEventListener('keyup', e => {
  var pressedKey = e.key.toLowerCase();
  if (Object.keys(map).indexOf(pressedKey) !== -1) map[pressedKey] = false;
  if (e.key === 'Shift') Shift = 1;
});

document.addEventListener('click', function () {
  controls.isLocked ? controls.unlock() : controls.lock();
});

document.addEventListener('wheel', e => {
  var deltaY = e.deltaY,
    v = deltaY > 0 ? 1 : -1;
  if (camera.position.z + v < 20 && camera.position.z + v > 3) camera.position.z += v;
});

init();
animate();
