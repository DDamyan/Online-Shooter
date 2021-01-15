// Versuch mit Klasse!!!
// export default class Player {
//   mam = 'pap';
//   constructor(_ID, _POS, _COLOR) {
//     this._id = _ID;
//     this.position = _POS;
//     this._color = _COLOR;
//   }

//   set position(newPos) {
//     this._position = newPos;
//   }

//   get position() {
//     return this._position;
//   }
// }
// // // // // // // // // // // // // // // // //

export default function Player(par_ID, par_POS, par_COLOR) {
  //private
  let _ID, _POS, _COLOR;

  var obj = {};

  Object.defineProperty(obj, 'id', {
    get() {
      return _ID;
    },
    set(val) {
      _ID = val;
    },
  });
  Object.defineProperty(obj, 'color', {
    get() {
      return _COLOR;
    },
    set(val) {
      _COLOR = val;
    },
  });
  Object.defineProperty(obj, 'position', {
    get() {
      return _POS;
    },
    set(val) {
      _POS = val;
    },
  });

  obj.id = par_ID;
  obj.position = par_POS;
  obj.color = par_COLOR;

  return obj;
  //   return {
  //     //public
  //     set ID(val) {
  //       _ID = val;
  //     },
  //     get ID() {
  //       return _ID;
  //     },

  //     set position(val) {
  //       _POS = val;
  //     },
  //     get position() {
  //       return _POS;
  //     },

  //   };
}
