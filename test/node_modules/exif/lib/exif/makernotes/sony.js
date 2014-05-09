      } else if (this.exifData.exif[exifEntry].value.getString(0, 12) === "SONY CAM \x00\x00\x00" || this.exifData.exif[exifEntry].value.getString(0, 12) === "SONY DSC \x00\x00\x00") {
        this.extractMakernotes = require('./makernotes/sony').extractMakernotes;


/**
 * Extracts Sony flavored Makernotes.
 */
exports.extractMakernotes = function (data, makernoteOffset, tiffOffset) {

  var makernoteData = [];

  // List of vendor specific Makernote tags found on
  // http://www.sno.phy.queensu.ca/~phil/exiftool/TagNames/Sony.html
  var tags = {

    0x0010 : 'CameraInfo',                      //
    0x0020 : 'FocusInfo',                       //
    0x0102 : 'Quality',
    0x0104 : 'FlashExposureComp',
    0x0105 : 'Teleconverter',
    0x0112 : 'WhiteBalanceFineTune',
    0x0114 : 'CameraSettings',                  //
    0x0115 : 'WhiteBalance',
    0x0116 : 'ExtraInfo',                       //
    0x0e00 : 'PrintIM',
    0x1000 : 'MultiBurstMode',
    0x1001 : 'MultiBurstImageWidth',
    0x1002 : 'MultiBurstImageHeight',
    0x1003 : 'Panorama',
    0x2001 : 'PreviewImage',
    0x2002 : 'Rating',
    0x2004 : 'Contrast',
    0x2005 : 'Saturation',
    0x2006 : 'Sharpness',
    0x2007 : 'Brightness',
    0x2008 : 'LongExposureNoiseReduction',
    0x2009 : 'HighISONoiseReduction',
    0x200a : 'HDR',
    0x200b : 'MultiFrameNoiseReduction',
    0x200e : 'PictureEffect',
    0x200f : 'SoftSkinEffect',
    0x2011 : 'VignettingCorrection',
    0x2012 : 'LateralChromaticAberration',
    0x2013 : 'DistortionCorrection',
    0x2014 : 'WBShiftAB_GM',
    0x2016 : 'AutoPortraitFramed',
    0x201b : 'FocusMode',
    0x201c : 'AFAreaModeSetting',
    0x201d : 'FlexibleSpotPosition',
    0x201e : 'AFPointSelected',
    0x3000 : 'ShotInfo',
    0x9050 : 'Tag9050',
    0x9400 : 'Tag9400a',                        //
    0x9402 : 'Tag9402',
    0x9403 : 'Tag9403',
    0x9405 : 'Tag9405',
    0x9406 : 'Tag9406',
    0x940a : 'Tag940a',
    0x940e : 'AFInfo',
    0xb000 : 'FileFormat',
    0xb001 : 'SonyModelID',
    0xb020 : 'CreativeStyle',
    0xb021 : 'ColorTemperature',
    0xb022 : 'ColorCompensationFilter',
    0xb023 : 'SceneMode',
    0xb024 : 'ZoneMatching',
    0xb025 : 'DynamicRangeOptimizer',
    0xb026 : 'ImageStabilization',
    0xb027 : 'LensType',
    0xb028 : 'MinoltaMakerNote',
    0xb029 : 'ColorMode',
    0xb02a : 'LensSpec',
    0xb02b : 'FullImageSize',
    0xb02c : 'PreviewImageSize',
    0xb040 : 'Macro',
    0xb041 : 'ExposureMode',
    0xb042 : 'FocusMode',
    0xb043 : 'AFAreaMode',
    0xb044 : 'AFIlluminator',
    0xb047 : 'JPEGQuality',
    0xb048 : 'FlashLevel',
    0xb049 : 'ReleaseMode',
    0xb04a : 'SequenceNumber',
    0xb04b : 'Anti-Blur',
    0xb04e : 'FocusMode',                       //
    0xb04f : 'DynamicRangeOptimizer',
    0xb050 : 'HighISONoiseReduction2',
    0xb052 : 'IntelligentAuto',
    0xb054 : 'WhiteBalance'

  };

  // Sony flavored Makernote data starts after eight bytes
  var ifdOffset = makernoteOffset + 12;

  // Get the number of entries and extract them
  var numberOfEntries = data.getShort(ifdOffset, this.isBigEndian, tiffOffset);

  for (var i = 0; i < numberOfEntries; i++) {
    var exifEntry = this.extractExifEntry(data, (ifdOffset + 2 + (i * 12)), tiffOffset, this.isBigEndian, tags);
    if (exifEntry) makernoteData.push(exifEntry);
  }

  return makernoteData;

};