import * as THREE from 'https://unpkg.com/three@0.123.0/build/three.module.js';

// var font;
// new THREE.FontLoader().load('./font/helvetiker_regular.typeface.json', function (_font) {
//   font = _font;
// });

export const World = {
  player: color => {
    return new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 10),
      new THREE.MeshPhongMaterial({color}),
    );
  },
  laser: new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 50),
    new THREE.MeshBasicMaterial({color: 0x90ee90, transparent: true, opacity: 0.3}),
  ),
  // textGeometry: text => {
  //   new THREE.FontLoader().load('./font/helvetiker_regular.typeface.json', function (font) {
  //     new THREE.TextGeometry(text, {
  //       font,
  //       size: 80,
  //       height: 5,
  //       curveSegments: 12,
  //       bevelEnabled: false,
  //     });
  //     });

  // },
  bullet: () =>
    new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.15, 1),
      new THREE.MeshBasicMaterial({color: 0xcf9611}),
    ),
  ground: new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10, 1, 1),
    new THREE.MeshBasicMaterial({color: '#5f9aba'}),
  ),
  camera: () => {
    let cam = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cam.position.z = 10;
    cam.position.y = 4;
    return cam;
  },
  AmbientLight: new THREE.AmbientLight(0x404040, 4),
  directionalLight: new THREE.DirectionalLight(0xffffff, 2),
  renderer: () => {
    let ren = new THREE.WebGLRenderer({antialias: true});
    ren.setClearColor('#808080', 1);
    ren.setSize(window.innerWidth, window.innerHeight);
    return ren;
  },
  scene: () => {
    let sc = new THREE.Scene();
    sc.background = '#efefef';
    return sc;
  },
};
