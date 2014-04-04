(function() {
    "use strict";

    var walk = require('walk'), fs = require('fs'), options, walker, exif = require('./exiftool.js');
    var sys = require('sys')
    var exec = require('child_process').exec;
    var child;

    var results = [];
    var lastFileReached = false;

    options = {
        followLinks : false
        ,
        filters : [ "Temp", "_Temp" ]
    };

    walker = walk.walk("sampleImages", options);

    walker.on("names", function(root, nodeNamesArray) {
        nodeNamesArray.sort(function(a, b) {
            if (a < b)
                return 1;
            if (a > b)
                return -1;
            return 0;
        });
    });

    walker.on("directories", function(root, dirStatsArray, next) {
        next();
    });

    walker.on("file", function(root, fileStats, next) {
        var imgFile = root + '/' + fileStats.name;
        sys.print(imgFile + '\n');

        exif.getExifFromLocalFileUsingNodeFs(fs, imgFile, function(someexif) {
            child = exec("exiftool -q -q -F -j " + imgFile, function(error,
                    stdout, stderr) {
                if (error !== null) {
                    console.log('exec error with ' + imgFile+ ': ' + error);
                } else {

                    // stdout string takes some munging...
                    var stdStr = String(stdout);
                    stdStr = stdStr.replace(/\r?\n|\r/g, ""); // lose newlines
                    stdStr = stdStr.substring(1, stdStr.length - 1); // lose surrounding []

                    results.push({
                        "img" : imgFile,
                        "exifJS" : someexif,
                        "exifPerl" : JSON.parse(stdStr)
                    });

                    if (lastFileReached) {
                        fs.writeFile('results.json', JSON.stringify(results,
                                null, 4), function(err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log("JSON saved");
                            }
                        });
                    }
                }
                next();
            });

        });
    });
    walker.on("end", function() {
        lastFileReached = true;
    });
}());
