// var p = document.createElement('p');
// p.textContent = 'Paragraph';

// document.body.appendChild(p);

var counter = 0;
const socket = io('http://localhost:8080', {transports: ['websocket']});

socket.on('connect', () => {
  var ConStat = document.getElementById('ConnectionStatus');
  ConStat.textContent = 'Connected';
  ConStat.style.color = 'green';
});

setInterval(() => {
  socket.emit('GPS', playerPosition.position);
}, 1000);

socket.on('GPS', data => {
  console.log(data);
});

// function sendPosition() {
//   socket.emit('GPS', playerPosition.position);
// }
