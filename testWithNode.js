(function() {
    "use strict";

    var walk = require('walk'), fs = require('fs'), options, walker, exif = require('./exiftool.js');
    var sys = require('sys')
    var exec = require('child_process').exec;
    var Gomfunkel = require('exif').ExifImage;    
    var child;

    //var results = []; // store the responses from js and perl exiftools

    var currentRoot = ''; // aka, current directory

    var reportFiles = []; // list of each of the report filenames
    var totalFiles = 0; // count of all jpeg files

    // Totals for exiftool.js vs perl exiftool
    var totalSupportedTagsByETJS = 0; // count of all tag values that were identical
    var totalUnsupportedTagsByETJS = 0; // count of all tag values that were not identical
    var totalSupportedTagsByModelByETJS = {};
    var totalUnsupportedTagsByModelByETJS = {};

    // Totals for Gomfunkel.js vs perl exiftool
    var totalSupportedTagsByGF = 0; // count of all tag values that were identical
    var totalUnsupportedTagsByGF = 0; // count of all tag values that were not identical
    var totalSupportedTagsByModelByGF = {};
    var totalUnsupportedTagsByModelByGF= {};


    var toSupportTable = function(etjsMatch, etjsDiff, gfMatch, gfDiff) {
        return "<table class='table table-bordered'>" +
            "<tr><th>exiftool.js</th><td>" + etjsMatch + "/" + (etjsDiff+etjsMatch) + "</td></tr>\n"+
            "<tr><th>Gomfunkel</th><td>" + gfMatch + "/" + (gfDiff+gfMatch) + "</td></tr>\n"+
            "</table>";
    }
    var toSupportLine = function(etjsMatch, etjsDiff, gfMatch, gfDiff) {
        return "exiftool.js: " + etjsMatch + "/" + (etjsDiff+etjsMatch) + ", Gomfunkel: " + gfMatch + "/" + (gfDiff+gfMatch);
    }

    /**
     * Write a summary html file (report/index.html) which summarises the exiftool support and links to the other html files
     */
    var writeSummary = function() {
        var html = "<p>"+totalFiles+ " total files</p>";
        html += "<h3>Total tag support</h3>" +
            toSupportTable(totalSupportedTagsByETJS, totalUnsupportedTagsByETJS, totalSupportedTagsByGF, totalUnsupportedTagsByGF) + "</li>\n";
        html += "<h3>Manfacturer tag support</h3>";
        
        html += "<table class='table table-bordered'><tr><th>File</th><th>exiftool</th><th>exiftool.js</th><th>Gomfunkel</th></tr>";

        for (var key in reportFiles) {
            html += "<tr><td><a href='"+reportFiles[key]+"'>" + reportFiles[key] + "</a></td>"+
                "<td>" + (totalSupportedTagsByModelByETJS[reportFiles[key]] + totalUnsupportedTagsByModelByETJS[reportFiles[key]]) + "</td>" +
                "<td>" + totalSupportedTagsByModelByETJS[reportFiles[key]] + "</td>" +
                "<td>" + totalSupportedTagsByModelByGF[reportFiles[key]] + "</td></tr>\n";
        }
        html += "<tr>" +
                "<th>Totals</th>" +
                "<th>" + (totalSupportedTagsByETJS + totalUnsupportedTagsByETJS) + "</th>" +
                "<th>" + totalSupportedTagsByETJS + "</th>" +
                "<th>" + totalSupportedTagsByGF + "</th></tr>\n";
        html += "</table>";

        fs.readFile('report/template.html', 'utf8', function(err, data) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(/htmlbody/g, html);

            var reportFile = 'report/index.html';
            fs.writeFile(reportFile, result, 'utf8', function(err) {
                if (err) {
                    return console.log(err);
                }
            });
        });
    }

    var sortObject = function(o) {
        var sorted = {},
        key, a = [];

        for (key in o) {
            if (o.hasOwnProperty(key)) {
                a.push(key);
            }
        }

        a.sort();

        for (key = 0; key < a.length; key++) {
            sorted[a[key]] = o[a[key]];
        }
        return sorted;
    }


    /**
     * Stash the json for the current directory (manufacturer) into a json file.
     * This also then generates the html report for that manufacturer by using that json file.
     */
    var stashJson = function(json) {
        if (json.exifPerl) {
            var pathString = json.img.replace(/\//g, "-");
            var jsonFile = 'results/' + pathString + '.json';
            fs.writeFile(jsonFile, JSON.stringify(json, null, '\t'),
                    function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(jsonFile + " written");
                        }
                    });


            var totalSupportedByThisModelETJS = 0;
            var totalUnsupportedByThisModelETJS = 0;
            var totalSupportedByThisModelGF = 0;
            var totalUnsupportedByThisModelGF = 0;
            
            var html = "<table class='table table-bordered'>"
                    + "<thead><tr>"
                    + "<th>image</th>"
                    + "<th>tag</th>"
                    + "<th>exiftool</th>"
                    + "<th>exiftool.js</th>"
                    + "<th>Gomfunkel</th>"
                    + "</tr></thead>\n<tbody>\n";
            totalFiles++;
            var firstRow = true;
            for (var key in json.exifPerl) {
                var rowHtml = "<tr>\n";
                if (firstRow) {
                    rowHtml += "<th rowspan='" + Object.keys(json.exifPerl).length + "'>" + json.img + "</th>\n";
                    firstRow = false;
                }

                rowHtml += "<td>" + key + "</td>\n";
                rowHtml += "<td>" + json.exifPerl[key] + "</td>\n";

                if (json.exifJS[key] == json.exifPerl[key]) {
                    rowHtml += "<td class='match'>" + json.exifJS[key] + "</td>\n";
                    totalSupportedTagsByETJS++;
                    totalSupportedByThisModelETJS++;
                } else {
                    if (typeof json.exifJS[key] === 'undefined') {
                        rowHtml += "<td class='missing'>-</td>\n";
                    } else {
                        rowHtml += "<td class='diff'>" + json.exifJS[key] + "</td>\n";
                    }
                    totalUnsupportedTagsByETJS++;
                    totalUnsupportedByThisModelETJS++;
                }
                if (json.exifGomfunkel[key] == json.exifPerl[key]) {
                    rowHtml += "<td class='match'>" + json.exifGomfunkel[key] + "</td>\n";
                    totalSupportedTagsByGF++;
                    totalSupportedByThisModelGF++;
                } else {
                    if (typeof json.exifGomfunkel[key] === 'undefined') {
                        rowHtml += "<td class='missing'>-</td>\n";
                    } else {
                        rowHtml += "<td class='diff'>" + json.exifGomfunkel[key] + "</td>\n";
                    }
                    totalUnsupportedTagsByGF++;
                    totalUnsupportedByThisModelGF++;
                }
                rowHtml += "</tr>\n";
                html += rowHtml;
            }
            html += "</tbody></table>";
            

            fs.readFile('report/template.html', 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                var result = data.replace(/htmlbody/g, html);

                var reportFile = 'report/' + pathString + '.html';
                fs.writeFile(reportFile, result, 'utf8', function(err) {
                    if (err) {
                        return console.log(err);
                    } else {
                        console.log(reportFile + " written");
                        reportFiles.push(pathString + '.html');
                        totalSupportedTagsByModelByETJS[pathString + '.html'] = totalSupportedByThisModelETJS;
                        totalUnsupportedTagsByModelByETJS[pathString + '.html'] = totalUnsupportedByThisModelETJS;
                        totalSupportedTagsByModelByGF[pathString + '.html'] = totalSupportedByThisModelGF;
                        totalUnsupportedTagsByModelByGF[pathString + '.html'] = totalUnsupportedByThisModelGF;
                        writeSummary();
                    }
                });
            });
        }
    }

    options = {
        followLinks : false
    };

