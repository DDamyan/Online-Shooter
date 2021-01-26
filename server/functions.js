exports.WeaponInRange = function (weapon, player) {
  return weapon < player + 1 && weapon > player - 1;
};

const InRange = function (num1, num2) {
  var HitRadius = 0.9;
  return num1 + HitRadius > num2 && num1 - HitRadius < num2;
};

exports.CheckHIT = function (players, bulletPos, socketID) {
  var Hitted = null;
  Object.entries(players)
    .filter(([ID, res]) => {
      return ID !== socketID && res.hasOwnProperty('validName');
    })
    .map(([curr_ID, {lastPosition}]) => {
      if (InRange(lastPosition.x, bulletPos.x) && InRange(lastPosition.z, bulletPos.z))
        Hitted = curr_ID;
    });
  return Hitted;
};

exports.RDM = function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};
