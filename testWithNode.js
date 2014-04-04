(function() {
    "use strict";

    var walk = require('walk'), fs = require('fs'), options, walker, exif = require('./exiftool.js');
    var sys = require('sys')
    var exec = require('child_process').exec;
    var child;

    var results = []; // store the responses from js and perl exiftools

    var currentRoot = ''; // aka, current directory

    var reportFiles = []; // list of each of the report filenames
    var totalFiles = 0; // count of all jpeg files
    var totalSupportedTags = 0; // count of all tag values that were identical
    var totalUnsupportedTags = 0; // count of all tag values that were not identical
    var totalSupportedTagsByModel = {};
    var totalUnsupportedTagsByModel = {};

    /**
     * Write a summary html file (report/index.html) which summarises the exiftool support and links to the other html files
     */
    var writeSummary = function() {
        var html = "<p>"+totalFiles+ " total files</p>";
        html += "<p>"+totalSupportedTags+ " total supported tags</p>";
        html += "<p>"+totalUnsupportedTags+ " total unsupported tags</p>";
        html += "<ul>";
        
        for (var key in reportFiles) {
            html += "<li><a href='"+reportFiles[key]+"'>"+reportFiles[key]+"</a> Supported: "+totalSupportedTagsByModel[reportFiles[key]]+", Unsupported: "+totalUnsupportedTagsByModel[reportFiles[key]]+"</li>";
        }
        html += "</ul>";

        fs.readFile('report/template.html', 'utf8', function(err, data) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(/htmlbody/g, html);

            var reportFile = 'report/index.html';
            fs.writeFile(reportFile, result, 'utf8', function(err) {
                if (err) {
                    return console.log(err);
                } else {
                    console.log(reportFile + " written\n");
                }
            });
        });
    }

    /**
     * Stash the json for the current directory (manufacturer) into a json file.
     * This also then generated the html report for that manufacturer by using that json file.
     */
    var stashJson = function(json) {
        if (results.length > 0) {
            var pathString = currentRoot.replace(/\//g, "-");
            var jsonFile = 'results/' + pathString + '.json';
            fs.writeFile(jsonFile, JSON.stringify(results, null, '\t'),
                    function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("\n" + jsonFile + " written");
                        }
                        results = [];
                    });

            var supportedTags = "";
            var html = "<table class='table table-bordered'>"
                        + "<thead><tr>"
                        + "<th>image</th>"
                        + "<th>supported tags</th>"
                        + "<th>unsupported tags (perl output, followed by js output)</th>"
                        + "</tr></thead><tbody>";

            var totalSupportedByThisModel = 0;
            var totalUnsupportedByThisModel = 0;
            
            for (var i = 0; i < results.length; i++) {

                totalFiles++;
                var supportedTags = [];
                var unsupportedTags = [];
                for ( var key in results[i].exifJS) {
                    if (results[i].exifJS[key] == results[i].exifPerl[key]) {
                        supportedTags.push(key);
                        totalSupportedTags++;
                        totalSupportedByThisModel++;
                    } else {
                        unsupportedTags.push(key + " : "
                                + results[i].exifPerl[key] + "<br>" + key
                                + " : " + results[i].exifJS[key] + "<br>");
                        totalUnsupportedTags++;
                        totalUnsupportedByThisModel++;
                    }
                }
                var rowHtml = "<tr>";
                rowHtml += "<td>" + results[i].img + "</td>";
                rowHtml += "<td>" + supportedTags.join("<br>") + "</td>";
                rowHtml += "<td>" + unsupportedTags.join("<br>") + "</td>";
                rowHtml += "</tr>";

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
                        console.log(reportFile + " written\n");
                        reportFiles.push(pathString + '.html');
                        totalSupportedTagsByModel[pathString + '.html'] = totalSupportedByThisModel;
                        totalUnsupportedTagsByModel[pathString + '.html'] = totalUnsupportedByThisModel;
                        writeSummary();
                    }
                });
            });
        }
    }

    options = {
        followLinks : false
    };

    walker = walk.walk("sampleImages", options);

    walker.on("names", function(root, nodeNamesArray) {
        if (root != currentRoot) {
            stashJson(results);
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
        sys.print(imgFile + '\n');

        exif.getExifFromLocalFileUsingNodeFs(fs, imgFile, function(exifFromJS) {
            child = exec("exiftool -q -q -F -j " + imgFile, function(error,
                    stdout, stderr) {
                if (error !== null) {
                    console.log('exec error with ' + imgFile + ': ' + error);
                } else {

                    // stdout string takes some munging...
                    var exifFromPerl = String(stdout);
                    exifFromPerl = exifFromPerl.replace(/\r?\n|\r/g, ""); // lose newlines
                    exifFromPerl = exifFromPerl.substring(1,
                            exifFromPerl.length - 1); // lose surrounding []

                    results.push({
                        "img" : imgFile,
                        "exifJS" : exifFromJS,
                        "exifPerl" : JSON.parse(exifFromPerl)
                    });
                }
                next();
            });

        });
    });
    walker.on("end", function() {
        stashJson();
    });
}());