//walker = walk.walk("sampleImages/Samsung", options);
    walker = walk.walk("sampleImages", options);
    //walker = walk.walk("sampleImages/_Other", options);

    walker.on("names", function(root, nodeNamesArray) {
        if (root != currentRoot) {
//            stashJson(results);
        }
        currentRoot = root;

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
//        sys.print(imgFile + '\n');

        if (fileStats.name == 'PanasonicDMC-GM1.jpg'
         || fileStats.name == 'PanasonicDMC-GX7.jpg'
         || fileStats.name == 'PanasonicDMC-SZ5.jpg'
         || fileStats.name == 'PanasonicDMC-XS3.jpg'
         || fileStats.name == 'IMG_6756.JPG'
         || fileStats.name == 'big file - IMG_6756.JPG'
         || fileStats.name == 'SamsungGT-I9100.jpg'
            ) {
            // Skip these files and they get stuck in infinite loops!
            next();
        } else {
            exif.getExifFromLocalFileUsingNodeFs(fs, imgFile, function(exifFromJS) {
                try {
                    console.log("processing: " + imgFile);
                    new Gomfunkel({ image : imgFile }, function (error, exifFromGomfunkel) {
                        if (error) {
                            console.log('Gomfunkel Error: '+error.message);
                            next();
                        } else {
                            // Loop over any children like "exif", "image" or "makernote" 
                            for (var key in exifFromGomfunkel) {
                                // ...then loop over their children moving them up to the root
                                for (var exifKey in exifFromGomfunkel[key]) {
                                    // skip Objects
                                    var valueType = Object.prototype.toString.call(exifFromGomfunkel[key][exifKey]);
                                    if (valueType != "[object Object]") {
                                        exifFromGomfunkel[exifKey] = exifFromGomfunkel[key][exifKey];
                                    }
                                };
                                if (typeof exifFromGomfunkel[key] === 'object') {
                                    delete exifFromGomfunkel[key];
                                }
                            };

                            exifFromGomfunkel = sortObject(exifFromGomfunkel);

                            child = exec("exiftool -q -q -F -j --FileAccessDate --FileModifyDate --FileInodeChangeDate --SourceFile --ExifToolVersion --FileName --Directory --FilePermissions --FileSize --FileModifyDate --FileType --MIMEType '" + imgFile + "'", function(error,
                                    stdout, stderr) {
                                if (error !== null) {
                                    console.log('exec error with ' + imgFile + ': ' + error);
                                } else {

                                    // stdout string takes some munging...
                                    var exifFromPerl = String(stdout);
                                    exifFromPerl = exifFromPerl.replace(/\r?\n|\r/g, ""); // lose newlines
                                    exifFromPerl = exifFromPerl.substring(1,
                                            exifFromPerl.length - 1); // lose surrounding []
                                    exifFromPerl = JSON.parse(exifFromPerl);
                                    delete exifFromPerl["SourceFile"];
                                    exifFromPerl = sortObject(exifFromPerl);

                                    var results = {
                                        "img" : imgFile,
                                        "exifJS" : exifFromJS,
                                        "exifGomfunkel" : exifFromGomfunkel,
                                        "exifPerl" : exifFromPerl
                                    };
                                    stashJson(results);
                                }
                                next();
                            });
                        }
                    });
                } catch (error) {
                    console.log('Error: ' + error.message);
                    next();
                }
            });
        }
    });
}());
