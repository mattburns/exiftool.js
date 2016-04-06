/*
 * Javascript EXIF Reader - exiftool.js
 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
 * 
 */

(function() {

    var BinaryFile = function(strData, iDataOffset, iDataLength) {
        var data = strData;
        var dataOffset = iDataOffset || 0;
        var dataLength = 0;

        this.getRawData = function() {
            return data;
        }

        if (typeof strData == "string") {
            dataLength = iDataLength || data.length;

            this.getByteAt = function(iOffset) {
                return data.charCodeAt(iOffset + dataOffset) & 0xFF;
            }
        } else if (typeof strData == "unknown") {
            dataLength = iDataLength || IEBinary_getLength(data);

            this.getByteAt = function(iOffset) {
                return IEBinary_getByteAt(data, iOffset + dataOffset);
            }
        }

        this.getLength = function() {
            return dataLength;
        }

        this.getSByteAt = function(iOffset) {
            var iByte = this.getByteAt(iOffset);
            if (iByte > 127)
                return iByte - 256;
            else
                return iByte;
        }

        this.getShortAt = function(iOffset, bBigEndian) {
            var iShort = bBigEndian ? (this.getByteAt(iOffset) << 8)
                    + this.getByteAt(iOffset + 1) : (this
                    .getByteAt(iOffset + 1) << 8)
                    + this.getByteAt(iOffset)
            if (iShort < 0)
                iShort += 65536;
            return iShort;
        }
        this.getSShortAt = function(iOffset, bBigEndian) {
            var iUShort = this.getShortAt(iOffset, bBigEndian);
            if (iUShort > 32767)
                return iUShort - 65536;
            else
                return iUShort;
        }
        this.getLongAt = function(iOffset, bBigEndian) {
            var iByte1 = this.getByteAt(iOffset), iByte2 = this
                    .getByteAt(iOffset + 1), iByte3 = this
                    .getByteAt(iOffset + 2), iByte4 = this
                    .getByteAt(iOffset + 3);

            var iLong = bBigEndian ? (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8)
                    + iByte4
                    : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8)
                            + iByte1;
            if (iLong < 0)
                iLong += 4294967296;
            return iLong;
        }
        this.getSLongAt = function(iOffset, bBigEndian) {
            var iULong = this.getLongAt(iOffset, bBigEndian);
            if (iULong > 2147483647)
                return iULong - 4294967296;
            else
                return iULong;
        }
        this.getStringAt = function(iOffset, iLength) {
            var aStr = [];
            for (var i = iOffset, j = 0; i < iOffset + iLength; i++, j++) {
                aStr[j] = String.fromCharCode(this.getByteAt(i));
            }
            return aStr.join("");
        }

        this.getCharAt = function(iOffset) {
            return String.fromCharCode(this.getByteAt(iOffset));
        }
        this.toBase64 = function() {
            return btoa(data);
        }
        this.fromBase64 = function(strBase64) {
            data = atob(strBase64);
        }
    }

    var BinaryAjax = (function() {

        function createRequest() {
            var oHTTP = null;
            if (XMLHttpRequest) {
                oHTTP = new XMLHttpRequest();
            } else if (window.ActiveXObject) {
                oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
            }
            return oHTTP;
        }

        function getHead(strURL, fncCallback, fncError) {
            var oHTTP = createRequest();
            if (oHTTP) {
                if (fncCallback) {
                    if (typeof (oHTTP.onload) != "undefined") {
                        oHTTP.onload = function() {
                            if (oHTTP.status == "200") {
                                fncCallback(this);
                            } else {
                                if (fncError)
                                    fncError();
                            }
                            oHTTP = null;
                        };
                    } else {
                        oHTTP.onreadystatechange = function() {
                            if (oHTTP.readyState == 4) {
                                if (oHTTP.status == "200") {
                                    fncCallback(this);
                                } else {
                                    if (fncError)
                                        fncError();
                                }
                                oHTTP = null;
                            }
                        };
                    }
                }
                oHTTP.open("HEAD", strURL, true);
                oHTTP.send(null);
            } else {
                if (fncError)
                    fncError();
            }
        }

        function sendRequest(strURL, fncCallback, fncError, aRange,
                bAcceptRanges, iFileSize) {

            var oHTTP = createRequest();
            if (oHTTP) {

                var iDataOffset = 0;
                if (aRange && !bAcceptRanges) {
                    iDataOffset = aRange[0];
                }
                var iDataLen = 0;
                if (aRange) {
                    iDataLen = aRange[1] - aRange[0] + 1;
                }

                if (fncCallback) {
                    if (typeof (oHTTP.onload) != "undefined") {
                        oHTTP.onload = function() {
                            if (oHTTP.status == "200" || oHTTP.status == "206"
                                    || oHTTP.status == "0") {
                                this.binaryResponse = new BinaryFile(
                                        this.responseText, iDataOffset,
                                        iDataLen);
                                this.fileSize = iFileSize
                                        || this
                                                .getResponseHeader("Content-Length");
                                fncCallback(this);
                            } else {
                                if (fncError)
                                    fncError();
                            }
                            oHTTP = null;
                        };
                    } else {
                        oHTTP.onreadystatechange = function() {
                            if (oHTTP.readyState == 4) {
                                if (oHTTP.status == "200"
                                        || oHTTP.status == "206"
                                        || oHTTP.status == "0") {
                                    this.binaryResponse = new BinaryFile(
                                            oHTTP.responseBody, iDataOffset,
                                            iDataLen);
                                    this.fileSize = iFileSize
                                            || this
                                                    .getResponseHeader("Content-Length");
                                    fncCallback(this);
                                } else {
                                    if (fncError)
                                        fncError();
                                }
                                oHTTP = null;
                            }
                        };
                    }
                }
                oHTTP.open("GET", strURL, true);

                if (oHTTP.overrideMimeType)
                    oHTTP
                            .overrideMimeType('text/plain; charset=x-user-defined');

                if (aRange && bAcceptRanges) {
                    oHTTP.setRequestHeader("Range", "bytes=" + aRange[0] + "-"
                            + aRange[1]);
                }

                // This is causing problems GETting some images
                // (http://www.acbc.com.au/deploycontrol/images/upload/News_NAT_CND_2012_PM_J_Gillard_1_l.jpg)
                //
                // oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 1970 00:00:00 GMT");

                oHTTP.send(null);
            } else {
                if (fncError)
                    fncError();
            }
        }

        return function(strURL, fncCallback, fncError, aRange) {

            if (aRange) {
                getHead(strURL, function(oHTTP) {
                    var iLength = parseInt(oHTTP
                            .getResponseHeader("Content-Length"), 10);
                    var strAcceptRanges = oHTTP
                            .getResponseHeader("Accept-Ranges");

                    var iStart, iEnd;
                    iStart = aRange[0];
                    if (aRange[0] < 0)
                        iStart += iLength;
                    iEnd = iStart + aRange[1] - 1;

                    sendRequest(strURL, fncCallback, fncError,
                            [ iStart, iEnd ], (strAcceptRanges == "bytes"),
                            iLength);
                });

            } else {
                sendRequest(strURL, fncCallback, fncError);
            }
        }

    }());

    var EXIF = {};

    (function() {

        EXIF.MakeInfo = {
            "Canon" : {
                MakerNoteTags : {
                    0x000c : "SerialNumber",
                    0xa431 : "SerialNumber",
                    0x0096 : "InternalSerialNumber",
                    0x0015 : "SerialNumberFormat",
                    0x0028 : "ImageUniqueID"
                }
            },
            "EASTMAN KODAK COMPANY" : {
                SerialFoundAtStartOfMakerNotes : true,
                InvalidSerialStart : "KDK",
                MinimumBelievableLength : 12
            },
            "FUJIFILM" : {
                MakerNoteTags : {
                    0x0010 : "InternalSerialNumber"
                },
                MakerNoteByteAlign : 0x4949, // always use intel byte align
                HeaderSize : {
                    "FUJIFILM" : 12
                },
                UseMakernoteOffsetAsBase : {
                    "FUJIFILM" : true
                },
                MinimumBelievableLength : 34
            },
            "NIKON CORPORATION" : {
                MakerNoteTags : {
                    0x001d : "SerialNumber",
                    0x00a0 : "SerialNumber"
                },
                HeaderSize : {
                    "Nikon" : 18
                },
                MakerNoteByteAlignHeaderOffset : 10, // header looks like
                // "Nikon.....MM.*...."
                UseMakernoteOffsetAsBase : {
                    "Nikon" : true
                },
                AdjustOffsetBase : {
                    "Nikon" : 10
                }
            },
            "OLYMPUS IMAGING CORP." : {
                MakerNoteTags : {
                    0x2010 : "EquipmentIFDPointer"
                },
                HeaderSize : {
                    "OLYMP" : 8,
                    "OLYMPUS" : 12
                },
                MakerNoteByteAlignHeaderOffset : 8, // offset from start of header in which
                // to find the byte align code
                // (0x4949 or 0x4D4D)
                UseMakernoteOffsetAsBase : {
                    "OLYMP" : false,
                    "OLYMPUS" : true
                },
                AdjustOffsetBase : {
                    "OLYMP" : 0,
                    "OLYMPUS" : 0
                },

                SerialWithinIFD : "EquipmentIFDPointer",
                SerialWithinIFDHeaderSize : 0,
                SerialWithinIFDTags : {
                    0x0101 : "SerialNumber"
                }
            },
            "OLYMPUS OPTICAL CO.,LTD" : {
                MakerNoteTags : {
                    0x101a : "SerialNumber"
                },
                HeaderSize : {
                    "OLYMP" : 8
                }
            },
            "Panasonic" : {
                MakerNoteTags : {
                    0x0025 : "InternalSerialNumber"
                },
                MakerNoteByteAlign : 0x4949, // always use intel byte align
                HeaderSize : {
                    "Panasoni" : 12
                }
            },
            "PENTAX Corporation" : {
                MakerNoteTags : {
                    0x0215 : "CameraInfo",
                    0x0229 : "SerialNumber"
                },
                InternalSerialWithinIFDArray : "CameraInfo",
                InternalSerialWithinIFDArrayElement : 4,
                DefaultHeaderSize : 6,
                MakerNoteByteAlignHeaderOffset : 4,
                FixMakernotesOffset : true
            },
            "PENTAX" : {
                MakerNoteTags : {
                    0x0215 : "CameraInfo",
                    0x0229 : "SerialNumber"
                },
                InternalSerialWithinIFDArray : "CameraInfo",
                InternalSerialWithinIFDArrayElement : 4,
                DefaultHeaderSize : 6,
                MakerNoteByteAlignHeaderOffset : 4,
                FixMakernotesOffset : true
            }
        }

        EXIF.Tags = {

            0x0202 : "ThumbnailLength",
            // version tags
            0x9000 : "ExifVersion", // EXIF version
            0xA000 : "FlashpixVersion", // Flashpix format version

            // colorspace tags
            0xA001 : "ColorSpace", // Color space information tag

            // image configuration
            0xA002 : "ExifImageWidth",
            0xA003 : "ExifImageHeight",
            0x9101 : "ComponentsConfiguration", // Information about channels
            0x9102 : "CompressedBitsPerPixel", // Compressed bits per pixel

            // user information
            0x927C : "MakerNoteIFDPointer", // Any desired information written by the manufacturer
            0x9286 : "UserComment", // Comments by user

            // related file
            0xA004 : "RelatedSoundFile", // Name of related sound file

            // date and time
            0x9003 : "DateTimeOriginal", // Date and time when the original image was generated
            0x9004 : "CreateDate", // Date and time when the image was stored digitally
            0x9290 : "SubsecTime", // Fractions of seconds for DateTime
            0x9291 : "SubsecTimeOriginal", // Fractions of seconds for DateTimeOriginal
            0x9292 : "SubsecTimeDigitized", // Fractions of seconds for DateTimeDigitized

            // picture-taking conditions
            0x829A : "ExposureTime", // Exposure time (in seconds)
            0x829D : "FNumber", // F number
            0x8822 : "ExposureProgram", // Exposure program
            0x8824 : "SpectralSensitivity", // Spectral sensitivity
            0x8827 : "ISO", // ISO speed rating
            0x8828 : "OECF", // Optoelectric conversion factor
            0x9201 : "ShutterSpeedValue", // Shutter speed
            0x9202 : "ApertureValue", // Lens aperture
            0x9203 : "BrightnessValue", // Value of brightness
            0x9204 : "ExposureBias", // Exposure bias
            0x9205 : "MaxApertureValue", // Smallest F number of lens
            0x9206 : "SubjectDistance", // Distance to subject in meters
            0x9207 : "MeteringMode", // Metering mode
            0x9208 : "LightSource", // Kind of light source
            0x9209 : "Flash", // Flash status
            0x9214 : "SubjectArea", // Location and area of main subject
            0x920A : "FocalLength", // Focal length of the lens in mm
            0xA20B : "FlashEnergy", // Strobe energy in BCPS
            0xA20C : "SpatialFrequencyResponse", // 
            0xA20E : "FocalPlaneXResolution", // Number of pixels in width direction per FocalPlaneResolutionUnit
            0xA20F : "FocalPlaneYResolution", // Number of pixels in height direction per FocalPlaneResolutionUnit
            0xA210 : "FocalPlaneResolutionUnit", // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
            0xA214 : "SubjectLocation", // Location of subject in image
            0xA215 : "ExposureIndex", // Exposure index selected on camera
            0xA217 : "SensingMethod", // Image sensor type
            0xA300 : "FileSource", // Image source (3 == DSC)
            0xA301 : "SceneType", // Scene type (1 == directly photographed)
            0xA302 : "CFAPattern", // Color filter array geometric pattern
            0xA401 : "CustomRendered", // Special processing
            0xA402 : "ExposureMode", // Exposure mode
            0xA403 : "WhiteBalance", // 1 = auto white balance, 2 = manual
            0xA404 : "DigitalZoomRatio", // Digital zoom ratio
            0xA405 : "FocalLengthIn35mmFilm", // Equivalent focal length assuming 35mm film camera (in mm)
            0xA406 : "SceneCaptureType", // Type of scene
            0xA407 : "GainControl", // Degree of overall image gain adjustment
            0xA408 : "Contrast", // Direction of contrast processing applied by camera
            0xA409 : "Saturation", // Direction of saturation processing applied by camera
            0xA40A : "Sharpness", // Direction of sharpness processing applied by camera
            0xA40B : "DeviceSettingDescription", // 
            0xA40C : "SubjectDistanceRange", // Distance to subject

            // other tags
            0xA005 : "InteroperabilityIFDPointer",
            0xA420 : "ImageUniqueID", // Identifier assigned uniquely to each image

            0xA431 : "SerialNumber", // for when SerialNumber is in EXIF directly (BodySerialNumber in EXIF spec)
            0xA435 : "LensSerialNumber", // for when LensSerialNumber is in EXIF directly

            0xEA1D : "OffsetSchema"
        };

        EXIF.TiffTags = {
            0x0100 : "ImageWidth",
            0x0101 : "ImageHeight",
            0x8769 : "ExifIFDPointer",
            0x8825 : "GPSInfoIFDPointer",
            0xA005 : "InteroperabilityIFDPointer",
            0x0102 : "BitsPerSample",
            0x0103 : "Compression",
            0x0106 : "PhotometricInterpretation",
            0x0112 : "Orientation",
            0x0115 : "SamplesPerPixel",
            0x011C : "PlanarConfiguration",
            0x0212 : "YCbCrSubSampling",
            0x0213 : "YCbCrPositioning",
            0x011A : "XResolution",
            0x011B : "YResolution",
            0x0128 : "ResolutionUnit",
            0x0111 : "StripOffsets",
            0x0116 : "RowsPerStrip",
            0x0117 : "StripByteCounts",
            0x0201 : "JPEGInterchangeFormat",
            0x0202 : "JPEGInterchangeFormatLength",
            0x012D : "TransferFunction",
            0x013E : "WhitePoint",
            0x013F : "PrimaryChromaticities",
            0x0211 : "YCbCrCoefficients",
            0x0214 : "ReferenceBlackWhite",
            0x0132 : "DateTime",
            0x010E : "ImageDescription",
            0x010F : "Make",
            0x0110 : "Model",
            0x0131 : "Software",
            0x0132 : "ModifyDate",
            0x013B : "Artist",
            0x8298 : "Copyright",
            0xA431 : "SerialNumber", // for when SerialNumber is in IFD0 directly (BodySerialNumber in EXIF spec)
            0xA435 : "LensSerialNumber" // for when LensSerialNumber is in IFD0 directly
        }

        EXIF.GPSTags = {
            0x0000 : "GPSVersionID",
            0x0001 : "GPSLatitudeRef",
            0x0002 : "GPSLatitude",
            0x0003 : "GPSLongitudeRef",
            0x0004 : "GPSLongitude",
            0x0005 : "GPSAltitudeRef",
            0x0006 : "GPSAltitude",
            0x0007 : "GPSTimeStamp",
            0x0008 : "GPSSatellites",
            0x0009 : "GPSStatus",
            0x000A : "GPSMeasureMode",
            0x000B : "GPSDOP",
            0x000C : "GPSSpeedRef",
            0x000D : "GPSSpeed",
            0x000E : "GPSTrackRef",
            0x000F : "GPSTrack",
            0x0010 : "GPSImgDirectionRef",
            0x0011 : "GPSImgDirection",
            0x0012 : "GPSMapDatum",
            0x0013 : "GPSDestLatitudeRef",
            0x0014 : "GPSDestLatitude",
            0x0015 : "GPSDestLongitudeRef",
            0x0016 : "GPSDestLongitude",
            0x0017 : "GPSDestBearingRef",
            0x0018 : "GPSDestBearing",
            0x0019 : "GPSDestDistanceRef",
            0x001A : "GPSDestDistance",
            0x001B : "GPSProcessingMethod",
            0x001C : "GPSAreaInformation",
            0x001D : "GPSDateStamp",
            0x001E : "GPSDifferential"
        }

        EXIF.StringValues = {
            ColorSpace : {
                1 : "sRGB"
            },
            ExposureProgram : {
                0 : "Not defined",
                1 : "Manual",
                2 : "Normal program",
                3 : "Aperture priority",
                4 : "Shutter priority",
                5 : "Creative program",
                6 : "Action program",
                7 : "Portrait mode",
                8 : "Landscape mode"
            },
            MeteringMode : {
                0 : "Unknown",
                1 : "Average",
                2 : "CenterWeightedAverage",
                3 : "Spot",
                4 : "MultiSpot",
                5 : "Pattern",
                6 : "Partial",
                255 : "Other"
            },
            LightSource : {
                0 : "Unknown",
                1 : "Daylight",
                2 : "Fluorescent",
                3 : "Tungsten (incandescent light)",
                4 : "Flash",
                9 : "Fine weather",
                10 : "Cloudy weather",
                11 : "Shade",
                12 : "Daylight fluorescent (D 5700 - 7100K)",
                13 : "Day white fluorescent (N 4600 - 5400K)",
                14 : "Cool white fluorescent (W 3900 - 4500K)",
                15 : "White fluorescent (WW 3200 - 3700K)",
                17 : "Standard light A",
                18 : "Standard light B",
                19 : "Standard light C",
                20 : "D55",
                21 : "D65",
                22 : "D75",
                23 : "D50",
                24 : "ISO studio tungsten",
                255 : "Other"
            },
            Flash : {
                0x0000 : "No Flash",
                0x0001 : "Flash fired",
                0x0005 : "Strobe return light not detected",
                0x0007 : "Strobe return light detected",
                0x0009 : "Flash fired, compulsory flash mode",
                0x000D : "Flash fired, compulsory flash mode, return light not detected",
                0x000F : "Flash fired, compulsory flash mode, return light detected",
                0x0010 : "Flash did not fire, compulsory flash mode",
                0x0018 : "Flash did not fire, auto mode",
                0x0019 : "Flash fired, auto mode",
                0x001D : "Flash fired, auto mode, return light not detected",
                0x001F : "Flash fired, auto mode, return light detected",
                0x0020 : "No flash function",
                0x0041 : "Flash fired, red-eye reduction mode",
                0x0045 : "Flash fired, red-eye reduction mode, return light not detected",
                0x0047 : "Flash fired, red-eye reduction mode, return light detected",
                0x0049 : "Flash fired, compulsory flash mode, red-eye reduction mode",
                0x004D : "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
                0x004F : "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
                0x0059 : "Flash fired, auto mode, red-eye reduction mode",
                0x005D : "Flash fired, auto mode, return light not detected, red-eye reduction mode",
                0x005F : "Flash fired, auto mode, return light detected, red-eye reduction mode"
            },
            SensingMethod : {
                1 : "Not defined",
                2 : "One-chip color area sensor",
                3 : "Two-chip color area sensor",
                4 : "Three-chip color area sensor",
                5 : "Color sequential area sensor",
                7 : "Trilinear sensor",
                8 : "Color sequential linear sensor"
            },
            SceneCaptureType : {
                0 : "Standard",
                1 : "Landscape",
                2 : "Portrait",
                3 : "Night scene"
            },
            SceneType : {
                1 : "Directly photographed"
            },
            CustomRendered : {
                0 : "Normal",
                1 : "Custom"
            },
            WhiteBalance : {
                0 : "Auto",
                1 : "Manual"
            },
            GainControl : {
                0 : "None",
                1 : "Low gain up",
                2 : "High gain up",
                3 : "Low gain down",
                4 : "High gain down"
            },
            Contrast : {
                0 : "Normal",
                1 : "Soft",
                2 : "Hard"
            },
            Saturation : {
                0 : "Normal",
                1 : "Low saturation",
                2 : "High saturation"
            },
            Sharpness : {
                0 : "Normal",
                1 : "Soft",
                2 : "Hard"
            },
            SubjectDistanceRange : {
                0 : "Unknown",
                1 : "Macro",
                2 : "Close view",
                3 : "Distant view"
            },
            FileSource : {
                3 : "DSC"
            },

            Components : {
                0 : "-",
                1 : "Y",
                2 : "Cb",
                3 : "Cr",
                4 : "R",
                5 : "G",
                6 : "B"
            }
        }

        function addEvent(oElement, strEvent, fncHandler) {
            if (oElement.addEventListener) {
                oElement.addEventListener(strEvent, fncHandler, false);
            } else if (oElement.attachEvent) {
                oElement.attachEvent("on" + strEvent, fncHandler);
            }
        }

        function imageHasData(oImg) {
            return !!(oImg.exifdata);
        }

        function imageHasBeenScanned(oImg) {
            return !!(oImg.imageScanned);
        }

        function getImageData(oImg, fncCallback) {
            BinaryAjax(oImg.src, function(oHTTP) {
                var oEXIF = findEXIFinJPEG(oHTTP.binaryResponse);
                oImg.exifdata = oEXIF || {};
                oImg.imageScanned = true;
                if (fncCallback)
                    fncCallback();
            })
        }

	var _readSize = 100000
        function getExifFromLocalFileUsingNodeFs(fs, url, callback) {
            fs.open(url, 'r', function(err, fd) {
                if (err) {
                    console.log(err.message);
                    callback(err);
                    return;
                }
                var buffer = new Buffer(_readSize);
                fs.read(fd, buffer, 0, _readSize, 0, function(err, num) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    getExifFromNodeBuffer(buffer, callback);
                    fs.close(fd);
                });
            });
        }

        function getExifFromNodeBuffer(buffer, callback) {
            var binaryResponse = new BinaryFile(buffer
                    .toString('binary'), 0, Math.min(buffer.length, _readSize));

            var oEXIF = findEXIFinJPEG(binaryResponse);
            if (callback) {
                callback(null, (oEXIF || {}));
            }
        }

        function getExifFromUrl(url, onComplete) {
            BinaryAjax(url,

            (function(theUrl) { // I absolutely hate this closure syntax, hurts
                // my head. Must try harder!
                return function(oHttp) {
                    var oEXIF = findEXIFinJPEG(oHttp.binaryResponse);
                    if (onComplete)
                        onComplete((oEXIF || {}), theUrl);
                }
            })(url), onComplete({}, url)); // on err, just hit callback with {}
        }

        function findEXIFinJPEG(oFile) {
            var aMarkers = [];

            if (oFile.getByteAt(0) != 0xFF || oFile.getByteAt(1) != 0xD8) {
                return false; // not a valid jpeg
            }
            var iOffset = 2;
            var iLength = oFile.getLength();

            var oExifData = {};
            var oXmpData = {};

            while (iOffset < iLength) {
                if (oFile.getByteAt(iOffset) != 0xFF) {
                    // return false; // not a valid marker, something is wrong
                    return oExifData;
                }

                var iMarker = oFile.getByteAt(iOffset + 1);

                // we could implement handling for other markers here,
                // but we're only looking for 0xFFE1 for EXIF and XMP data

                if (iMarker == 22400) {
                    return readEXIFData(oFile, iOffset + 4, oFile.getShortAt(
                            iOffset + 2, true) - 2);
                    iOffset += 2 + oFile.getShortAt(iOffset + 2, true);

                } else if (iMarker == 225) {
                    // 0xE1 = Application-specific 1 (for EXIF)

                    var headerAsString = oFile.getStringAt(iOffset + 4, 28);
                    if (headerAsString.indexOf("http://ns.adobe.com/xap/1.0/") != -1) {
                        var sXmpData = oFile.getStringAt(iOffset + 33, oFile
                                .getShortAt(iOffset + 2, true) - 31);

                        var xmlDoc;
                        try {
                            sXmpData = sXmpData.trim();
                            sXmpData = sXmpData.substr(sXmpData.indexOf("<"),
                                    sXmpData.lastIndexOf(">") + 1);
                            xmlDoc = $.parseXML(sXmpData);
                        } catch (e) {
                            // error parsing xml
                        }

                        if (xmlDoc != null) {
                            $([ "SerialNumber", "ImageUniqueID" ])
                                    .each(
                                            function(index, tagName) {
                                                var tagVal = $(xmlDoc).find(
                                                        tagName);
                                                var tagValue = tagVal.text();

                                                $([ "aux", "exif" ])
                                                        .each(
                                                                function(index,
                                                                        namespacePrefix) {
                                                                    if (typeof tagValue === "undefined"
                                                                            || tagValue.length == 0) {
                                                                        // 2 backslash to escape colon
                                                                        $(
                                                                                xmlDoc)
                                                                                .find(
                                                                                        "["
                                                                                                + namespacePrefix
                                                                                                + "\\:"
                                                                                                + tagName
                                                                                                + "]")
                                                                                .each(
                                                                                        function() {
                                                                                            // but only 1 backslash needed here:
                                                                                            tagValue = $(
                                                                                                    this)
                                                                                                    .attr(
                                                                                                            namespacePrefix
                                                                                                                    + "\:"
                                                                                                                    + tagName);
                                                                                            // #whyDoIDoThisJob?
                                                                                        });
                                                                    }
                                                                });

                                                if (typeof tagValue != "undefined"
                                                        && tagValue.length > 0) {
                                                    tagValue = tidyString(tagValue);
                                                    oXmpData[tagName] = tagValue;
                                                    if (typeof oExifData[tagName] === "undefined"
                                                            || tidyString(oExifData[tagName]).length == 0) {
                                                        oExifData[tagName] = tagValue;
                                                    }
                                                }
                                            });
                            oExifData = sortArrayByKeys(oExifData);
                        }
                    } else {
                        oExifData = readEXIFData(oFile, iOffset + 4, oFile
                                .getShortAt(iOffset + 2, true) - 2);
                    }

                    iOffset += 2 + oFile.getShortAt(iOffset + 2, true);
                } else {
                    iOffset += 2 + oFile.getShortAt(iOffset + 2, true);
                }
            }
            return oExifData;
        }

        function logInt(i, name) {
            console.log(name + ": " + i + " (hex: " + (i).toString(16) + ")");
        }

        function calculateOffsetBase(oFile, iTIFFStart, iDirStart, oStrings,
                bBigEnd, iHeaderSize, iOffsetBase) {
            if (!iHeaderSize) {
                iHeaderSize = 0;
            }
            if (!iOffsetBase) {
                iOffsetBase = 0;
            }
            if (typeof iDirStart === 'undefined') {
                return {};
            }

            var iTIFFStartHex = (iTIFFStart).toString(16);
            var iDirStartHex = (iDirStart).toString(16);
            var iOffsetBaseHex = (iOffsetBase).toString(16);
            var diffHex = (iEntriesPosition - iTIFFStart).toString(16);

            var iEntriesPosition = iDirStart + iHeaderSize;
            var iEntriesPositionHex = (iEntriesPosition).toString(16);

            var iEntries = oFile.getShortAt(iTIFFStart + iEntriesPosition,
                    bBigEnd);

            var expectedFirstIFDValueLocation = iEntriesPosition + 2
                    + (iEntries * 12);
            var nextIFDvalue = oFile.getLongAt(expectedFirstIFDValueLocation
                    + iTIFFStart, bBigEnd);
            var nextIFDvalueHex = (nextIFDvalue).toString(16);
            if (nextIFDvalue == 0x00000000) { // if next IFD pointer is blank,
                // jump over it
                expectedFirstIFDValueLocation += 4;
            }
            var expectedFirstIFDValueLocationHex = (expectedFirstIFDValueLocation)
                    .toString(16);

            for (var i = 0; i < iEntries; i++) {
                var iEntryOffset = iTIFFStart + iEntriesPosition + i * 12 + 2;
                var type = oFile.getShortAt(iEntryOffset + 2, bBigEnd);
                var dataSize = oFile.getLongAt(iEntryOffset + 4, bBigEnd);

                if ((type == 1 && dataSize > 4) || (type == 2 && dataSize > 4)
                        || (type == 3 && dataSize > 2)
                        || (type == 4 && dataSize > 1)
                        || (type == 5 && dataSize > 1)
                        || (type == 7 && dataSize > 4)
                        || (type == 9 && dataSize > 1)
                        || (type == 10 && dataSize > 1)
                        || (type == 13 && dataSize > 1)) { // i.e., if more
                    // than 8 bytes,
                    // this must be a
                    // pointer
                    var ifdPointer = oFile.getLongAt(iEntryOffset + 8, bBigEnd);
                    var ifdPointerHex = (ifdPointer).toString(16);

                    var differenceBetweenExpectedAndActual = expectedFirstIFDValueLocation
                            - ifdPointer;
                    var differenceBetweenExpectedAndActualHex = (differenceBetweenExpectedAndActual)
                            .toString(16);
                    return differenceBetweenExpectedAndActual;
                }
            }
            return 0; // default to no offset
        }

        function readTags(oFile, iTIFFStart, iDirStart, oStrings, bBigEnd,
                iHeaderSize, iOffsetBase) {
            if (!iHeaderSize) {
                iHeaderSize = 0;
            }
            if (!iOffsetBase) {
                iOffsetBase = 0;
            }
            if (typeof iDirStart === 'undefined') {
                return {};
            }

            var iTIFFStartHex = (iTIFFStart).toString(16);
            var iDirStartHex = (iDirStart).toString(16);
            var iOffsetBaseHex = (iOffsetBase).toString(16);
            var diffHex = (iEntriesPosition - iTIFFStart).toString(16);

            var iEntriesPosition = iDirStart + iHeaderSize;
            var iEntriesPositionHex = (iEntriesPosition).toString(16);

            var iEntries = oFile.getShortAt(iTIFFStart + iEntriesPosition,
                    bBigEnd);
            var oTags = {};

            for (var i = 0; i < iEntries; i++) {
                var iEntryOffset = iTIFFStart + iEntriesPosition + i * 12 + 2;
                var iEntryOffsetHex = (iEntryOffset).toString(16);
                var localAddress = oFile.getShortAt(iEntryOffset, bBigEnd);

                var strTag = oStrings[localAddress];
                if (!strTag) {
                    continue;
                }

                var tmp = readTagValue(oFile, iEntryOffset, iTIFFStart,
                        iDirStart, bBigEnd, iHeaderSize, iOffsetBase, strTag);
                oTags[strTag] = tmp;

                if (iEntries > 1000) {
                    return oTags;
                }
            }
            return oTags;
        }

        function readTagValue(oFile, iEntryOffset, iTIFFStart, iDirStart,
                bBigEnd, iHeaderSize, iOffsetBase, strTag) {
            var iTIFFStartHex = (iTIFFStart).toString(16);
            var iDirStartHex = (iDirStart).toString(16);
            var iEntryOffsetHex = (iEntryOffset).toString(16);
            var iOffsetBaseHex = (iOffsetBase).toString(16);

            var iType = oFile.getShortAt(iEntryOffset + 2, bBigEnd);
            var iNumValues = oFile.getLongAt(iEntryOffset + 4, bBigEnd);
            var iValueOffset = oFile.getLongAt(iEntryOffset + 8, bBigEnd)
                    + iTIFFStart + iOffsetBase;
            var iValueOffsetHex = (iValueOffset).toString(16);

            switch (iType) {
            case 1: // byte, 8-bit unsigned int
                if (iNumValues == 1) {
                    return oFile.getByteAt(iEntryOffset + 8, bBigEnd);
                } else {
                    var iValOffset = iNumValues > 4 ? iValueOffset
                            : (iEntryOffset + 8);
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getByteAt(iValOffset + n);
                    }
                    return aVals;
                }
                break;

            case 2: // ascii, 8-bit byte
                var iStringOffset = iNumValues > 4 ? iValueOffset
                        : (iEntryOffset + 8);
                var iStringOffsetHex = (iStringOffset).toString(16);
                var iActualOffsetHex = (iStringOffset - iTIFFStart)
                        .toString(16);

                var ascii = oFile.getStringAt(iStringOffset, iNumValues);
                // from perl libimage-exiftool Exif.pm
                // "truncate at null terminator (shouldn't have a null based on
                // the EXIF spec, but it seems that few people actually read
                // the spec)
                // So read the entire string length and trim off the NULL.
                // trim trailing spaces must be a reference to
                // "Note: allow spaces instead of nulls in the ID codes because
                // it is fairly common for camera manufacturers to get this
                // wrong"
                return ascii.replace(/\0.*/, "").replace(/ +$/, "")
                break;

            case 3: // short, 16 bit int
                if (iNumValues == 1) {
                    return oFile.getShortAt(iEntryOffset + 8, bBigEnd);
                } else {
                    var iValOffset = iNumValues > 2 ? iValueOffset
                            : (iEntryOffset + 8);
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile
                                .getShortAt(iValOffset + 2 * n, bBigEnd);
                    }
                    return aVals;
                }
                break;

            case 4: // long, 32 bit int
                if (iNumValues == 1) {
                    return oFile.getLongAt(iEntryOffset + 8, bBigEnd);
                } else {
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getLongAt(iValueOffset + 4 * n,
                                bBigEnd);
                    }
                    return aVals;
                }
                break;
            case 5: // rational = two long values, first is numerator, second is
                // denominator
                if (iNumValues == 1) {
                    return oFile.getLongAt(iValueOffset, bBigEnd)
                            / oFile.getLongAt(iValueOffset + 4, bBigEnd);
                } else {
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getLongAt(iValueOffset + 8 * n,
                                bBigEnd)
                                / oFile.getLongAt(iValueOffset + 4 + 8 * n,
                                        bBigEnd);
                    }
                    return aVals;
                }
                break;
            // case 7: // undefined, 8-bit byte, value depending on field
            case 7: // IFDPointer
                if (iNumValues == 1) {
                    return oFile.getByteAt(iEntryOffset + 8, bBigEnd);
                } else if (iNumValues > 20) { // lets assume it's a IFD
                    // pointer?
                    return oFile.getLongAt(iEntryOffset + 8, bBigEnd);
                } else {
                    var iValOffset = iNumValues > 4 ? iValueOffset
                            : (iEntryOffset + 8);
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getByteAt(iValOffset + n);
                    }
                    return aVals;
                }
                break;
            case 9: // slong, 32 bit signed int
                if (iNumValues == 1) {
                    return oFile.getSLongAt(iEntryOffset + 8, bBigEnd);
                } else {
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getSLongAt(iValueOffset + 4 * n,
                                bBigEnd);
                    }
                    return aVals;
                }
                break;
            case 10: // signed rational, two slongs, first is numerator,
                // second is denominator
                if (iNumValues == 1) {
                    return oFile.getSLongAt(iValueOffset, bBigEnd)
                            / oFile.getSLongAt(iValueOffset + 4, bBigEnd);
                } else {
                    var aVals = [];
                    for (var n = 0; n < iNumValues; n++) {
                        aVals[n] = oFile.getSLongAt(iValueOffset + 8 * n,
                                bBigEnd)
                                / oFile.getSLongAt(iValueOffset + 4 + 8 * n,
                                        bBigEnd);
                    }
                    return aVals;
                }
                break;
            case 13: // IFDPointer
                return oFile.getLongAt(iEntryOffset + 8, bBigEnd) + iDirStart;
                break;
            }
        }

        function readEXIFData(oFile, iStart, iLength) {
            if (oFile.getStringAt(iStart, 4) != "Exif") {
                return false;
            }

            var bBigEnd;

            var iTIFFOffset = iStart + 6;

            // test for TIFF validity and endianness
            if (oFile.getShortAt(iTIFFOffset) == 0x4949) {
                bBigEnd = false;
            } else if (oFile.getShortAt(iTIFFOffset) == 0x4D4D) {
                bBigEnd = true;
            } else {
                return false;
            }

            if (oFile.getShortAt(iTIFFOffset + 2, bBigEnd) != 0x002A) {
                return false;
            }

            if (oFile.getLongAt(iTIFFOffset + 4, bBigEnd) != 0x00000008) {
                return false;
            }

            var oTags = readTags(oFile, iTIFFOffset, 8, EXIF.TiffTags, bBigEnd);

            if (oTags.ExifIFDPointer) {
                var oEXIFTags = readTags(oFile, iTIFFOffset,
                        oTags.ExifIFDPointer, EXIF.Tags, bBigEnd);
                for ( var strTag in oEXIFTags) {
                    switch (strTag) {
                    case "ColorSpace":
                    case "LightSource":
                    case "Flash":
                    case "MeteringMode":
                    case "ExposureProgram":
                    case "SensingMethod":
                    case "SceneCaptureType":
                    case "SceneType":
                    case "CustomRendered":
                    case "WhiteBalance":
                    case "GainControl":
                    case "Contrast":
                    case "Saturation":
                    case "Sharpness":
                    case "SubjectDistanceRange":
                    case "FileSource":
                        oEXIFTags[strTag] = EXIF.StringValues[strTag][oEXIFTags[strTag]];
                        break;
                    case "ExifVersion":
                    case "FlashpixVersion":
                        oEXIFTags[strTag] = String.fromCharCode(
                                oEXIFTags[strTag][0], oEXIFTags[strTag][1],
                                oEXIFTags[strTag][2], oEXIFTags[strTag][3]);
                        break;
                    case "ComponentsConfiguration":
                        oEXIFTags[strTag] = EXIF.StringValues.Components[oEXIFTags[strTag][0]] + ", "
                                + EXIF.StringValues.Components[oEXIFTags[strTag][1]] + ", "
                                + EXIF.StringValues.Components[oEXIFTags[strTag][2]] + ", "
                                + EXIF.StringValues.Components[oEXIFTags[strTag][3]];
                        break;
                    }
                    oTags[strTag] = oEXIFTags[strTag];
                }
            }

            if (oTags.GPSInfoIFDPointer) {
                var oGPSTags = readTags(oFile, iTIFFOffset,
                        oTags.GPSInfoIFDPointer, EXIF.GPSTags, bBigEnd);
                for ( var strTag in oGPSTags) {
                    switch (strTag) {
                    case "GPSVersionID":
                        oGPSTags[strTag] = oGPSTags[strTag][0] + "."
                                + oGPSTags[strTag][1] + "."
                                + oGPSTags[strTag][2] + "."
                                + oGPSTags[strTag][3];
                        break;
                    }
                    oTags[strTag] = oGPSTags[strTag];
                }
            }

            if (oTags.Make) {
                oTags.Make = oTags.Make.trim();
            }

            if (oTags.FocalLength) {
                oTags.FocalLength += " mm";
            }

            if (oTags.MakerNoteIFDPointer && EXIF.MakeInfo[oTags.Make]) {
                var oMakeInfo = EXIF.MakeInfo[oTags.Make];

                var bMakerNoteEndianess = bBigEnd;
                if (oMakeInfo.MakerNoteByteAlignHeaderOffset) {
                    var iBigEndPointer = iTIFFOffset
                            + oTags.MakerNoteIFDPointer
                            + oMakeInfo.MakerNoteByteAlignHeaderOffset;
                    var iByteAlign = oFile.getShortAt(iBigEndPointer);
                    if (iByteAlign == 0x4949) {
                        bMakerNoteEndianess = false;
                    } else if (iByteAlign == 0x4D4D) {
                        bMakerNoteEndianess = true;
                    } else {
                        console
                                .log("Failed to find legal endianess in makernotes. Using default");
                        // fall through to use default for TIFF
                    }
                }

                if (oMakeInfo.MakerNoteByteAlign) {
                    if (oMakeInfo.MakerNoteByteAlign == 0x4949) {
                        bMakerNoteEndianess = false;
                    } else if (oMakeInfo.MakerNoteByteAlign == 0x4D4D) {
                        bMakerNoteEndianess = true;
                    }
                }

                var headerString = tidyString(oFile.getStringAt(iTIFFOffset
                        + oTags.MakerNoteIFDPointer, 8));

                var iMakerNoteHeaderSize = 0;
                if (oMakeInfo.DefaultHeaderSize) {
                    iMakerNoteHeaderSize = oMakeInfo.DefaultHeaderSize;
                }
                if (oMakeInfo.HeaderSize && oMakeInfo.HeaderSize[headerString]) {
                    iMakerNoteHeaderSize = oMakeInfo.HeaderSize[headerString];
                }

                var iOffsetBase = 0;
                if (oMakeInfo.FixMakernotesOffset || oTags.OffsetSchema) {
                    iOffsetBase = calculateOffsetBase(oFile, iTIFFOffset,
                            oTags.MakerNoteIFDPointer, oMakeInfo.MakerNoteTags,
                            bMakerNoteEndianess, iMakerNoteHeaderSize,
                            iOffsetBase);
                }
                // if (oTags.OffsetSchema) {
                // FIXME: implement this in "calculateOffsetBase()" then ignore
                // this broken microsoft tag "OffsetSchema"\
                // iOffsetBase = oTags.OffsetSchema;
                // }

                if (oMakeInfo.UseMakernoteOffsetAsBase) { // then we need to
                    // add makernote
                    // location as an
                    // offset
                    if (oMakeInfo.UseMakernoteOffsetAsBase[headerString]) {
                        iOffsetBase = oTags.MakerNoteIFDPointer;
                    }
                }

                if (oMakeInfo.AdjustOffsetBase) {
                    if (oMakeInfo.AdjustOffsetBase[headerString]) {
                        iOffsetBase += oMakeInfo.AdjustOffsetBase[headerString];
                    }
                }

                // now read MakerNotes...
                var oMakerNoteTags = {};

                if (oMakeInfo.SerialFoundAtStartOfMakerNotes) {
                    var serialNumber = tidyString(oFile.getStringAt(iTIFFOffset
                            + oTags.MakerNoteIFDPointer, 16));
                    if (oMakeInfo.InvalidSerialStart) {
                        var startOfSerial = serialNumber.substr(0,
                                oMakeInfo.InvalidSerialStart.length);
                        if (startOfSerial != oMakeInfo.InvalidSerialStart) {
                            oMakerNoteTags.SerialNumber = serialNumber;
                        }
                    } else {
                        oMakerNoteTags.SerialNumber = serialNumber;
                    }
                } else {
                    oMakerNoteTags = readTags(oFile, iTIFFOffset,
                            oTags.MakerNoteIFDPointer, oMakeInfo.MakerNoteTags,
                            bMakerNoteEndianess, iMakerNoteHeaderSize,
                            iOffsetBase);
                }

                if (oMakeInfo.SerialWithinIFD) {
                    var parent = oMakeInfo.SerialWithinIFD;
                    var oParentIFDTags = readTags(oFile, iTIFFOffset,
                            oMakerNoteTags[parent],
                            oMakeInfo.SerialWithinIFDTags, bMakerNoteEndianess,
                            oMakeInfo.SerialWithinIFDHeaderSize, iOffsetBase);
                    oMakerNoteTags = oParentIFDTags;
                }
                if (oMakeInfo.InternalSerialWithinIFDArray) {
                    IFDArray = oMakerNoteTags[oMakeInfo.InternalSerialWithinIFDArray];
                    if (IFDArray) {
                        internalSerialNumber = IFDArray[oMakeInfo.InternalSerialWithinIFDArrayElement];
                        // if (serialNumber) {
                        oTags.InternalSerialNumber = internalSerialNumber;
                        // }
                    }
                }
                for ( var strTag in oMakerNoteTags) {
                    oTags[strTag] = oMakerNoteTags[strTag];
                }

                for (tag in {
                    "SerialNumber" : null,
                    "InternalSerialNumber" : null
                }) {
                    if (oTags[tag]) {
                        oTags[tag] = formatSerialNumber(oTags, oTags[tag]);

                        if (oMakeInfo.MinimumBelievableLength) {
                            if (oTags[tag].length < oMakeInfo.MinimumBelievableLength) {
                                oTags[tag] = null;
                            }
                        }
                        if (isBlank(oTags[tag])) {
                            delete oTags[tag];
                        }
                    }
                }

                if (oTags.ImageUniqueID) {
                    oTags.ImageUniqueID = intArrayToHexString(oTags.ImageUniqueID);
                }
            }
            oTags = tidyExifValues(oTags);
            return sortArrayByKeys(oTags);
        }

        function tidyExifValues(tags) {
            var tidyData = {};
            // $.each(tags, function(key, value) {
            for ( var key in tags) {
                tidyData[key] = tidyString(tags[key]);
            }
            return tidyData;
        }

        function isBlank(str) {
            return (!str || /^\s*$/.test(str));
        }

        function sortArrayByKeys(inputarray) {
            var arraykeys = [];
            for ( var k in inputarray) {
                arraykeys.push(k);
            }
            arraykeys.sort();

            var outputarray = {};
            for (var i = 0; i < arraykeys.length; i++) {
                outputarray[arraykeys[i]] = inputarray[arraykeys[i]];
            }
            return outputarray;
        }

        function formatSerialNumber(tags, serial) {

            var isSerialNumber = (serial === tags.SerialNumber);

            var returnSerial = tidyString(serial);

            switch (tags.Make) {
            case "Canon":
                if (isSerialNumber) {
                    // if (tags.SerialNumberFormat == 0xa0000000) {
                    if (returnSerial.length > 6) {
                        returnSerial = pad(returnSerial, "0", 10);
                    } else {
                        returnSerial = pad(returnSerial, "0", 6);
                    }
                }
                break;
            case "FUJIFILM":
                var startOf12CharBlock = returnSerial.lastIndexOf(" ") + 1;
                if (startOf12CharBlock == -1) {
                    returnSerial + "";
                    break;
                }
                var iDateIndex = startOf12CharBlock + 12;
                var year = returnSerial.substr(iDateIndex, 2);
                if (year > 80) {
                    year = "19" + year;
                } else {
                    year = "20" + year;
                }
                var month = returnSerial.substr(iDateIndex + 2, 2);
                var date = returnSerial.substr(iDateIndex + 4, 2);
                var lastChunk = returnSerial.substr(iDateIndex + 6, 12);
                var returnSerial = returnSerial.substr(0, iDateIndex) + " "
                        + year + ":" + month + ":" + date + " " + lastChunk;
                if (lastChunk.length < 12) {
                    returnSerial = "";
                }

                break;
            case "Panasonic":
                var year = String.fromCharCode(serial[3])
                        + String.fromCharCode(serial[4]);
                var month = String.fromCharCode(serial[5])
                        + String.fromCharCode(serial[6]);
                var date = String.fromCharCode(serial[7])
                        + String.fromCharCode(serial[8]);

                var iYear = parseInt(year, 10);
                var iMonth = parseInt(month, 10);
                var iDate = parseInt(date, 10);

                returnSerial = "";

                if (isNaN(iYear) || isNaN(iMonth) || isNaN(iDate) || iYear < 0
                        || iYear > 99 || iMonth < 1 || iMonth > 12 || iDate < 1
                        || iDate > 31) {
                    // error
                } else {
                    returnSerial = "(" + String.fromCharCode(serial[0])
                            + String.fromCharCode(serial[1])
                            + String.fromCharCode(serial[2]) + ")";
                    returnSerial += " 20" + year; // year
                    returnSerial += ":" + month; // month
                    returnSerial += ":" + date; // date
                    returnSerial += " no. " + String.fromCharCode(serial[9])
                            + String.fromCharCode(serial[10])
                            + String.fromCharCode(serial[11])
                            + String.fromCharCode(serial[12]); // id
                }
                break;
            case "Pentax":
                if (returnSerial.length != 7) {
                    returnSerial = "";
                }
                break;

            }

            returnSerial = returnSerial.trim();
            return returnSerial;
        }

        function pad(input, chr, len) {
            var returnString = input;
            while (returnString.length < len) {
                returnString = chr + returnString;
            }
            return returnString;
        }

        function intArrayToHexString(arrayOfInts) {
            if (typeof arrayOfInts === 'string') {
                return arrayOfInts; // already a string
            }
            var response = '';
            for ( var i in arrayOfInts) {
                response += pad(arrayOfInts[i].toString(16), '0', 2);
            }
            return response;
        }

        EXIF.getData = function(oImg, fncCallback) {
            if (!oImg.complete)
                return false;
            if (!imageHasData(oImg)) {
                getImageData(oImg, fncCallback);
            } else {
                if (fncCallback)
                    fncCallback();
            }
            return true;
        }

        EXIF.getTag = function(oImg, strTag) {
            if (!imageHasData(oImg))
                return;
            return oImg.exifdata[strTag];
        }

        EXIF.getAllTags = function(oImg) {
            if (!imageHasData(oImg))
                return {};
            var oData = oImg.exifdata;
            var oAllTags = {};
            for ( var a in oData) {
                if (oData.hasOwnProperty(a)) {
                    oAllTags[a] = oData[a];
                }
            }
            return oAllTags;
        }

        EXIF.pretty = function(oImg) {
            if (!imageHasData(oImg))
                return "";
            var oData = oImg.exifdata;
            var strPretty = "";
            for ( var a in oData) {
                if (oData.hasOwnProperty(a)) {
                    if (typeof oData[a] == "object") {
                        strPretty += a + " : [" + oData[a].length
                                + " values]\r\n";
                    } else {
                        strPretty += a + " : " + oData[a] + "\r\n";
                    }
                }
            }
            return strPretty;
        }

        EXIF.readFromBinaryFile = function(oFile) {
            return findEXIFinJPEG(oFile);
        }

        function loadAllImages() {
            var aImages = document.getElementsByTagName("img");
            for (var i = 0; i < aImages.length; i++) {
                var filename = aImages[i].src.toLowerCase()
                if (filename.substr(-3) === "jpg"
                        || filename.substr(-4) === "jpeg") {
                    if (!aImages[i].complete) {
                        addEvent(aImages[i], "load", function() {
                            EXIF.getData(this);
                        });
                    } else {
                        EXIF.getData(aImages[i]);
                    }
                }
            }
        }

        function tidyString(str) {
            if (typeof str === "undefined") {
                str = "";
            }
            str = str + "";

            // list of what to keep
            str = str.replace(/[^a-z0-9 \!\"\#\$\%\&\'\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~\©]/gi,
                '');
            str = str.replace(/^\s+|\s+$/g, ''); // trim
            if (str.toLowerCase() == "undefined"
                    || str.toLowerCase() == "unknown") {
                str = "";
            }
            return str.trim();
        }

        function allImagesLoaded() {
            var aImages = document.getElementsByTagName("img");
            for (var i = 0; i < aImages.length; i++) {
                var filename = aImages[i].src.toLowerCase()
                if (filename.substr(-3) === "jpg"
                        || filename.substr(-4) === "jpeg") {
                    if (!aImages[i].imageScanned) {
                        return false;
                    }
                }
            }
            return true;
        }

        if (typeof (exports) !== 'undefined') {
            exports.getExifFromLocalFileUsingNodeFs = getExifFromLocalFileUsingNodeFs;
            exports.getExifFromNodeBuffer = getExifFromNodeBuffer;
        }

        if (typeof (jQuery) !== 'undefined') {
            jQuery.fn.loadAllImages = loadAllImages;
            jQuery.fn.allImagesLoaded = allImagesLoaded;
            jQuery.fn.getExifFromUrl = getExifFromUrl;
            jQuery.fn.tidyString = tidyString;

            // load data for images manually
            jQuery.fn.exifLoad = function(fncCallback) {
                return this.each(function() {
                    EXIF.getData(this, fncCallback)
                });
            }

            jQuery.fn.findEXIFinJPEG = function(oFileText) {
                return findEXIFinJPEG(new BinaryFile(oFileText));
            }

            jQuery.fn.exif = function(strTag) {
                var aStrings = [];
                this.each(function() {
                    aStrings.push(EXIF.getTag(this, strTag));
                });
                return aStrings;
            }

            jQuery.fn.exifString = function(strTag) {
                var aStrings = [];
                this.each(function() {
                    aStrings.push(EXIF.getTag(this, strTag));
                });
                return aStrings[0];
            }

            jQuery.fn.exifAll = function() {
                var aStrings = [];
                this.each(function() {
                    aStrings.push(EXIF.getAllTags(this));
                });
                return aStrings;
            }

            jQuery.fn.exifPretty = function() {
                var aStrings = [];
                this.each(function() {
                    aStrings.push(EXIF.pretty(this));
                });
                return aStrings;
            }
        }
    })();
})();
