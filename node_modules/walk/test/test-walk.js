(function () {
  "use strict";

  var walk = require('../lib/walk').walk
    , walker
    ;

  walker = walk('./');
  walker.on('file', function (root, stat, next) {
    console.log(root, stat.name);
    next();
  });

}());
