/**
 * Saves jsPsych data to the server
 * @function
 * @param {string} project - The name of the project used as a folder name under ~/data/
 * @param {string} filename - File to save the data to
 * @param {string} filedata - A json string with the data to save
*/
function SaveData(project, filename, filedata) {
  $.ajax({
    type: 'POST',
    url: '../resources/save_data.php',
    data: {
      project: project,
      filename: filename,
      filedata: filedata
    },
    success: function( data ) {
    },
    error: function(xhr, status, error) {
    }
  });
}


/**
 * Creates an array with a repeated value
 * @function
 * @param value - The value to fill the array with
 * @param {number} len - The number of times to repeat the value
 * @returns {Array} - An array filled with value repeated n times
*/
function fillArray(value, len) {
  if (len == 0) return [];
  var a = [value];
  while (a.length * 2 <= len) a = a.concat(a);
  if (a.length < len) a = a.concat(a.slice(0, len - a.length));
  return a;
}


/**
 * Pseudo-random number generator
 * @function
 * @param {number} max - Ceiling for the random number
 * @returns {number}
*/
function Randomize (max) {
  return Math.floor (Math.random () * (max)) + 1;
}


/**
 * Produces a random sequence of numbers of a specified length; should use
 * jsPsych's version of this function instead:
 * jsPsych.randomization.randomID(length)
 * @function
 * @deprecated
 * @param {number} length - The length of the random sequence to generate
 * @returns {string}
*/
function RandomSequence (length) {
  var rando = Randomize(9);
  for (var i = 1; i < length; i++)
    rando += (Randomize(10) - 1) * Math.pow(10, i);
  
  var rando_str = rando.toString();
  
  while (rando_str.length < length) {
    rando_str = "0" + rando_str; }
  return rando_str;
}

/**
 * Returns user's operating system info
 * @function
 * @returns {string}
*/
function getOS() {
  var userAgent = window.navigator.userAgent,
      platform = window.navigator.platform,
      macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
      windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
      iosPlatforms = ['iPhone', 'iPad', 'iPod'],
      os = null;

  if (macosPlatforms.indexOf(platform) !== -1) {
    os = 'Mac OS';
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    os = 'iOS';
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    os = 'Windows';
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (!os && /Linux/.test(platform)) {
    os = 'Linux';
  }

  return os;
}
